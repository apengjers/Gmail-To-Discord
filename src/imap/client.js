const { ImapFlow } = require("imapflow");

let client = null;

async function connect() {

    if (client?.usable)
        return client;

    client = new ImapFlow({
        host: process.env.IMAP_HOST,
        port: Number(process.env.IMAP_PORT),
        secure: process.env.IMAP_SECURE === "true",

        auth: {
            user: process.env.EMAIL,
            pass: process.env.PASSWORD
        },

        logger: false
    });

    client.on("error", err => {
        console.error("[IMAP]", err.message);
    });

    client.on("close", () => {
        console.log("[IMAP] Connection closed");
    });

    await client.connect();

    await client.mailboxOpen("INBOX");

    console.log("✅ Connected to Gmail");

    return client;

}

function getClient() {
    return client;
}

async function disconnect() {

    if (!client)
        return;

    try {
        await client.logout();
    } catch {}

    client = null;

}

module.exports = {
    connect,
    disconnect,
    getClient
};