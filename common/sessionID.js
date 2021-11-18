const { randomUUID } = require("crypto");


/**
 * Generates a cryptographically strong random session ID according to [RFC 4122](https://www.rfc-editor.org/rfc/rfc4122.txt)
 * @returns {string}
 */
function generateSessID()
{
    return randomUUID({ disableEntropyCache: true });
}

/**
 * Checks if a passed value is a valid session ID
 * @param {any} sessID
 * @returns {boolean}
 */
function isValidSessID(sessID)
{
    return (typeof sessID === "string" && sessID.match(/^(\d|[a-fA-F]){8}-(\d|[a-fA-F]){4}-(\d|[a-fA-F]){4}-(\d|[a-fA-F]){4}-(\d|[a-fA-F]){12}$/));
}

module.exports = { generateSessID, isValidSessID };
