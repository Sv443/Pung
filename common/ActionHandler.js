const { EventEmitter } = require("events");

/** @typedef {import("./types/actions").Actor} Actor */


class ActionHandler extends EventEmitter {
    /**
     * 
     * @param {Actor} actor
     */
    constructor(actor)
    {
        super();

        this.actor = actor;
    }
}

module.exports = ActionHandler;