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

        /** @type {number} When the last action was dispatched */
        this.lastDispatch = -1;
        /** @type {number} When the last valid action was received */
        this.lastReceive = -1;
        /** @type {number} When the last message was received */
        this.lastMessageTimestamp = -1;

        // TODO: on interval, check lastDispatch, if > some amount of time, send a heartbeat request to the server
        // TODO: implement heartbeat system into server, to automatically clean up expired sessions

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
            this.lastMessageTimestamp = Date.now();
            try
            {
                /** @type {TransferAction} */
                const action = JSON.parse(chunk.toString());

                if(ActionHandler.isValidAction(action))
                {
                    this.lastReceive = Date.now();
                    this.emit("response", action);
                }
            }
            catch(err)
            {
                this.emit("error", err);
            }
        });

        this.sock.on("close", (code, reason) => {
            this.emit("close", code, reason);
        });

        this.sock.on("error", (sock, err) => {
            this.emit("error", err);
        });
    }

    /**
     * Dispatches an action
     * @param {Action} action
     */
    dispatch(action)
    {
        try
        {
            if(typeof action !== "object")
                throw new TypeError(`Action is not an object`);

            const { actor } = this;
            const { type, data } = action;

            if(typeof type !== "string")
                throw new TypeError(`Action type is invalid`);

            if(typeof data !== "object")
                throw new TypeError(`Action data is not a valid object`);

            const timestamp = Date.now();

            if(type === "pong")
                data.internalLatency = Math.max(-1, Date.now() - this.lastMessageTimestamp);

            /** @type {TransferAction} */
            const transferAct = { actor, type, data, timestamp };

            this.lastDispatch = timestamp;

            this.sock.send(JSON.stringify(transferAct));
        }
        catch(err)
        {
            this.emit("error", err);
        }
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
