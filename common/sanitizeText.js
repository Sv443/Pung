const { words } = require("./data/filter.json");


/**
 * Replaces bad words in text with the set replacement
 * @param {string} text
 * @param {string} [replacement]
 * @returns {string}
 */
function sanitizeText(text, replacement)
{
    if(typeof replacement !== "string")
        replacement = "-";

    words.forEach(word => {
        text = text.replace(new RegExp(`/${word}/`, "g"), replacement);
    });

    return text;
}

module.exports = sanitizeText;
