const { getClient } = require("./client");
const processEmail = require("./processor");

const matchFilter = require("../services/filter");
const createEmbed = require("../discord/embed");
const sendWebhook = require("../discord/webhook");

const { loadState, saveState } = require("../services/state");

const queue = [];
const queued = new Set();

let processing = false;
let syncing = false;

async function worker() {

    if (processing)
        return;

    processing = true;

    while (queue.length > 0) {

        const uid = queue.shift();

        queued.delete(uid);

        try {

            console.log(`[QUEUE] Processing UID ${uid}`);

            const mail = await processEmail(uid);

            if (!mail) {
                console.log(`[QUEUE] UID ${uid} not found`);
                continue;
            }
            console.log("========== MAIL ==========");
            console.log("FROM   :", mail.from);
            console.log("SUBJECT:", mail.subject);
            console.log("==========================");
            const filter = matchFilter(mail);

            if (!filter) {

                const state = loadState();

                if (uid > (state.lastUID || 0)) {

                    state.lastUID = uid;
                    saveState(state);

                }

                console.log(`[QUEUE] No filter matched for UID ${uid}`);

                continue;

            }

            const payload = createEmbed(mail, filter);

            await sendWebhook(filter.webhook, payload);

            // kasih jeda sedikit supaya webhook lebih santai
            await new Promise(resolve => setTimeout(resolve, 250));

            const state = loadState();

            if (uid > (state.lastUID || 0)) {

                state.lastUID = uid;

                saveState(state);

            }

            console.log(`[QUEUE] UID ${uid} forwarded`);

        } catch (err) {

            console.error(`[QUEUE] UID ${uid} failed`);

            console.error(err);

        }

    }

    processing = false;

}

function push(uid) {

    if (queued.has(uid))
        return;

    queued.add(uid);

    queue.push(uid);

    worker().catch(console.error);

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

        const latest = await client.fetchOne("*", {
            uid: true
        });

        if (!latest)
            return;

        const newestUID = latest.uid;

        if (newestUID <= lastUID)
            return;

        console.log(`[SYNC] ${lastUID + 1} -> ${newestUID}`);

        for (let uid = lastUID + 1; uid <= newestUID; uid++) {

            push(uid);

        }

    } catch (err) {

        console.error("[SYNC]", err);

    } finally {

        syncing = false;

    }

}

module.exports = {
    push,
    sync
};