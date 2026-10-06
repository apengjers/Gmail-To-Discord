const fs = require("fs");
const path = require("path");
const winston = require("winston");

const LOG_DIR = path.join(__dirname, "../../storage/logs");
const LOG_FILE = path.join(LOG_DIR, "bot.log");

if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
}

const consoleFormat = winston.format.printf(info => {
    return `${info.timestamp} ${info.level.toUpperCase()} ${info.message}`;
});

const fileFormat = winston.format.combine(
    winston.format.timestamp({
        format: () => new Date().toISOString()
    }),
    winston.format.json()
);

const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || "info",

    format: winston.format.combine(
        winston.format.timestamp({
            format: () => new Date().toLocaleString("id-ID")
        }),
        winston.format.errors({ stack: true })
    ),

    transports: [
        new winston.transports.Console({
            format: consoleFormat,
            silent: process.env.LOG_CONSOLE === "false"
        }),

        new winston.transports.File({
            filename: LOG_FILE,
            format: fileFormat,
            maxsize: 5 * 1024 * 1024,
            maxFiles: 3,
            tailable: true
        })
    ],

    exitOnError: false
});

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function withTimeout(promise, ms, label) {
    let timer;

    const timeout = new Promise((resolve, reject) => {

        timer = setTimeout(() => {
            reject(new Error(`${label || "Operation"} timeout after ${ms}ms`));
        }, ms);

    });

    return Promise.race([
        promise.finally(() => clearTimeout(timer)),
        timeout
    ]);
}

module.exports = {
    logger,
    LOG_FILE,
    sleep,
    withTimeout
};