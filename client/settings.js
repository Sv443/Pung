const { filesystem } = require("svcorelib");
const { readFile, writeFile } = require("fs-extra");
const YAML = require("yaml");


/** @typedef {import("../types/settings").ClientSettings} ClientSettings */


const settingsPath = "./settings.yml";

/** @type {ClientSettings} */
let settings;

/** @type {ClientSettings} */
const defaultClientSettings = Object.freeze({
    serverHost: "localhost", // TODO: change this to "sv443.net" once that's running
});


function init()
{
    return new Promise(async (res, rej) => {
        try
        {
            if(!(await filesystem.exists(settingsPath)))
                await saveSettings(defaultClientSettings);

            await reloadSettings();

            return res();
        }
        catch(err)
        {
            return rej(err);
        }
    });
}

/**
 * Reads from the client settings file and saves it locally
 * @returns {Promise<ClientSettings, Error>}
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
 * @param {ClientSettings} settings
 * @param {boolean} [enableDefaults=true] Set to false to disable default values for the settings properties
 * @returns {Promise<void, Error>}
 */
function saveSettings(settings, enableDefaults = true)
{
    return new Promise(async (res, rej) => {
        try
        {
            if(enableDefaults !== false)
                settings = { ...defaultClientSettings, ...settings };

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
 * @param {boolean} [enableDefaults=true] Set to false to disable default values for the settings properties
 * @returns {ClientSettings}
 */
function getSettings(enableDefaults = true)
{
    if(enableDefaults !== false)
        return { ...defaultClientSettings, ...settings };
    else
        return settings;
}

module.exports = { init, getSettings, reloadSettings };
