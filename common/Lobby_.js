const { mapRange } = require("svcorelib");
const { randomBytes } = require("crypto");


function generateLobbyID()
{
    const rb = randomBytes(6);

    const lobbyCodeChars = "0123456789ABCDEFGHJKLMNPQRTUVWXYZ";
    const chars = lobbyCodeChars.split("");

    const idChars = [];

    for(let i = 0; i < rb.length; i++)
    {
        const charIdx = mapRange(parseInt(rb[i]), 0, 255, 0, chars.length - 1);

        idChars.push(chars[charIdx]);
    }

    return idChars.join("");
}

module.exports = { generateLobbyID };
