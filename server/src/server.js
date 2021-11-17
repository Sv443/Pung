const { WebSocketServer } = require("ws");
const { randomUUID } = require("crypto");

const cfg = require("./config");


/** @typedef {import("http").IncomingMessage} IncomingMessage */
/** @typedef {import("ws").WebSocket} WebSocket */

/** @typedef {import("../../lib/types/actions").Action} Action */


/** @type {WebSocketServer} */
let server;

/**
 * Initializes the websocket server
 * @param {import("yargs").Argv<*>} args
 * @returns {Promise<void, (Error|string)>}
 */
function init(args)
{
    return new Promise(async (res, rej) => {
        try
        {
            server = new WebSocketServer({
                port: args.port ?? cfg.defaultPort,
            });

            server.on("connection", clientConnect);

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
    console.log(`Client connected`);
    console.log("\nsock", sock);
    console.log("\nreq", req);

    sock.on("message", (data, isBin) => {
        /** @type {Action} */
        const parsed = JSON.parse(data.toString());

        if(parsed.type === "handshake")
        {
            /** @type {Action} */
            const ackHs = {
                type: "ackHandshake",
                actor: "server",
                data: {
                    finalUsername: parsed.data.username,
                    sessionID: randomUUID(),
                },
                timestamp: Date.now(),
            };

            sock.send(JSON.stringify(ackHs));
        }

        console.log("\n\n\nclient message:", parsed);
    });

    sock.on("close", (code, reason) => {
        console.log("\n\n\nconnection closed, code:", code);
        console.log(reason);
    });
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