const { randomUUID } = require("crypto");
const { needsSanit } = require("./sanitizeText");


/**
 * Generates a cryptographically strong random session ID according to [RFC 4122](https://www.rfc-editor.org/rfc/rfc4122.txt)
 * @returns {string}
 */
function generateSessID()
{
    const sessID = randomUUID({ disableEntropyCache: true });

    // session ID contains slurs, recursively regenerate a new one until it doesn't
    if(needsSanit(sessID))
        return generateSessID();
    else
        return sessID;
}

/**
 * Checks if a passed value is a valid session ID
 * @param {any} sessID
 * @returns {boolean}
 */
function isValidSessID(sessID)
{
    return (typeof sessID === "string" && sessID.match(/\b[0-9a-f]{8}\b-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-\b[0-9a-f]{12}\b/i));
}

module.exports = { generateSessID, isValidSessID };
