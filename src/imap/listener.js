const queue = require("./queue");

async function startListener(client) {

    console.log("📨 Initial sync...");

    await queue.sync();

    client.on("exists", async () => {

        console.log("[LISTENER] New mail detected");

        try {

            await queue.sync();

        } catch (err) {

            console.error("[LISTENER]", err);

        }

    });

    console.log("📨 Listener started");

}

module.exports = startListener;