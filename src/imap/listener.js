const queue = require("./queue");
const { logger } = require("../services/logger");

async function startListener(client) {

    logger.info("Initial sync...");

    await queue.sync();

    client.on("exists", async () => {

        logger.info("New mail detected");

        try {

            await queue.sync();

        } catch (err) {

            logger.error("Listener sync failed", { stack: err?.stack });

        }

    });

    logger.info("Listener started");

}

module.exports = startListener;