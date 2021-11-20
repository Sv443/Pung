const dbg = require("../common/dbg");
const cfg = require("../config");


/** @typedef {import("../common/ActionHandler")} ActionHandler */
/** @typedef {import("../common/Lobby")} Lobby */
/** @typedef {import("../types/game").GameStartedData} GameStartedData */
/** @typedef {import("../types/actions").GameObj} GameObj */


/** @type {GameObj} */
let game = {};
/** @type {LobbyUser} */
let lobbyAdmin;


//#MARKER run game

/**
 * Starts a new game
 * @param {ActionHandler} hand
 * @param {string} sessionID
 * @param {string} lobbyID
 */
function startGame(hand, sessionID, lobbyID)
{
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

    hand.dispatch({
        type: "startGame",
        data: { lobbyID, sessionID },
    });
}

/**
 * Called when the server confirms the game started
 * @param {GameStartedData} data
 */
function gameStarted(data)
{
    const { lobbyID } = data;

    dbg("Game", `Server has indicated the lobby '${lobbyID}' has started a game`, "client", "yellow");
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
        `Player foo  - vs -  Player bar`,
        ``
    ];

    setTimeout(() => displayGame(), 1000 / cfg.frameRate);
}


module.exports = { startGame, gameStarted, updateGame, displayGame };
