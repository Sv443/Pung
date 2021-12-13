const { EventEmitter } = require("events");


/** @typedef {import("../types/actions").Actor} Actor */
/** @typedef {import("../types/game").Player} Player */
/** @typedef {import("../types/game").Position} Position */
/** @typedef {import("../types/game").Direction} Direction */
/** @typedef {import("../types/game").GameFieldSettings} GameFieldSettings */
/** @typedef {import("../types/game").GameUpdate} GameUpdate */


class GameField extends EventEmitter {
    /**
     * @param {Actor} actor
     * @param {Player[]} players
     * @param {GameFieldSettings}
     */
    constructor(actor, players, { outStream, winScore })
    {
        super({ captureRejections: true });

        /** @type {Actor} */
        this.actor = actor;
        /** @type {Player[]} */
        this.players = Array.isArray(players) ? players : [];

        /** @type {NodeJS.WriteStream} */
        this.outStream = outStream ?? process.stdout;
        /** @type {number} */
        this.winScore = typeof winScore === "number" ? winScore : 8;

        /** @type {Position} */
        this.ballPos = { x: -1, y: -1 };
        /** @type {Direction} */
        this.ballDir = "";

        /** @type {number} */
        this.currentRound = 1;

        /** @type {string[][]} */
        this.frame = [];
    }

    /**
     * Called when the server broadcasts an update to all clients
     * @param {GameUpdate} updateData
     */
    updateGame({ lobbyID, players, ball })
    {
        this.ballPos = ball.pos;
        this.ballDir = ball.dir;

        this.frame = [["a", "b"], ["c", "d"]];

        this.emit("frameReady", this.frame);
    }
}

module.exports = GameField;
