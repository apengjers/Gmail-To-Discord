const axios = require("axios");

function sleep(ms) {

    return new Promise(resolve => setTimeout(resolve, ms));

}

async function sendWebhook(url, payload) {

    if (!url)
        throw new Error("Webhook URL is empty.");

    while (true) {

        try {

            console.log("[WEBHOOK] Sending...");

            const response = await axios.post(url, payload, {

                headers: {
                    "Content-Type": "application/json"
                },

                timeout: 10000

            });

            console.log("[WEBHOOK] Success:", response.status);

            return response.data;

        } catch (err) {

            const status = err.response?.status;

            // Discord Rate Limit
            if (status === 429) {

                const retryAfter =
                    Number(err.response.data?.retry_after ?? 1);

                console.warn(
                    `[WEBHOOK] Rate limited. Retrying in ${retryAfter}s...`
                );

                await sleep((retryAfter * 1000) + 100);

                continue;

            }

            // Network Error
            if (
                err.code === "ECONNRESET" ||
                err.code === "ETIMEDOUT" ||
                err.code === "ECONNABORTED"
            ) {

                console.warn(
                    `[WEBHOOK] ${err.code}, retrying in 2 seconds...`
                );

                await sleep(2000);

                continue;

            }

            throw err;

        }

    }

}

module.exports = sendWebhook;