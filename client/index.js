const prompt = require("prompts");
const { WebSocket } = require("ws");
const { colors, isEmpty, pause } = require("svcorelib");
const dotenv = require("dotenv");

const ActionHandler = require("../common/ActionHandler");
const dbg = require("../common/dbg");

const { startGame } = require("./game");

const cfg = require("../config");

const col = colors.fg;
const { exit } = process;


/** @typedef {import("../types/actions").TransferAction} TransferAction */
/** @typedef {import("../types/lobby").LobbySettings} LobbySettings */


/** @type {WebSocket} */
let sock;
/** @type {ActionHandler} */
let act;


const persistentData = {
    /** @type {string} */
    username: undefined,
    /** @type {string} */
    sessionID: undefined,
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
        const useVPS = false;

        const host = useVPS ? process.env.SERVER_HOSTNAME : "localhost";
        const port = useVPS ? cfg.defaultClientPort : cfg.defaultServerPort;
    
        sock = new WebSocket(`ws://${host}:${port}`);

        act = new ActionHandler("client", sock);

        act.on("response", (action) => incomingAction(action));

        act.on("error", (err) => {
            console.log(`${col.red}Error in ActionHandler:${col.rst}\n${err.stack}`);
        });

        clearConsole();

        const { username } = await promptUsername("Please enter your username for this session");

        act.dispatch({
            type: "handshake",
            data: { username },
        });
    }
    catch(err)
    {
        console.error("error", err);
    }
}

//#MARKER menus

async function mainMenu()
{
    if(sock.readyState === 3)
        return run();

    const { username, sessionID } = persistentData;

    clearConsole();
    console.log(`${col.blue}Pung - Main menu${col.rst}\n`);

    console.log("#DEBUG");
    console.log(`Username:  ${username}`);
    console.log(`SessionID: ${sessionID}\n\n`);

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
        const { username } = await promptUsername("Enter your new username");

        act.dispatch({
            type: "logoff",
            data: { sessionID },
        });

        act.dispatch({
            type: "handshake",
            data: { username },
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
 * @param {string} message
 * @returns {Promise<string>}
 */
function promptUsername(message)
{
    return new Promise(async (res) => {
        return res(await prompt({
            type: "text",
            message,
            validate: (v) => v.length > 2,
            name: "username",
        }));
    });
}

function resetLobbyData()
{
    persistentData.lobbyID = undefined;
    persistentData.lobbySettings = undefined;
    persistentData.isLobbyAdmin = false;
}

function formatLobbyID(lobbyID)
{
    return `${lobbyID.substr(0, 3)} ${lobbyID.substr(3, 3)}`;
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
        `Opponent: ${col.yellow}TODO${col.rst}`,
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
 * Clears the console
 */
function clearConsole()
{
    if(!cfg.debugEnabled)
        console.clear();
    else
        console.log("\n\n\n");
}

//#MARKER server communication

/**
 * Called whenever the server sends this client an action
 * @param {TransferAction} action
 */
async function incomingAction(action)
{
    const { type } = action;

    dbg("ServerAction", `Received action of type '${type}' from server, data: ${JSON.stringify(action.data)}`, "client");

    switch(type)
    {
    case "ackHandshake":
    {
        /** @type {TransferAction} */
        const { data } = action;

        persistentData.username = data.finalUsername;
        persistentData.sessionID = data.sessionID;

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

        displayLobby();
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
    default:

        break;
    }
}

run();
