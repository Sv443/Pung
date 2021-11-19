const { colors } = require("svcorelib");

const cfg = require("../config");

const col = colors.fg;


/** @typedef {import("../types/actions").Actor} Actor */


/**
 * Logs a message to the console if enabled in the config
 * @param {string} section
 * @param {string} message
 * @param {Actor} [actor]
 * @param {"red"|"yellow"|"green"|"blue"} [color]
 */
function dbg(section, message, actor, color = "blue")
{
    if(!cfg.debugEnabled)
        return;

    if(typeof section !== "string" || section.length === 0)
        throw new TypeError(`Parameter 'section' is not of type string or is empty`);
    if(typeof message !== "string" || message.length === 0)
        throw new TypeError(`Parameter 'message' is not of type string or is empty`);

    let colCode;

    switch(color)
    {
    case "green":
        colCode = col.green;
        break;
    case "yellow":
        colCode = col.yellow;
        break;
    case "red":
        colCode = col.red;
        break;
    default:
    case "blue":
        colCode = col.blue;
        break;
    }

    process.stdout.write(`${colCode}[${actor ? `${actor}/` : ""}${col.rst}${section}${colCode}]: ${col.rst}${message}\n`);
}

module.exports = dbg;