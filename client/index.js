const prompt = require("prompts");
const { WebSocket } = require("ws");
const { colors } = require("svcorelib");
const dotenv = require("dotenv");

const ActionHandler = require("../common/ActionHandler");
const dbg = require("../common/dbg");

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


        const { username } = await prompt({
            type: "text",
            message: "Please enter your username for this session",
            validate: (v) => v.length > 2,
            name: "username",
        });


        act.dispatch({
            type: "handshake",
            data: { username },
        });

        // so the process doesn't exit cause nothing is in the event queue
        // setInterval(() => {}, 3600000);
    }
    catch(err)
    {
        console.error("error", err);
    }
}

//#MARKER menus

async function mainMenu()
{
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
        act.dispatch({
            type: "joinLobby",
            data: {
                // TODO:
            },
        });

        break;
    case "exit":
        act.close();

        return exit(0);
    }
}

/**
 * Displays the lobby
 */
async function displayLobby()
{
    // TODO:
    // if(both_players_ready)
    //     return playGame();

    const lines = [
        `${col.blue}Pung - Lobby${col.rst}`,
        ``,
        `Join Code:     ${persistentData.lobbyID}`,
        `#DEBUG SessID: ${persistentData.sessionID}`,
        ``,
        `Player 1:  ${col.green}${persistentData.username}${col.rst}`,
        `Player 2:  ${col.yellow}TODO${col.rst}`,
        ``,
    ];

    clearConsole();

    process.stdout.write(`${lines.join("\n")}\n`);

    setTimeout(displayLobby, 3000);
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
function incomingAction(action)
{
    const { type } = action;

    dbg("ServerAction", `Received action of type '${type}' from server, data: ${JSON.stringify(action.data)}`, "client");

    switch(type)
    {
    case "ackHandshake":
        persistentData.username = action.data.finalUsername;
        persistentData.sessionID = action.data.sessionID;

        mainMenu();
        break;
    case "ackJoinLobby":
        persistentData.lobbyID = action.data.lobbyID;
        persistentData.lobbySettings = action.data.initialSettings;

        displayLobby();
        break;
    case "broadcastLobbySettings":
        persistentData.lobbySettings = action.data;
        break;
    case "broadcastGameUpdate":
        // TODO:
        break;
    default:

        break;
    }
}

run();
