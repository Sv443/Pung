const { EventEmitter } = require("events");

/** @typedef {import("./types/actions").Actor} Actor */


class ActionHandler extends EventEmitter {
    /**
     * 
     * @param {Actor} actor
     */
    constructor(actor)
    {
        this.actor = actor;
    }
}

module.exports = ActionHandler;