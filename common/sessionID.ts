import { randomUUID } from "crypto";
import { needsSanit } from "./sanitizeText";

/**
 * Generates a cryptographically strong random session ID according to [RFC 4122](https://www.rfc-editor.org/rfc/rfc4122.txt)
 * @returns {string}
 */
export function generateSessID(): string {
    const sessID = randomUUID({ disableEntropyCache: true });

    // session ID contains slurs, recursively regenerate a new one until it doesn't
    if (needsSanit(sessID)) return generateSessID();
    else return sessID;
}

/**
 * Checks if a passed value is a valid session ID
 */
export function isValidSessID(sessID: any): boolean {
    return (
        typeof sessID === "string" &&
        sessID.match(
            /\b[0-9a-f]{8}\b-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-\b[0-9a-f]{12}\b/i
        ) !== null
    );
}
