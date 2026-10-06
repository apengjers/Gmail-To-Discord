const axios = require("axios");
const { logger, sleep } = require("../services/logger");

const MAX_ATTEMPTS = Number(process.env.WEBHOOK_MAX_ATTEMPTS || 5);
const BASE_DELAY = Number(process.env.WEBHOOK_BASE_DELAY || 2000);
const TIMEOUT = Number(process.env.WEBHOOK_TIMEOUT || 10000);

const RETRYABLE = [
    "ECONNRESET",
    "ETIMEDOUT",
    "ECONNABORTED",
    "EAI_AGAIN",
    "ENOTFOUND",
    "ECONNREFUSED",
    "EPIPE"
];

function isRetryable(err) {

    if (err.response?.status === 429)
        return true;

    return RETRYABLE.includes(err.code);

}

async function sendWebhook(url, payload) {

    if (!url)
        throw new Error("Webhook URL is empty.");

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {

        try {

            logger.info("Sending webhook...");

            const response = await axios.post(url, payload, {

                headers: {
                    "Content-Type": "application/json"
                },

                timeout: TIMEOUT

            });

            logger.info(`Webhook success: ${response.status}`);

            return response.data;

        } catch (err) {

            if (attempt >= MAX_ATTEMPTS) {

                logger.error(
                    `Webhook failed after ${MAX_ATTEMPTS} attempts, skipping`,
                    { stack: err?.stack }
                );

                throw err;

            }

            if (!isRetryable(err)) {

                logger.error(
                    `Webhook failed permanently: ${err.message}`,
                    { stack: err?.stack }
                );

                throw err;

            }

            let delay = BASE_DELAY * Math.pow(2, attempt - 1);

            if (err.response?.status === 429) {

                const retryAfter = Number(
                    err.response.data?.retry_after ?? 1
                );

                delay = Math.max(delay, (retryAfter * 1000) + 100);

            }

            logger.warn(
                `Webhook attempt ${attempt}/${MAX_ATTEMPTS} failed ` +
                `(${err.code || err.message}), retrying in ${Math.round(delay / 1000)}s`
            );

            await sleep(delay);

        }

    }

}

module.exports = sendWebhook;