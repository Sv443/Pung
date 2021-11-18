const prompt = require("prompts");
const { WebSocket } = require("ws");
const { colors } = require("svcorelib");

const ActionHandler = require("../common/ActionHandler");

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


//#MARKER entrypoint

async function run()
{
    try
    {
        const host = "localhost";
        const port = 6942;
    
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
    console.clear();
    console.log(`Pung - Main menu\n`);

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

    const { username, sessionID } = persistentData;

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

//#MARKER server communication

/**
 * Called whenever the server sends this client an action
 * @param {TransferAction} action
 */
function incomingAction(action)
{
    const { type } = action;

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
        break;
    case "broadcastLobbySettings":
        persistentData.lobbySettings = action.data;
        break;
    case "broadcastGameUpdate":
        // TODO:
        break;
    }
}

run();
