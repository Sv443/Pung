const { EventEmitter } = require("events");
const { WebSocket } = require("ws");

const errors = require("./data/errors.json");


/** @typedef {import("../types/actions").Action} Action */
/** @typedef {import("../types/actions").TransferAction} TransferAction */
/** @typedef {import("../types/actions").Actor} Actor */
/** @typedef {import("../types/actions").ErrorAction} ErrorAction */
/** @typedef {import("../types/errors").ErrCodes} ErrCodes */


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

        /** If the connection is open */
        this.open = false;

        /** @type {number} When the last action was dispatched */
        this.lastDispatch = -1;
        /** @type {number} When the last valid action was received */
        this.lastReceive = -1;
        /** @type {number} When the last message was received */
        this.lastMessageTimestamp = -1;

        /** Connection timeout in ms */
        this.timeout = 5000;

        // TODO: on interval, check lastDispatch, if > some amount of time, send a heartbeat request to the server
        // TODO: implement heartbeat system into server, to automatically clean up expired sessions
        // TODO: on server, disconnect clients that have been connected for x amount of time

        this.hookEvents();
    }

    /**
     * Closes the socket connection and cleans up the ActionHandler.  
     * If the connection can't close, it is terminated by force.
     * @returns {Promise<void>}
     */
    close()
    {
        return new Promise(res => {
            this.open = false;

            const to = setTimeout(() => {
                this.sock.terminate();
                return res();
            }, this.timeout);

            this.sock.on("close", () => {
                clearTimeout(to);
                return res();
            });

            this.sock.close();
        });
    }

    hookEvents()
    {
        this.sock.on("message", (chunk) => {
            this.open = true;

            this.lastMessageTimestamp = Date.now();
            try
            {
                /** @type {TransferAction} */
                const action = JSON.parse(chunk.toString());

                if(ActionHandler.isValidAction(action))
                {
                    this.lastReceive = Date.now();
                    this.emit("action", action);
                }
                else
                    this.respondError(1007, "101", `The payload data you sent to this ${this.actor} is not a valid action (type or data properties are invalid / missing)`);
            }
            catch(err)
            {
                this.respondError(1007, "102", `The payload data you sent could not be parsed by this recipient ${this.actor}`);
            }
        });

        this.sock.on("open", () => {
            this.open = true;
        });

        this.sock.on("close", (code, reason) => {
            this.open = false;
            this.emit("close", code, reason);
        });

        this.sock.on("error", (err) => {
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
            if(!this.open)
                return;

            if(typeof action !== "object")
                throw new TypeError(`Action is not an object`);

            const { actor } = this;
            const { type, data } = action;

            if(typeof type !== "string")
                throw new TypeError(`Action type is invalid`);

            if(typeof data !== "object")
                throw new TypeError(`Action data is not a valid object`);

            const error = false;

            const timestamp = Date.now();

            if(type === "pong")
                data.internalLatency = Math.max(-1, Date.now() - this.lastMessageTimestamp);

            /** @type {TransferAction} */
            const transferAct = { error, type, actor, data, timestamp };

            this.lastDispatch = timestamp;

            this.sock.send(JSON.stringify(transferAct));
        }
        catch(err)
        {
            this.emit("error", err);
        }
    }

    /**
     * Responds with an error
     * @param {1007|1011|-1} closeCode 1007 for "Unsupported payload", 1011 for "Server error", -1 to not exit - see [this for a list of codes](https://github.com/Luka967/websocket-close-codes)
     * @param {ErrCodes} errCode Common error code (in file 'common/data/errors.json')
     * @param {string} [message]
     */
    respondError(closeCode, errCode, message)
    {
        if(!this.open)
            return;

        if(typeof message !== "string" || message.length === 0)
            message = null;

        closeCode = parseInt(closeCode);

        if(!isNaN(closeCode) && closeCode >= 0)
            closeCode = undefined;

        /** @type {ErrorAction} */
        const response = {
            type: "error",
            error: true,
            name: errors?.[errCode]?.name ?? "Unknown Error",
            code: parseInt(errCode),
            message,
        };

        this.sock.send(JSON.stringify(response), (err) => {
            // exit connection if the client is unhappy with keeping the connection alive after receiving the error
            // also exit connection if the closeCode is set to a valid number
            if(err || closeCode !== undefined)
                this.sock.close(closeCode);
        });
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

        if(action.type !== "error" && (typeof action.data !== "object" || Object.keys(action.data).length === 0))
            return false;

        return true;
    }
}

module.exports = ActionHandler;
