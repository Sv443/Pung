import { words } from "./data/filter.json";

import cfg from "../config";

/**
 * Replaces bad words in text with the set replacement
 * @param text
 * @param replacement Defaults to "***"
 */
export default function sanitizeText(
    text: string,
    replacement: string = "***"
): string {
    if (typeof text !== "string")
        throw new TypeError(
            `Can't sanitize value of type ${typeof text}, expected string instead`
        );

    if (typeof replacement !== "string") replacement = "***";

    words.forEach((word) => {
        const badWord = new RegExp(word.toLowerCase(), "gi");
        if (text.match(badWord)) text = text.replace(badWord, replacement);
    });

    return text;
}

/**
 * Checks if a username is valid
 * @param username
 */
export function usernameValid(username: string): boolean {
    if (!username.match(cfg.usernameRegex)) return false;

    return true;
}

/**
 * Checks if some text needs sanitization
 */
export function needsSanit(text: string): boolean {
    let needsSanit = false;

    words.forEach((word) => {
        if (text.match(new RegExp(word.toLowerCase(), "gi"))) needsSanit = true;
    });

    return needsSanit;
}
