require("dotenv").config();

const { connect, disconnect } = require("./imap/client");
const startListener = require("./imap/listener");

async function start() {

    while (true) {

        try {

            const client = await connect();

            await startListener(client);

            console.log("🚀 Bot is running");

            await new Promise(resolve => {

                client.once("close", resolve);

            });

        } catch (err) {

            console.error("[SYSTEM]", err);

        }

        console.log("[SYSTEM] Reconnecting in 5 seconds...");

        await disconnect();

        await new Promise(resolve => setTimeout(resolve, 5000));

    }

}

start();