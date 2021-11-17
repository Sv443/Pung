#!/usr/bin/env node

const { colors, filesystem, unused } = require("svcorelib");
const { writeFile, readFile } = require("fs-extra");
const yargs = require("yargs");

const packageJson = require("../package.json");
const cfg = require("./config");

const server = require("./server");

const { exit } = process;
const col = colors.fg;


const args = prepareCLI();


//#MARKER init

async function run()
{
    console.log(`Pung-Server v${packageJson.version}`);

    try
    {
        await init();

        await server.init(args);

        console.log(`Ready.`);
    }
    catch(err)
    {
        await logError(err);

        exit(1);
    }
}

function init()
{
    return new Promise(async (res, rej) => {
        try
        {
            return res();
        }
        catch(err) {
            return rej(err);
        }
    });
}

/**
 * Logs an error to the console and to a log file
 * @param {Error|string} err
 * @param {string} [action]
 * @param {boolean} [fatal=true] Set to false to not exit the process with code 1
 */
async function logError(err, action, fatal = true)
{
    if(typeof action !== "string")
        action = undefined;

    console.error(`${col.red}Internal Error${action ? ` while ${action}` : ""}:${col.rst}\n${err instanceof Error ? err.stack : err}`);

    if(!(await filesystem.exists(cfg.errLogPath)))
        await writeFile(cfg.errLogPath, "[]");

    const getCont = () => new Promise(async res => {
        try
        {
            const contRaw = (await readFile(cfg.errLogPath)).toString();
            return res(JSON.parse(contRaw));
        }
        catch(e)
        {
            unused(e);
            return res([]);
        }
    });

    const cont = await getCont();

    const stack = err instanceof Error ? err.stack.split("\n") : null;

    cont.push({
        name: err.name ?? null,
        message:err.message ?? err.toString(),
        fatal,
        time: new Date().toLocaleString(),
        stack,
    });

    await writeFile(cfg.errLogPath, JSON.stringify(cont, undefined, 4));

    fatal !== false && exit(1);
}

/**
 * Prepares the CLI so it can show help
 */
function prepareCLI()
{
    yargs.scriptName("pung-server")
        .usage("Usage: $0 [arguments]")
        .version(`Pung-Server v${packageJson.version} by ${packageJson.author.name}`)
            .alias("v", "version")
        .help()
            .alias("h", "help");

    yargs.options({
        "port": {
            desc: "Overrides the websocket port",
            alias: "p",
            type: "number",
            default: 6942,
        }
    });

    yargs.wrap(Math.min(100, process.stdout.columns));

    return yargs.argv;
}


run();