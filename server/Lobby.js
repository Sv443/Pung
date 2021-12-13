const { mapRange } = require("svcorelib");
const { randomBytes } = require("crypto");

const { needsSanit } = require("../common/sanitizeText");
const { isValidSessID } = require("../common/sessionID");


/** @typedef {import("../types/lobby").LobbySettings} LobbySettings */
/** @typedef {import("../types/lobby").LobbyUser} LobbyUser */


class Lobby {
    /**
     * Contains info about a lobby
     * @param {string} lobbyID
     * @param {LobbyUser} lobbyAdmin
     * @param {LobbySettings} [settings]
     */
    constructor(lobbyID, lobbyAdmin, settings)
    {
        if(typeof settings !== "object")
            settings = {};

        if(!Lobby.isValidLobbyID(lobbyID))
            throw new TypeError(`Invalid lobby ID`);

        const defaultSettings = Lobby.getDefaultSettings();

        /** @type {LobbySettings} */
        this.settings = { ...defaultSettings, ...settings };

        this.lobbyID = lobbyID;

        /** @type {LobbyUser[]} */
        this.users = [ lobbyAdmin ];
    }

    /**
     * Adds a user to the lobby
     * @param {string} username
     * @param {string} sessionID
     * @param {boolean} [isAdmin=false]
     */
    addUser(username, sessionID, isAdmin = false)
    {
        if(typeof username !== "string" || username.length < 3)
            throw new TypeError(`Can't add user with username '${username}', it is too short or of the wrong type`);

        if(!isValidSessID(sessionID))
            throw new TypeError(`Can't add user with sessionID '${sessionID}' as it is invalid`);

        if(typeof isAdmin !== "boolean")
            isAdmin = false;

        this.users.push({ username, sessionID, isAdmin });
    }

    /**
     * Checks if a sessionID is an admin in this lobby
     * @param {string} sessionID
     * @returns {boolean}
     */
    isAdmin(sessionID)
    {
        return this.users.find(usr => usr.isAdmin && usr.sessionID === sessionID) ? true : false;
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

        const finalCode = idChars.join("");

        // lobby code contains slurs, recursively regenerate a new one until it doesn't
        if(needsSanit(finalCode))
            return Lobby.generateLobbyID();

        return finalCode;
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

    /**
     * Checks if a value is a valid lobby ID
     * @param {any} lobbyID
     * @returns {boolean}
     */
    static isValidLobbyID(lobbyID)
    {
        return (typeof lobbyID === "string" && lobbyID.match(/^\w{6}$/));
    }
}

module.exports = Lobby;
