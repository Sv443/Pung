#!/usr/bin/env node

const { WebSocket } = require("ws");


/** @typedef {import("../common/types/actions").HandshakeAction} HandshakeAction */


async function run()
{
    try
    {
        const host = "localhost";
        const port = 6942;
        const sock = new WebSocket(`ws://${host}:${port}`);

        sock.on("open", () => {
            console.log("\nopened connection");

            /** @type {HandshakeAction} */
            const hsAct = {
                type: "handshake",
                actor: "client",
                data: {
                    username: "Sv443",
                },
                timestamp: Date.now(),
            };

            sock.send(JSON.stringify(hsAct));
        });

        sock.on("close", (code, reason) => {
            console.log("\nconnection closed, code:", code);
            console.log(reason);
        });

        sock.on("message", (data, isBin) => {
            /** @type {Action} */
            const parsed = JSON.parse(data.toString());

            console.log("\nserver message:", parsed);
        });
    }
    catch(err)
    {
        console.error("error", err);
    }
}

run();
