const { EventEmitter } = require("events");


/** @typedef {import("../types/actions").Actor} Actor */
/** @typedef {import("../types/game").Player} Player */
/** @typedef {import("../types/game").Position} Position */
/** @typedef {import("../types/game").Direction} Direction */


class GameField extends EventEmitter {
    /**
     * @param {Actor} actor
     * @param {Player[]} players
     * @param {number} winScore
     */
    constructor(actor, players, winScore)
    {
        super({ captureRejections: true });

        /** @type {Actor} */
        this.actor = actor;

        /** @type {Player[]} */
        this.players = Array.isArray(players) ? players : [];

        /** @type {Position} */
        this.ballPos = { x: -1, y: -1 };

        /** @type {Direction} */
        this.ballDir = "";

        /** @type {number} */
        this.winScore = typeof winScore === "number" ? winScore : 8;

        /** @type {number} */
        this.currentRound = 1;
    }
}

module.exports = GameField;
