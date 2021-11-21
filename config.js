const { join } = require("path");

const cfg = {
    /** Target FPS of the game */
    frameRate: 10,
    /** Set to true to enable debug logging to the console */
    debugEnabled: true,
    /** Path to the error log file (JSON) */
    errLogPath: join(__dirname, "error-log.json"),
    /** Default port of the websocket connection */
    defaultClientPort: 6942,
    /** I need to run the server behind a nginx reverse proxy so this is necessary */
    defaultServerPort: 6941,
    /** Maximum difference allowed between server and client system time, in milliseconds */
    maxTimestampDiff: 60000,
    /** Status page URL */
    statusURL: "https://status.sv443.net",
    /** Regex that a valid username should match */
    usernameRegex: /^[a-zA-Z0-9_\-./!?#*]$/,
};

module.exports = Object.freeze(cfg);
