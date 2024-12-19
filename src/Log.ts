import { createReadStream, createWriteStream, existsSync, mkdirSync, readdirSync, unlinkSync, writeFileSync, mkdir } from 'fs';
import { createGzip } from "zlib";
import config from "./Config";

const format = {
    Reset: "\x1b[0m",
    Bright: "\x1b[1m",
    Dim: "\x1b[2m",
    Underscore: "\x1b[4m",
    Blink: "\x1b[5m",
    Reverse: "\x1b[7m",
    Hidden: "\x1b[8m",

    FgBlack: "\x1b[30m",
    FgRed: "\x1b[31m",
    FgGreen: "\x1b[32m",
    FgYellow: "\x1b[33m",
    FgBlue: "\x1b[34m",
    FgMagenta: "\x1b[35m",
    FgCyan: "\x1b[36m",
    FgWhite: "\x1b[37m",
    FgGray: "\x1b[90m",

    BgBlack: "\x1b[40m",
    BgRed: "\x1b[41m",
    BgGreen: "\x1b[42m",
    BgYellow: "\x1b[43m",
    BgBlue: "\x1b[44m",
    BgMagenta: "\x1b[45m",
    BgCyan: "\x1b[46m",
    BgWhite: "\x1b[47m",
    BgGray: "\x1b[100m",
};

const folderPath = "./logs";
const latestPath = `${folderPath}/latest.txt`;

export function debug(...args: any[]) {
    if (config.debug) {
        log("[DEBUG]  ", format.FgGray, ...args);
    }
}

export function info(...args: any[]) {
    log("[INFO]   ", format.FgWhite, ...args);
}

export function success(...args: any[]) {
    log("[SUCCESS]", format.FgGreen, ...args);
}

export function warn(...args: any[]) {
    log("[WARN]   ", format.FgYellow, ...args);
}

export function error(...args: any[]) {
    log("[ERROR]  ", format.FgRed, ...args);
}

function log(prefix: string, color = "", ...args: any[]) {
    let message = "";
    for (const arg of args) {
        if (typeof arg === "string") {
            message += arg;
        } else {
            message += JSON.stringify(arg);
        }
        message += " ";
    }
    message = message.trim();

    const localTime = new Date().toLocaleString("en-GB", { timeZone: "Europe/London" });
    const unformatted = `${localTime} ${prefix} ${message}`;

    console.log(color, unformatted, format.Reset);
    save(unformatted);
}

function save(message: string): void {
    writeFileSync(latestPath, `${message}\n`, { flag: "a" });
}

export async function setupLog(): Promise<void> {
    existsSync(folderPath) || mkdirSync(folderPath, { recursive: true });

    // Delete old logs
    if (config.keep_logs >= 0) {
        let files = readdirSync(folderPath)
            .filter((file) => file.endsWith(".gz"))
            .sort()
        if (config.keep_logs !== 0) {
            files = files.slice(0, -config.keep_logs);
        }
        await Promise.all(files.map(async (file) => unlinkSync(`${folderPath}/${file}`)));
    }

    // Compress the latest file if it exists
    if (existsSync(latestPath) && config.keep_logs !== 0) {
        const targetPath = `${folderPath}/${new Date().toISOString()}.txt.gz`.replace(/:/g, "-");

        return new Promise<void>((resolve, reject) => {
            createReadStream(latestPath)
                .pipe(createGzip() as any)
                .pipe(createWriteStream(targetPath))
                .on("finish", () => {
                    createWriteStream(latestPath).write("");
                    resolve();
                });
        });
    } else {
        writeFileSync(latestPath, "");
    }
}
