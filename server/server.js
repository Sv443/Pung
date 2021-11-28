const { WebSocketServer } = require("ws");
const { unused, colors } = require("svcorelib");

const ActionHandler = require("../common/ActionHandler");
const Lobby = require("../common/Lobby");
const dbg = require("../common/dbg");
const sanitizeText = require("../common/sanitizeText");
const { generateSessID } = require("../common/sessionID");

const cfg = require("../config");

const col = colors.fg;
const { usernameValid } = sanitizeText;


/** @typedef {import("http").IncomingMessage} IncomingMessage */
/** @typedef {import("ws").WebSocket} WebSocket */

/** @typedef {import("../types/actions").Action} Action */
/** @typedef {import("../types/actions").ActionType} ActionType */
/** @typedef {import("../types/actions").TransferAction} TransferAction */
/** @typedef {import("../types/lobby").LobbySettings} LobbySettings */
/** @typedef {import("../types/lobby").LobbyUser} LobbyUser */


/** @type {WebSocketServer} */
let server;

/** @type {Lobby[]} */
let lobbies = [];


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
    unused(req);

    const hand = new ActionHandler("server", sock);

    sock.on("close", (code, reason) => {
        console.log("\n\nconnection closed, code:", code);
        console.log(reason);

        // TODO:
        sock.close();
    });

    hand.on("action", (action) => onClientAction(action, hand));

    hand.on("error", (err) => {
        console.log(`${col.red}Error in ActionHandler:${col.rst}\n${err.stack}`);
    });
}

/**
 * Executed when an action was received by the server from a client
 * @param {TransferAction} action
 * @param {ActionHandler} hand
 */
function onClientAction(action, hand)
{
    dbg("ClientAction", `Received action of type '${action.type}' from client, data: ${JSON.stringify(action.data)}`, "server");

    switch(action.type)
    {
    case "handshake":
        {
            const { data } = action;
            const { timestamp } = data;

            const finalUsername = sanitizeText(data.username);

            const sessionID = generateSessID();

            const serverTS = Date.now();
            const clientTS = new Date(timestamp).getTime();

            let errReason;

            if(Math.max(serverTS, clientTS) - Math.min(serverTS, clientTS) > cfg.maxTimestampDiff)
                errReason = `Server and client system times vary by more than ${cfg.maxTimestampDiff} milliseconds (including connection latency)`;
            
            if(!usernameValid(data.username))
                errReason = `Your username is invalid. It has to be between 3 and 20 characters in length and can only contain these special characters: _\\-./!?#*`;

            if(!errReason)
            {
                hand.dispatch({
                    type: "ackHandshake",
                    data: { finalUsername, sessionID },
                });
            }
            else
            {
                hand.dispatch({
                    type: "denyHandshake",
                    data: {
                        reason: errReason,
                        username: data.username,
                        timestamp: serverTS,
                    }
                });
            }
            break;
        }
    case "logoff":
    {
        const { data } = action;

        dbg("Logoff", `Client ${data.sessionID} is logging off`, "server");

        break;
    }
    case "ping":
    {
        const { data } = action;

        const serverTime = new Date().getTime();
        const serverTimeISO = new Date(serverTime).toISOString();
        const clientTime = new Date(data.time).getTime();

        hand.dispatch({
            type: "pong",
            data: {
                clientTime: data.time,
                serverTime: serverTimeISO,
                latency: Math.max(serverTime, clientTime) - Math.min(serverTime, clientTime),
            }
        });

        break;
    }
    case "createLobby":
        {
            const { data } = action;

            const { username, sessionID } = data;

            // TODO:

            const lobbyID = Lobby.generateLobbyID();

            const lobby = createLobby(lobbyID, username, sessionID);
            lobbies.push(lobby);

            hand.dispatch({
                type: "ackJoinLobby",
                data: {
                    isAdmin: lobby.isAdmin(sessionID),
                    lobbyID: lobby.lobbyID,
                    initialSettings: lobby.settings,
                },
            });

            break;
        }
    case "joinLobby":
        {
            const { data } = action;

            const { username, sessionID, lobbyID } = data;

            const lobby = lobbies.find(lobby => lobby.lobbyID === lobbyID);

            if(lobby)
            {
                lobby.addUser(username, sessionID, false);

                hand.dispatch({
                    type: "ackJoinLobby",
                    data: {
                        lobbyID,
                        initialSettings: lobby.settings,
                        isAdmin: false,
                    },
                });
            }
            else
            {
                hand.dispatch({
                    type: "lobbyNotFound",
                    data: { lobbyID },
                });
            }
            break;
        }
    case "changeLobbySettings":
        {
            const { data } = action;

            const lobby = lobbies.find(lobby => lobby.isAdmin(data.sessionID));

            if(!lobby)
                break;

            lobby.settings = data.settings;

            hand.dispatch({
                type: "broadcastLobbyUpdate",
                data: {
                    players: lobby.users,
                    settings: lobby.settings,
                },
            });

            break;
        }
    case "error":
        // TODO:
        console.log(action);
        break;
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
 * Creates a Lobby instance
 * @param {string} lobbyID 6-digit code of the lobby
 * @param {string} adminUsername Username of the lobby admin
 * @param {string} adminSesID Session ID of the lobby admin
 */
function createLobby(lobbyID, adminUsername, adminSesID)
{
    if(!Lobby.isValidLobbyID(lobbyID))
        throw new TypeError(`LobbyID is invalid`);

    /** @type {LobbyUser} */
    const adminUser = {
        username: adminUsername,
        sessionID: adminSesID,
        isAdmin: true,
    };

    return new Lobby(lobbyID, adminUser);
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
