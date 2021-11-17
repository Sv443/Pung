const { EventEmitter } = require("events");
const { WebSocket } = require("ws");

/** @typedef {import("../types/actions").Action} Action */
/** @typedef {import("../types/actions").TransferAction} TransferAction */
/** @typedef {import("../types/actions").Actor} Actor */


class ActionHandler extends EventEmitter {
    /**
     * Handles communication between server and clients
     * @param {Actor} actor
     * @param {WebSocket} sock
     */
    constructor(actor, sock)
    {
        super({ captureRejections: true });

        if(![ "server", "client" ].includes(actor))
            throw new TypeError(`Can't create ActionHandler, actor '${actor}' is invalid`);

        if(!(sock instanceof WebSocket))
            throw new TypeError(`Can't create ActionHandler, socket is not an instance of WebSocket`);

        /** @type {Actor} */
        this.actor = actor;
        /** @type {WebSocket} */
        this.sock = sock;

        this.hookEvents();
    }

    hookEvents()
    {
        this.sock.on("message", (chunk) => {
            // TODO: validate message body structure

            /** @type {TransferAction} */
            const action = JSON.parse(chunk.toString());

            this.emit("response", action);
        });

        this.sock.on("close", (code, reason) => {
            this.emit("close", code, reason);
        });
    }

    /**
     * Dispatches an action
     * @param {Action} action
     */
    dispatch(action)
    {
        const { actor } = this;
        const { type, data } = action;

        /** @type {TransferAction} */
        const transferAct = { actor, type, data, timestamp: Date.now() };

        this.sock.send(JSON.stringify(transferAct));
    }
}

module.exports = ActionHandler;