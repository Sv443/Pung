// packages
const prompt = require("prompts");
const { WebSocket } = require("ws");
const { colors, isEmpty, pause, mapRange } = require("svcorelib");
const { randomBytes } = require("crypto");
const dotenv = require("dotenv");

// common
const ActionHandler = require("../common/ActionHandler");
const dbg = require("../common/dbg");
const settings = require("../common/settings");
const { usernameValid } = require("../common/sanitizeText");

// client
const { startGame } = require("./game");

// other
const cfg = require("../config");
const { fork } = require("child_process");
const { join } = require("path");

const col = colors.fg;
const { exit } = process;


/** @typedef {import("child_process").ChildProcess} ChildProcess */
/** @typedef {import("../types/actions").TransferAction} TransferAction */
/** @typedef {import("../types/actions").AckHandshake} AckHandshake */
/** @typedef {import("../types/lobby").LobbySettings} LobbySettings */
/** @typedef {import("../types/game").Player} Player */


/** @type {WebSocket} */
let sock;
/** @type {ActionHandler} */
let act;
/** @type {ChildProcess} Undefined if no internal server is hosted, else set to a ChildProcess instance (all inter-process communication is done through websocket) */
let internalServer;


const persistentData = {
    /** @type {string} */
    username: undefined,
    /** @type {string} */
    sessionID: undefined,
    /** @type {number} */
    nonce: undefined,
    /** @type {string} */
    lobbyID: undefined,
    /** @type {LobbySettings} */
    lobbySettings: undefined,
    isLobbyAdmin: false,
    lobbyInGame: false,
};

dotenv.config();


//#MARKER entrypoint

async function run()
{
    try
    {
        /** #DEBUG */
        const internal_server = true;
        // const internal_server = false;

        const clientSettings = await settings.init();
        
        const useDefaultServer = typeof clientSettings.serverHost !== "string";
        
        const defaultServer = "localhost"; // TODO: replace with "sv443.net" once that part is working
        
        const host = useDefaultServer ? defaultServer : clientSettings.serverHost;
        const port = useDefaultServer ? cfg.defaultServerPort : clientSettings.serverPort;

        if(internal_server)
            await spawnInternalServer();

        sock = new WebSocket(`ws://${host}:${port}`);

    
        act = new ActionHandler("client", sock);

        act.on("action", (action) => incomingAction(action));

        act.on("error", async (err) => {
            /** Call to close the connection */
            const closeConn = async () => {
                await act.close();

                setTimeout(() => exit(1), 15000);

                await pause("Press any key to exit (or wait 15s)…");

                exit(1);
            };

            if(err?.code === "ECONNREFUSED")
            {
                console.log(`\n\n${col.red}Can't connect to server at '${host}:${port}'${col.rst}\n`);
                console.log(`To check the status of the default server, visit ${cfg.statusURL}`);
                console.log(`If this issue persists, please delete the client settings file at '${settings.settingsPath}' to restore your settings to the defaults and try again\n`);

                return closeConn();
            }
            else
            {
                console.log(`${col.red}Socket error in ActionHandler:${col.rst}`);
                console.log(err instanceof Error ? err.stack : err ? err.toString() : "(Unknown Error)");

                return closeConn();
            }
        });
    

        clearConsole();

        const username = await promptUsername();

        const timestamp = new Date().toISOString();


        // TODO: handshake separately, whenever a lobby is joined or created
        act.dispatch({
            type: "handshake",
            data: { username, timestamp },
        });
    }
    catch(err)
    {
        console.error(`\n${col.red}Client error:${col.rst}\n${err instanceof Error ? err.stack : err.toString()}\n`);

        setTimeout(() => exit(1), 20000);

        await pause("Press any key to exit (or wait 20s)…");

        exit(1);
    }
}

function spawnInternalServer()
{
    return new Promise(async (res) => {
        internalServer = fork("./index.js", {
            env: process.env,
            stdio: "inherit",
            cwd: join(process.cwd(), "server"),
        });

        internalServer.on("spawn", () => {
            console.log("Internal server started");
            setTimeout(() => res(), 1000); // artificial timeout - TODO:FIXME: ping server until it is up or something
        });

        internalServer.on("message", (msg, handle) => {
            console.log("Internal server message:", msg, "\nhandle:", handle);
        });

        internalServer.on("error", (err) => {
            console.log("Internal server error:", err);
        });

        internalServer.on("disconnect", () => {
            console.log("Internal server disconnected");
        });

        internalServer.on("exit", (code, sig) => {
            console.log("Internal server exited - code:", code, "- signal:", sig);
        });

        internalServer.on("close", (code, sig) => {
            console.log("Internal server closed - code:", code, "- signal:", sig);
        });
    });
}

//#MARKER menus

async function mainMenu()
{
    if(sock.readyState === 3)
        return run();

    const { username, sessionID, nonce } = persistentData;

    clearConsole();
    console.log(`${col.blue}Pung - Main menu${col.rst}\n`);

    console.log(`${col.yellow}#DEBUG${col.rst}`);
    console.log(`Username:       ${username}`);
    console.log(`SessionID:      ${sessionID}`);
    console.log(`RNG seed nonce: ${nonce}\n\n`);

    const { option } = await prompt({
        type: "select",
        message: "Select an option",
        choices: [
            {
                title: "Create a lobby",
                value: "createLobby",
            },
            {
                title: "Join a lobby",
                value: "joinLobby",
            },
            {
                title: `Change username (${persistentData.username})`,
                value: "username",
            },
            {
                title: "#DEBUG Ping",
                value: "ping",
            },
            {
                title: `${col.red}Exit${col.rst}`,
                value: "exit",
            },
        ],
        name: "option",
    });

    switch(option)
    {
    case "createLobby":
        act.dispatch({
            type: "createLobby",
            data: { username, sessionID },
        });

        break;
    case "joinLobby":
    {
        clearConsole();

        const { lobbyID } = await prompt({
            type: "text",
            message: "Enter six letter lobby code",
            initial: "ABC XYZ",
            name: "lobbyID",
            validate: (val) => val.trim().toUpperCase().match(/^(\w{6}|\w{3}\s+\w{3})$/),
        });

        act.dispatch({
            type: "joinLobby",
            data: {
                username,
                sessionID,
                lobbyID: lobbyID.replace(/\s/g, "").toUpperCase(),
            },
        });

        break;
    }
    case "username":
    {
        const username = await promptUsername();

        const timestamp = new Date().toISOString();

        act.dispatch({
            type: "logoff",
            data: { sessionID, timestamp },
        });

        act.dispatch({
            type: "handshake",
            data: { username, timestamp },
        });

        break;
    }
    case "ping":
        act.dispatch({
            type: "ping",
            data: {
                time: new Date().toISOString(),
            }
        });
    
        break;
    case "exit":
        act.dispatch({
            type: "logoff",
            data: { sessionID },
        });

        act.close();

        return exit(0);
    }
}

/**
 * Prompts for a username
 * @returns {Promise<string>}
 */
function promptUsername()
{
    return new Promise(async (res) => {
        const askUsername = () => new Promise(async (resUsr) => {
            const { usr } = await prompt({
                type: "text",
                message: "Enter your desired username",
                validate: (v) => v.length >= 3 && v.length <= 20,
                name: "usr",
            });

            if(!usernameValid(usr))
            {
                console.log(`Your username is invalid. It has to be between 3 and 20 characters in length and can only contain these special characters: _\\-./!?#*\n`);

                const { tryAgain } = await prompt({
                    type: "confirm",
                    name: "tryAgain",
                    message: "Try again?",
                    initial: true,
                });

                if(tryAgain)
                {
                    clearConsole();
                    return resUsr(await askUsername());
                }
                else
                    exit(0);
            }
            else
                return resUsr(usr);
        });

        const { choice } = await prompt({
            type: "select",
            message: "Choose your username",
            name: "choice",
            choices: [
                {
                    title: "Enter your username",
                    value: "enter",
                    selected: true,
                },
                {
                    title: "Anonymous user",
                    value: "random",
                }
            ]
        });

        switch(choice)
        {
            case "enter":
                return res(await askUsername());
            case "random":
                return res(randomUsername());
        }
    });
}

/**
 * Generates a random username
 * @returns {string}
 */
function randomUsername()
{
    const buf = randomBytes(5);
    const randIds = buf.map(byte => Math.round(mapRange(byte, 0, 255, 0, 9)));

    return `Player${randIds.join("")}`;
}

/**
 * Displays the lobby
 */
async function displayLobby()
{
    if(sock.readyState === 3)
    {
        resetLobbyData();
        return mainMenu();
    }

    // TODO:
    if(persistentData.lobbyInGame)
        return startGame(act, persistentData.sessionID, persistentData.lobbyID);

    const truncUser = (username, maxSpace) => {
        // TODO:
        const spacesAmt = username.length - 10;

        let spaces = "";
        for(let i = 0; i < spacesAmt; i++)
            spaces += " ";

        return `${username}${spaces}`;
    };

    const lines = [
        `#DEBUG SessID: ${persistentData.sessionID}`,
        ``,
        `┌────────────────────┬──────────────────────────┐`,
        `│    ${col.blue}Pung - Lobby${col.rst}    │    Join Code: ${col.green}${formatLobbyID(persistentData.lobbyID)}${col.rst}    │`,
        `├────────────────────┴───┬──────────────────────┘`,
        `│ You: ${col.green}${truncUser(persistentData.username, 16)}${col.rst} ${persistentData.isLobbyAdmin ? `${col.cyan} ♦${col.rst}` : "  "} │ ${col.yellow}${truncUser("TODO", 21)}${col.rst} ${persistentData.isLobbyAdmin ? "  " : `${col.cyan} ♦${col.rst}`} │`,
        ``,
        ``,
        `Settings:`,
        `   • Score to win: ${persistentData.lobbySettings.winScore}`,
        `   • Difficulty:   ${persistentData.lobbySettings.difficulty}`,
        ``,
        `You:      ${col.green}${persistentData.username}${col.rst}${persistentData.isLobbyAdmin ? ` ${col.cyan}(Admin)${col.rst}` : ""}`,
        `Opponent: ${col.yellow}TODO:${col.rst}`,
        ``,
    ];


    let keyEvent;

    const getKey = (text) => new Promise(async (res, rej) => {
        if(typeof text === "string")
            text = isEmpty(text) ? null : `${text.trimRight()} `;

        try
        {
            const onKey = (ch, key) => {
                if(key && key.ctrl && ["c", "d"].includes(key.name))
                    process.exit(0);

                process.stdin.pause();
                process.stdin.removeListener("keypress", onKey);

                process.stdin.setRawMode(false);

                text && process.stdout.write("\n");

                return res({
                    name: key.name || ch || "",
                    ctrl: key.ctrl || false,
                    meta: key.meta || false,
                    shift: key.shift || false,
                    sequence: key.sequence || undefined,
                    code: key.code || undefined,
                });
            };

            keyEvent = onKey;
            
            process.stdin.setRawMode(true);
            process.stdin.on("keypress", onKey);

            text && process.stdout.write(text);
        
            process.stdin.resume();
        }
        catch(err)
        {
            return rej(new Error(`Error while getting key: ${err}`));
        }
    });

    const timeout = setTimeout(() => {
        keyEvent && process.stdin.removeListener("keypress", keyEvent);

        return displayLobby();
    }, 1000);


    // TODO:
    const isAdmin = true;

    lines.push(`${col.blue}Choose what to do:${col.rst} ${isAdmin ? `${col.yellow}[E]${col.rst}dit lobby settings • ` : ""}E${col.red}[x]${col.rst}it lobby `);


    clearConsole();

    process.stdout.write(`${lines.join("\n")}`);


    const key = await getKey();

    let validKey = true;

    switch(key.name)
    {
    case "e": // Edit settings
        process.stdout.write("\n");
        editLobbySettings();
        break;
    case "x": // Exit lobby
        process.stdout.write("\n");
        leaveLobby();
        break;
    default:
        validKey = false;
        break;
    }

    if(validKey)
        clearTimeout(timeout);
}

/**
 * Prompts to edit the lobby settings
 */
async function editLobbySettings()
{
    const settings = persistentData.lobbySettings;

    const choices = [
        {
            title: `Score to win (${settings.winScore})`,
            value: "score",
        },
        {
            title: `Difficulty (${settings.difficulty})`,
            value: "difficulty",
        },
    ];

    const { editSetting } = await prompt({
        message: "Edit setting",
        type: "select",
        name: "editSetting",
        hint: "- Use arrow-keys. Return to select. Esc or Ctrl+C to submit.",
        choices,
    });

    switch(editSetting)
    {
    case "score":
        settings.winScore = (await prompt({
            type: "number",
            name: "winScore",
            message: "Enter a new score required to win a round (1-20)",
            limit: 20,
            validate: n => n > 0 && n <= 20,
            initial: settings.winScore,
        })).winScore;
        break;
    case "difficulty":
    {
        const diffChoices = [
            {
                title: "Easy",
                value: "easy",
            },
            {
                title: "Medium",
                value: "medium",
            },
            {
                title: "Hard",
                value: "hard",
            },
        ];

        settings.difficulty = (await prompt({
            type: "select",
            name: "difficulty",
            message: "Select the game's difficulty",
            choices: diffChoices,
        })).difficulty;
        break;
    }
    }

    act.dispatch({
        type: "changeLobbySettings",
        data: {
            sessionID: persistentData.sessionID,
            settings
        },
    });

    return displayLobby();
}

/**
 * Prompts to leave the lobby
 */
async function leaveLobby()
{
    const { confirm } = await prompt({
        type: "confirm",
        message: "Are you sure you want to leave the lobby?",
        initial: false,
    });

    if(confirm)
    {
        resetLobbyData();

        return mainMenu();
    }
    else
        return displayLobby();
}

/**
 * Clears the console if debug mode is disabled, else inserts some blank lines and an indicator
 */
function clearConsole()
{
    if(!cfg.debugEnabled)
        console.clear();
    else
        console.log("\n\n<clear>\n\n");
}

//#MARKER UI dependencies

/**
 * Resets all persistent lobby data
 */
function resetLobbyData()
{
    persistentData.lobbyID = undefined;
    persistentData.lobbySettings = undefined;
    persistentData.isLobbyAdmin = false;
}

/**
 * Formats a shorthand form of the lobby ID to include a space in the middle for easier reading
 * @param {string} lobbyID
 * @returns {string}
 */
function formatLobbyID(lobbyID)
{
    return `${lobbyID.substr(0, 3)} ${lobbyID.substr(3, 3)}`;
}

//#MARKER server communication

/**
 * Called whenever the server sends this client an action
 * @param {TransferAction} action
 */
async function incomingAction(action)
{
    const { type } = action;

    dbg("IncomingAction", `Received action of type '${type}' from server, data: ${JSON.stringify(action.data)}`, "client");

    switch(type)
    {
    case "ackHandshake":
    {
        /** @type {AckHandshake} */
        const { data } = action;

        persistentData.username = data.finalUsername;
        persistentData.sessionID = data.sessionID;
        persistentData.nonce = data.nonce;

        mainMenu();
        break;
    }
    case "pong":
    {
        /** @type {TransferAction} */
        const { data } = action;

        console.log(`\n${col.green}Pong:${col.rst} Connection latency = ${col.green}${data.latency}ms${col.rst} • Server internal latency = ${col.green}${data.internalLatency}ms${col.rst}\n`);

        await pause("Press any key to return…");

        mainMenu();
        break;
    }
    case "ackJoinLobby":
    {
        /** @type {TransferAction} */
        const { data } = action;

        persistentData.lobbyID = data.lobbyID;
        persistentData.lobbySettings = data.initialSettings;
        persistentData.isLobbyAdmin = data.isAdmin;

        await displayLobby();
        break;
    }
    case "ackRemovedFromLobby":
    {
        /** @type {TransferAction} */
        const { data } = action;

        console.log("\nremoved from lobby. reason:", data.reason);

        persistentData.isLobbyAdmin = undefined;
        persistentData.lobbyID = undefined;
        persistentData.lobbyInGame = undefined;
        persistentData.lobbySettings = undefined;

        break;
    }
    case "lobbyNotFound":
    {
        /** @type {TransferAction} */
        const { data } = action;

        console.log(`\nCouldn't find lobby with ID ${col.yellow}${formatLobbyID(data.lobbyID)}${col.rst}\n`);

        await pause("Press any key to return…");

        mainMenu();

        break;
    }
    case "broadcastLobbyUpdate":
    {
        /** @type {TransferAction} */
        const { data } = action;

        persistentData.lobbySettings = data.settings;
        persistentData.lobbyPlayers = data.players;
        break;
    }
    case "broadcastGameStarted":
    {
        /** @type {TransferAction} */
        const { data } = action;

        persistentData.lobbyInGame = true;

        break;
    }
    case "broadcastGameUpdate":
    {
        /** @type {TransferAction} */
        const { data } = action;

        // TODO:
        break;
    }
    case "error":
        // TODO:
        console.log("Got error from server:", action);
        break;
    default:

        break;
    }
}


run();
