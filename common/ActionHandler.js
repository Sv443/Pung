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

    /**
     * Closes the socket connection and cleans up the ActionHandler
     */
    close()
    {
        this.sock.close();
    }

    hookEvents()
    {
        this.sock.on("message", (chunk) => {
            try
            {
                /** @type {TransferAction} */
                const action = JSON.parse(chunk.toString());

                if(ActionHandler.isValidAction(action))
                    this.emit("response", action);
            }
            catch(err)
            {
                // TODO:
            }
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

    /**
     * Checks if the provided value is a valid action
     * @static
     * @param {any} action
     * @returns {boolean}
     */
    static isValidAction(action)
    {
        if(typeof action !== "object")
            return false;

        if(typeof action.type !== "string")
            return false;

        if(typeof action.data !== "object" || Object.keys(action.data).length === 0)
            return false;

        return true;
    }
}

module.exports = ActionHandler;
