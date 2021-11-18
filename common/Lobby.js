const { mapRange } = require("svcorelib");
const { randomBytes } = require("crypto");


/** @typedef {import("../types/lobby").LobbySettings} LobbySettings */
/** @typedef {import("../types/lobby").LobbyUser} LobbyUser */


class Lobby {
    /**
     * Contains info about a lobby
     * @param {LobbySettings} [settings]
     */
    constructor(settings)
    {
        if(typeof settings !== "object")
            settings = {};

        const defaultSettings = Lobby.getDefaultSettings();

        /** @type {LobbySettings} */
        this.settings = { ...defaultSettings, ...settings };

        /** @type {LobbyUser[]} */
        this.users = [];
    }

    /**
     * Adds a user to the lobby
     * @param {string} sessionID
     * @param {boolean} [isAdmin=false]
     */
    addUser(sessionID, isAdmin = false)
    {
        if(typeof sessionID !== "string" || sessionID.length < 1)
            throw new TypeError(`Can't add user with sessionID '${sessionID}'`);

        if(typeof isAdmin !== "boolean")
            isAdmin = false;

        this.users.push({ sessionID, isAdmin });
    }

    /**
     * Generates a random six character lobby ID using cryptographically strong generators to ensure maximum security
     * @returns {string}
     */
    static generateLobbyID()
    {
        const rb = randomBytes(6);

        const lobbyCodeChars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
        const chars = lobbyCodeChars.split("");

        const idChars = [];

        for(let i = 0; i < rb.length; i++)
        {
            const charIdx = Math.floor(mapRange(parseInt(rb[i]), 0, 255, 0, chars.length - 1));

            idChars.push(chars[charIdx]);
        }

        return idChars.join("");
    }

    /**
     * Returns the default lobby settings
     * @returns {LobbySettings}
     */
    static getDefaultSettings()
    {
        return {
            winScore: 8,
            difficulty: "medium",
        };
    }
}

module.exports = Lobby;
