const { join } = require("path");

const cfg = {
    /** Set to true to enable debug logging to the console */
    debugEnabled: true,
    /** Path to the error log file (JSON) */
    errLogPath: join(__dirname, "errors.json"),
    /** Default port of the websocket connection */
    defaultClientPort: 6942,
    /** I need to run the server behind a nginx reverse proxy so this is necessary */
    defaultServerPort: 6941,
};

module.exports = Object.freeze(cfg);
