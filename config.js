const { join } = require("path");

const cfg = {
    /** Set to true to enable debug logging to the console */
    debugEnabled: true,
    /** Path to the error log file (JSON) */
    errLogPath: join(__dirname, "errors.json"),
    /** Default port of the websocket connection */
    defaultPort: 6942,
};

module.exports = Object.freeze(cfg);
