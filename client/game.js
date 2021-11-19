const cfg = require("../config");


/** @typedef {import("../common/Lobby")} Lobby */
/** @typedef {import("../types/actions").GameObj} GameObj */


/** @type {GameObj} */
let game = {};
/** @type {Lobby} */
let lobby;
/** @type {string} */
let sessID;


//#MARKER run game

/**
 * Starts a new game
 * @param {string} sessionID
 * @param {Lobby} gameLobby
 */
function startGame(sessionID, gameLobby)
{
    sessID = sessionID;

    lobby = gameLobby;

    //#DEBUG
    game = {
        ball: {
            x: -1,
            y: -1,
        },
        game: {
            size: {
                h: process.stdout.rows - 5,
                w: process.stdout.columns - 10,
            },
        },
        players: [
            {
                username: "Sv443",
                sessionID: "7ccdf243-ece1-41ba-a495-d455431d1411",
                isAdmin: true,
                score: 69,
                y: Math.round((process.stdout.rows - 5) / 2),
            },
        ],
    };
}

/**
 * Called to update the current game state
 * @param {GameObj} gameObj
 */
function updateGame(gameObj)
{
    game = gameObj;
}

//#MARKER display game

function displayGame()
{
    const lines = [
        ``
    ];

    setTimeout(() => displayGame(), 1000 / cfg.frameRate);
}


module.exports = { startGame, updateGame, displayGame };
