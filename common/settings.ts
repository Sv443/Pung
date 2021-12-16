import { filesystem } from "svcorelib";
import { readFile, writeFile } from "fs-extra";
import YAML from "yaml";

import cfg from "../config";
import { Settings } from "../types/settings";

/** @typedef {import("../types/actions").Actor} Actor */
/** @typedef {import("../types/settings").ClientSettings} ClientSettings */
/** @typedef {import("../types/settings").ServerSettings} ServerSettings */

export const settingsPath = "./settings.yml";

const defaultSettings: Readonly<Settings> = Object.freeze({
    client: {
        serverHost: "localhost",
        serverPort: cfg.defaultClientPort,
    },
    proxyServer: {
        host: "pung.sv443.net", // TODO: get this proxy server running sometime in the future
        port: cfg.defaultClientPort,
    },
});

/**
 * Initializes the user settings module
 * @returns {Promise<Settings, Error>}
 */
export function init() {
    return new Promise(async (res, rej) => {
        try {
            if (!(await filesystem.exists(settingsPath)))
                await saveSettings(defaultSettings);

            const settings = await reloadSettings();

            return res(settings);
        } catch (err) {
            return rej(err);
        }
    });
}

/**
 * Reads from the client settings file and saves it locally
 * @returns {Promise<Settings, Error>}
 */
export function reloadSettings() {
    return new Promise(async (res, rej) => {
        try {
            const raw = (await readFile(settingsPath)).toString();
            const parsed = YAML.parse(raw);

            settings = parsed;

            return res(parsed);
        } catch (err) {
            return rej(err);
        }
    });
}

/**
 * Saves the JSON client settings to the client settings file as YAML
 * @param settings
 * @param Set to false to disable default values for the settings properties
 * @returns
 */
function saveSettings(settings: Settings, enableDefaults = true) {
    return new Promise<void>(async (res, rej) => {
        try {
            if (enableDefaults !== false)
                settings = { ...defaultSettings, ...settings };

            await writeFile(settingsPath, YAML.stringify(settings));

            return res();
        } catch (err) {
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
export function getSettings(actor, enableDefaults = true) {
    /** @param {Settings} sett */
    const getSett = (sett) => (actor ? sett[actor] : sett);

    if (enableDefaults !== false)
        return getSett({ ...defaultSettings, ...settings });
    else return getSett(settings);
}
