const { join } = require("path");

const cfg = {
    errLogPath: join(__dirname, "errors.json"),
    defaultPort: 6942,
};

module.exports = Object.freeze(cfg);
