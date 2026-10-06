const { ImapFlow } = require("imapflow");
const { logger } = require("../services/logger");

let client = null;

function num(value, fallback) {

    const parsed = Number(value);

    return Number.isFinite(parsed) ? parsed : fallback;

}

async function connect() {

    if (client?.usable)
        return client;

    client = new ImapFlow({
        host: process.env.IMAP_HOST,
        port: num(process.env.IMAP_PORT, 993),
        secure: process.env.IMAP_SECURE === "true",

        auth: {
            user: process.env.EMAIL,
            pass: process.env.PASSWORD
        },

        connectTimeout: num(process.env.IMAP_CONNECT_TIMEOUT, 90000),
        greetingTimeout: num(process.env.IMAP_GREETING_TIMEOUT, 16000),
        socketTimeout: num(process.env.IMAP_SOCKET_TIMEOUT, 300000),

        logger: false,

        emitLogs: true
    });

    client.on("log", entry => {

        if (!entry?.msg)
            return;

        const payload = {
            msg: entry.msg,
            cid: entry.cid
        };

        if (entry.err)
            payload.err = entry.err.stack || entry.err.message || entry.err;

        logger.debug(`[IMAP:${entry.cid}] ${entry.msg}`, payload);

    });

    client.on("error", err => {
        logger.error(`[IMAP] ${err?.message || err}`, { stack: err?.stack });
    });

    client.on("close", () => {
        logger.warn("[IMAP] Connection closed");
    });

    await client.connect();

    await client.mailboxOpen("INBOX");

    logger.info("Connected to Gmail");

    return client;

}

function getClient() {
    return client;
}

function isUsable() {
    return Boolean(client?.usable);
}

function closeClient() {

    if (!client)
        return;

    try {
        client.close();
    } catch {}

}

async function disconnect() {

    if (!client)
        return;

    const current = client;

    client = null;

    try {
        await current.logout();
    } catch {}

}

module.exports = {
    connect,
    disconnect,
    closeClient,
    getClient,
    isUsable
};