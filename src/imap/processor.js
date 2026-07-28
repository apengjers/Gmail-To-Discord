const { simpleParser } = require("mailparser");
const { getClient } = require("./client");

async function processEmail(uid) {
    const client = getClient();

    if (!client) {
        throw new Error("IMAP client is not connected.");
    }

    for await (const message of client.fetch(
        { uid },
        {
            uid: true,
            envelope: true,
            source: true
        }
    )) {

        const parsed = await simpleParser(message.source);

        return {
            uid: message.uid,

            messageId: parsed.messageId || "",

            from: {
                text: parsed.from?.text || "",
                value: parsed.from?.value || []
            },

            to: {
                text: parsed.to?.text || "",
                value: parsed.to?.value || []
            },

            cc: {
                text: parsed.cc?.text || "",
                value: parsed.cc?.value || []
            },

            subject: parsed.subject || "",

            text: parsed.text || "",

            html: parsed.html || "",

            date: parsed.date || null,

            attachments: parsed.attachments || []
        };
    }

    return null;
}

module.exports = processEmail;