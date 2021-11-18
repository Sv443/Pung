const { WebSocketServer } = require("ws");
const { randomUUID } = require("crypto");

const ActionHandler = require("../common/ActionHandler");
const Lobby = require("../common/Lobby");
const dbg = require("../common/dbg");

const cfg = require("../config");


/** @typedef {import("http").IncomingMessage} IncomingMessage */
/** @typedef {import("ws").WebSocket} WebSocket */

/** @typedef {import("../types/actions").Action} Action */
/** @typedef {import("../types/actions").ActionType} ActionType */
/** @typedef {import("../types/actions").TransferAction} TransferAction */
/** @typedef {import("../types/lobby").LobbySettings} LobbySettings */


/** @type {WebSocketServer} */
let server;


/**
 * Initializes the websocket server
 * @param {number} port
 * @returns {Promise<void, (Error|string)>}
 */
function init(port = cfg.defaultServerPort)
{
    return new Promise(async (res, rej) => {
        try
        {
            port = parseInt(port);

            if(isNaN(port) || port < 1)
                throw new TypeError(`Can't create websocket server with port '${port}'`);

            server = new WebSocketServer({ port });

            server.on("connection", clientConnect);
            server.on("close", connectionClose);
            server.on("error", connectionError);

            return res();
        }
        catch(err)
        {
            return rej(err);
        }
    });
}

/**
 * Called when a client connects
 * @param {WebSocket} sock
 * @param {IncomingMessage} req
 */
function clientConnect(sock, req)
{
    const hand = new ActionHandler("server", sock);

    sock.on("close", (code, reason) => {
        console.log("\n\nconnection closed, code:", code);
        console.log(reason);

        // TODO:
        sock.close();
    });

    hand.on("response", (action) => onClientAction(action, hand));
}

/**
 * TODO: implement correctly
 * @param {string} username
 */
const sanitizeUsername = (username) => username;

/**
 * Executed when an action was received by the server from a client
 * @param {TransferAction} action
 * @param {ActionHandler} hand
 */
function onClientAction(action, hand)
{
    const { type } = action;

    dbg("ClientAction", `Received action of type ${type} from client, data: ${JSON.stringify(action.data)}`, "server");

    switch(type)
    {
    case "handshake":
        {
            const { data } = action;
            const finalUsername = sanitizeUsername(data.username);

            const sessionID = randomUUID({ disableEntropyCache: true });

            hand.dispatch({
                type: "ackHandshake",
                data: { finalUsername, sessionID },
            });
            break;
        }
    case "createLobby":
        {
            const { data } = action;

            // TODO:

            const lobbyID = Lobby.generateLobbyID();

            // registerLobby(lobbyID, data.username, data.sessionID);

            const initialSettings = Lobby.getDefaultSettings();

            hand.dispatch({
                type: "ackJoinLobby",
                data: { lobbyID, initialSettings },
            });

            break;
        }
    case "joinLobby":
        {
            const { data } = action;

            // TODO:
            // const { lobbyID, initialSettings } = lookupLobby(data.lobbyID);

            // hand.dispatch({
            //     type: "ackJoinLobby",
            //     data: { lobbyID, initialSettings },
            // });

            break;
        }
    case "changeLobbySettings":
        {
            const { data } = action;

            // TODO:
            // isLobbyHost(data.sessionID);
            // validateLobbySettings(data.settings);

            const newSettings = data.settings;

            hand.dispatch({
                type: "broadcastLobbySettings",
                data: newSettings,
            });

            break;
        }
    default:
        respondError();
        break;
    }
}

function connectionClose(...a)
{
    console.log("------ CLOSE", a);
    // TODO:
}

function connectionError(...a)
{
    console.log("------ ERR", a);
    // TODO:
}

function respondError()
{
    console.log();
    // TODO:
}

/**
 * Stops the server
 * @returns {Promise<void, (Error|string)>}
 */
function stop()
{
    return new Promise(async (res, rej) => {
        try
        {
            if(server instanceof WebSocketServer)
            {
                server.close(err => {
                    if(err)
                        return rej(err);
                    return res();
                });
            }
        }
        catch(err)
        {
            return rej(err);
        }
    });
}


module.exports = { init, stop };