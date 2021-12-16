import { filesystem } from "svcorelib";
import { readFile, writeFile } from "fs-extra";
import YAML from "yaml";

import cfg from "../config";
import {
    ClientSettings,
    ProxyServerSettings,
    Settings,
} from "../types/settings";
import { Actor } from "../types/actions";

/** @typedef {import("../types/actions").Actor} Actor */
/** @typedef {import("../types/settings").ClientSettings} ClientSettings */
/** @typedef {import("../types/settings").ServerSettings} ServerSettings */

export const settingsPath = "./settings.yml";

const defaultSettings: Readonly<Settings> = Object.freeze({
    client: {
        serverHost: "localhost",
        serverPort: cfg.defaultClientPort,
    },
    server: {
        host: "pung.sv443.net", // TODO: get this proxy server running sometime in the future
        port: cfg.defaultClientPort,
    },
});

export let settings: Settings = defaultSettings;

/**
 * Initializes the user settings module
 * @returns {Promise<Settings, Error>}
 */
export function init() {
    return new Promise<Settings>(async (res, rej) => {
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
 */
export function reloadSettings() {
    return new Promise<Settings>(async (res, rej) => {
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
 * @param sett
 * @param Set to false to disable default values for the settings properties
 * @returns
 */
function saveSettings(sett: Settings, enableDefaults = true) {
    return new Promise<void>(async (res, rej) => {
        try {
            if (enableDefaults !== false)
                settings = { ...defaultSettings, ...sett };

            await writeFile(settingsPath, YAML.stringify(settings));

            return res();
        } catch (err) {
            return rej(err);
        }
    });
}

/**
 * Returns the current client settings object
 * @param actor Leave undefined to return both actors' settings
 * @param enableDefaults Set to false to disable default values for the settings properties
 */
export function getSettings(
    actor: Actor,
    enableDefaults = true
): Settings | (ClientSettings | ProxyServerSettings) {
    const getSett = (sett: Settings) => (actor ? sett[actor] : sett);

    if (enableDefaults !== false)
        return getSett({ ...defaultSettings, ...settings });
    else return getSett(settings);
}
