const { getClient } = require("./client");
const processEmail = require("./processor");

const matchFilter = require("../services/filter");
const createEmbed = require("../discord/embed");
const sendWebhook = require("../discord/webhook");

const { loadState, saveState } = require("../services/state");
const { logger } = require("../services/logger");

const MAX_GAP = Number(process.env.MAX_UID_GAP || 200);
const CATCHUP_COUNT = Number(process.env.CATCHUP_COUNT || 50);
const WEBHOOK_DELAY = Number(process.env.WEBHOOK_DELAY || 250);

const queue = [];
const queued = new Set();

let processing = false;
let syncing = false;

function advanceState(uid) {

    const state = loadState();

    if (uid > (state.lastUID || 0)) {

        state.lastUID = uid;

        saveState(state);

    }

}

async function worker() {

    if (processing)
        return;

    processing = true;

    while (queue.length > 0) {

        const uid = queue.shift();

        queued.delete(uid);

        try {

            logger.info(`Processing UID ${uid}`);

            const mail = await processEmail(uid);

            if (!mail) {
                logger.warn(`UID ${uid} not found`);
                continue;
            }

            logger.info(`FROM: ${mail.from.text}`);
            logger.info(`SUBJECT: ${mail.subject}`);

            const filter = matchFilter(mail);

            if (!filter) {

                advanceState(uid);

                logger.info(`No filter matched for UID ${uid}`);

                continue;

            }

            const payload = createEmbed(mail, filter);

            await sendWebhook(filter.webhook, payload);

            await new Promise(resolve => setTimeout(resolve, WEBHOOK_DELAY));

            advanceState(uid);

            logger.info(`UID ${uid} forwarded`);

        } catch (err) {

            logger.error(`UID ${uid} failed`, { stack: err?.stack });

        }

    }

    processing = false;

}

function push(uid) {

    if (queued.has(uid))
        return;

    queued.add(uid);

    queue.push(uid);

    worker().catch(err => {
        logger.error("Worker crashed", { stack: err?.stack });
        reset();
    });

}

async function newestUID() {

    const client = getClient();

    if (!client)
        return null;

    const latest = await client.fetchOne("*", {
        uid: true
    });

    return latest?.uid || null;

}

async function catchupUIDs(client, lastUID, newest) {

    const exists = client.mailbox?.exists || 0;

    if (exists <= 0)
        return [];

    const from = Math.max(1, exists - CATCHUP_COUNT + 1);

    const range = `${from}:${exists}`;

    const uids = [];

    for await (const message of client.fetch(range, {
        uid: true
    })) {

        if (message.uid > lastUID)
            uids.push(message.uid);

    }

    logger.warn(
        `Backlog detected: lastUID ${lastUID}, newest ${newest}. ` +
        `Processing last ${uids.length} email(s) only.`
    );

    return uids.sort((a, b) => a - b);

}

async function sync() {

    if (syncing)
        return;

    syncing = true;

    try {

        const client = getClient();

        if (!client)
            return;

        const state = loadState();

        const lastUID = state.lastUID || 0;

        const newest = await newestUID();

        if (!newest)
            return;

        if (newest <= lastUID)
            return;

        if (newest - lastUID > MAX_GAP) {

            const uids = await catchupUIDs(client, lastUID, newest);

            uids.forEach(uid => push(uid));

            return;

        }

        logger.info(`Syncing ${lastUID + 1} -> ${newest}`);

        for (let uid = lastUID + 1; uid <= newest; uid++) {

            push(uid);

        }

    } catch (err) {

        logger.error("Sync failed", { stack: err?.stack });

    } finally {

        syncing = false;

    }

}

function reset() {

    queue.length = 0;

    queued.clear();

    processing = false;

    syncing = false;

}

module.exports = {
    push,
    sync,
    reset
};