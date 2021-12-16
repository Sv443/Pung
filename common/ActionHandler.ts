import { EventEmitter } from "events";
import { WebSocket } from "ws";

import { Action, Actor, TransferAction } from "../types/actions";
import { ErrCode } from "../types/errors";

import errors from "./data/errors.json";

/** @typedef {import("../types/actions").Action} Action */
/** @typedef {import("../types/actions").TransferAction} TransferAction */
/** @typedef {import("../types/actions").Actor} Actor */
/** @typedef {import("../types/actions").ErrorAction} ErrorAction */

/** Websocket close codes - 1007 for "Unsupported payload", 1011 for "Server error", -1 to not exit - see [this for a list of codes](https://github.com/Luka967/websocket-close-codes) */
export type CloseCode = 1007 | 1011 | -1;

export default class ActionHandler extends EventEmitter {
    /** The actor identifier of this ActionHandler */
    protected actor: Actor;
    /** Socket connection to the other actor */
    protected sock: WebSocket;

    /** If the connection is open */
    protected open = false;

    /** When the last action was dispatched */
    private lastDispatch = -1;
    /** When the last valid action was received */
    private lastReceive = -1;
    /** When the last message was received */
    private lastMessageTimestamp = -1;

    /** Connection timeout in ms */
    private timeout = 5000;

    /**
     * Handles communication between server and clients
     */
    constructor(actor: Actor, sock: WebSocket) {
        super({ captureRejections: true });

        if (!["server", "client"].includes(actor))
            throw new TypeError(
                `Can't create ActionHandler, actor '${actor}' is invalid`
            );

        if (!(sock instanceof WebSocket))
            throw new TypeError(
                `Can't create ActionHandler, socket is not an instance of WebSocket`
            );

        this.actor = actor;
        this.sock = sock;

        this.open = false;

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
    close() {
        return new Promise<void>((res) => {
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

    /**
     * Hook all events
     */
    hookEvents() {
        this.sock.on("message", (chunk) => {
            this.open = true;

            this.lastMessageTimestamp = Date.now();
            try {
                /** @type {TransferAction} */
                const action = JSON.parse(chunk.toString());

                if (ActionHandler.isValidAction(action)) {
                    this.lastReceive = Date.now();
                    this.emit("action", action);
                } else
                    this.respondError(
                        1007,
                        "101",
                        `The payload data you sent to this ${this.actor} is not a valid action (type or data properties are invalid / missing)`
                    );
            } catch (err) {
                this.respondError(
                    1007,
                    "102",
                    `The payload data you sent could not be parsed by this recipient ${
                        this.actor
                    }:\n${err as string}`
                );
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
     */
    dispatch(action: Action) {
        try {
            if (!this.open) return;

            if (typeof action !== "object")
                throw new TypeError(`Action is not an object`);

            const { actor } = this;

            if (action.type === "error")
                return this.emit(
                    "error",
                    new Error(
                        `Received error in response to action '${action.responseTo}': ${action.code} - ${action.message}`
                    )
                );

            if (typeof action.type !== "string")
                throw new TypeError(`Action type is invalid`);

            if (typeof action.data !== "object")
                throw new TypeError(`Action data is not a valid object`);

            const error = false;

            const timestamp = Date.now();

            if (action.type === "pong")
                action.data.internalLatency = Math.max(
                    -1,
                    Date.now() - this.lastMessageTimestamp
                );

            const transferAct: TransferAction = {
                error,
                type: action.type,
                actor,
                data: action.data,
                timestamp,
            };

            this.lastDispatch = timestamp;

            this.sock.send(JSON.stringify(transferAct));
        } catch (err) {
            this.emit("error", err);
        }
    }

    /**
     * Responds with an error
     * @param closeCode 1007 for "Unsupported payload", 1011 for "Server error", -1 to not exit - see [this for a list of codes](https://github.com/Luka967/websocket-close-codes)
     * @param errCode Common error code (in file 'common/data/errors.json')
     */
    respondError(
        closeCode: CloseCode | undefined,
        errCode: ErrCode,
        message: string | null
    ) {
        if (!this.open) return;

        if (typeof message !== "string" || message.length === 0) message = null;

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
            if (err || closeCode !== undefined || closeCode !== -1)
                this.sock.close(closeCode);
        });
    }

    /**
     * Checks if the provided value is a valid action
     */
    static isValidAction(action: any): boolean {
        if (typeof action !== "object") return false;

        if (typeof action.type !== "string") return false;

        if (
            action.type !== "error" &&
            (typeof action.data !== "object" ||
                Object.keys(action.data).length === 0)
        )
            return false;

        return true;
    }
}
