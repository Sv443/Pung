const { filesystem } = require("svcorelib");
const { readFile, writeFile } = require("fs-extra");
const YAML = require("yaml");

const cfg = require("../config");


/** @typedef {import("../types/actions").Actor} Actor */
/** @typedef {import("../types/settings").ClientSettings} ClientSettings */
/** @typedef {import("../types/settings").ServerSettings} ServerSettings */
/** @typedef {import("../types/settings").Settings} Settings */


const settingsPath = "./settings.yml";

/** @type {Settings} */
let settings;

/** @type {Settings} */
const defaultSettings = Object.freeze({
    client: {
        serverHost: "localhost", // TODO: change this to "sv443.net" once that's running
        serverPort: cfg.defaultClientPort, // TODO: change this too maybe?
    },
    server: {

    },
});


/**
 * Initializes the user settings module
 * @returns {Promise<Settings, Error>}
 */
function init()
{
    return new Promise(async (res, rej) => {
        try
        {
            if(!(await filesystem.exists(settingsPath)))
                await saveSettings(defaultSettings);

            const settings = await reloadSettings();

            return res(settings);
        }
        catch(err)
        {
            return rej(err);
        }
    });
}

/**
 * Reads from the client settings file and saves it locally
 * @returns {Promise<Settings, Error>}
 */
function reloadSettings()
{
    return new Promise(async (res, rej) => {
        try
        {
            const raw = (await readFile(settingsPath)).toString();
            const parsed = YAML.parse(raw);

            settings = parsed;

            return res(parsed);
        }
        catch(err)
        {
            return rej(err);
        }
    });
}

/**
 * Saves the JSON client settings to the client settings file as YAML
 * @param {Settings} settings
 * @param {boolean} [enableDefaults=true] Set to false to disable default values for the settings properties
 * @returns {Promise<void, Error>}
 */
function saveSettings(settings, enableDefaults = true)
{
    return new Promise(async (res, rej) => {
        try
        {
            if(enableDefaults !== false)
                settings = { ...defaultSettings, ...settings };

            await writeFile(settingsPath, YAML.stringify(settings));

            return res();
        }
        catch(err)
        {
            return rej(err);
        }
    });
}

/**
 * Returns the current client settings object
 * @param {Actor} [actor] Leave undefined to return both actors' settings
 * @param {boolean} [enableDefaults=true] Set to false to disable default values for the settings properties
 * @returns {Settings|(ClientSettings|ServerSettings)}
 */
function getSettings(actor, enableDefaults = true)
{
    /** @param {Settings} sett */
    const getSett = sett => actor ? sett[actor] : sett;

    if(enableDefaults !== false)
        return getSett({ ...defaultSettings, ...settings });
    else
        return getSett(settings);
}

module.exports = { init, getSettings, reloadSettings, settingsPath };
