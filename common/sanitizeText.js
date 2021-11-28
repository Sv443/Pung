const { words } = require("./data/filter.json");

const cfg = require("../config");


/**
 * Replaces bad words in text with the set replacement
 * @param {string} text
 * @param {string} [replacement] Defaults to "***"
 * @returns {string}
 */
function sanitizeText(text, replacement)
{
    if(typeof text !== "string")
        throw new TypeError(`Can't sanitize value of type ${typeof text}, expected string instead`);

    if(typeof replacement !== "string")
        replacement = "***";

    words.forEach(word => {
        const badWord = new RegExp(word.toLowerCase(), "gi");
        if(text.match(badWord))
            text = text.replace(badWord, replacement);
    });

    return text;
}

/**
 * Checks if a username is valid
 * @param {string} username
 * @returns {boolean}
 */
function usernameValid(username)
{
    if(typeof username !== "string")
        return false;

    if(!username.match(cfg.usernameRegex))
        return false;

    return true;
}

/**
 * Checks if some text needs sanitization
 * @param {string} text
 * @returns {boolean}
 */
function needsSanit(text)
{
    let needsSanit = false;

    words.forEach(word => {
        if(text.match(new RegExp(word.toLowerCase(), "gi")))
            needsSanit = true;
    });

    return needsSanit;
}

module.exports = sanitizeText;
module.exports.needsSanit = needsSanit;
module.exports.usernameValid = usernameValid;
