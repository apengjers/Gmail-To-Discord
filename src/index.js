require("dotenv").config();

const { connect, disconnect, closeClient, getClient } = require("./imap/client");
const startListener = require("./imap/listener");
const queue = require("./imap/queue");

const { logger, sleep, withTimeout } = require("./services/logger");

const BASE_DELAY = Number(process.env.RECONNECT_BASE_DELAY || 5000);
const MAX_DELAY = Number(process.env.RECONNECT_MAX_DELAY || 300000);
const WATCHDOG_INTERVAL = Number(
    process.env.WATCHDOG_INTERVAL || 5 * 60 * 1000
);
const WATCHDOG_TIMEOUT = Number(
    process.env.WATCHDOG_TIMEOUT || 30000
);

let watchdog = null;
let shuttingDown = false;

function startWatchdog() {

    clearInterval(watchdog);

    watchdog = setInterval(async () => {

        const client = getClient();

        if (!client || !client.usable)
            return;

        try {

            await withTimeout(
                client.noop(),
                WATCHDOG_TIMEOUT,
                "Watchdog NOOP"
            );

            logger.debug("Watchdog heartbeat OK");

        } catch (err) {

            logger.error(
                `Watchdog heartbeat failed: ${err.message}. Forcing reconnect.`,
                { stack: err?.stack }
            );

            closeClient();

        }

    }, WATCHDOG_INTERVAL);

    watchdog.unref?.();

}

function stopWatchdog() {

    clearInterval(watchdog);

    watchdog = null;

}

async function waitForClose(client) {

    return new Promise(resolve => {

        client.once("close", () => {

            logger.warn("Connection closed, reconnecting...");

            resolve();

        });

    });

}

async function shutdown(signal) {

    if (shuttingDown)
        return;

    shuttingDown = true;

    logger.info(`Received ${signal}, shutting down...`);

    stopWatchdog();

    await disconnect();

    logger.info("Shutdown complete");

    process.exit(0);

}

function installCrashHandlers() {

    process.on("uncaughtException", err => {

        logger.error("Uncaught exception", { stack: err?.stack });

        disconnect()
            .catch(() => {})
            .finally(() => process.exit(1));

    });

    process.on("unhandledRejection", reason => {

        logger.error("Unhandled rejection", {
            stack: reason?.stack || String(reason)
        });

        disconnect()
            .catch(() => {})
            .finally(() => process.exit(1));

    });

    process.on("SIGINT", () => shutdown("SIGINT"));
    process.on("SIGTERM", () => shutdown("SIGTERM"));

}

async function start() {

    installCrashHandlers();

    let delay = BASE_DELAY;

    while (!shuttingDown) {

        let client = null;

        try {

            client = await connect();

            const closed = waitForClose(client);

            await startListener(client);

            if (!client.usable)
                throw new Error("Connection dropped during startup");

            logger.info("Bot is running");

            startWatchdog();

            await closed;

            delay = BASE_DELAY;

        } catch (err) {

            logger.error(`Connection error: ${err.message}`, {
                stack: err?.stack
            });

        }

        stopWatchdog();

        queue.reset();

        await disconnect();

        logger.info(`Reconnecting in ${Math.round(delay / 1000)}s...`);

        await sleep(delay);

        delay = Math.min(delay * 2, MAX_DELAY);

    }

}

start().catch(err => {

    logger.error("Fatal error", { stack: err?.stack });

    process.exit(1);

});