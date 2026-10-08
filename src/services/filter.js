const filters = require("../config/filters");
const { logger } = require("./logger");

function normalize(value) {

    if (!value)
        return "";

    if (typeof value === "string")
        return value;

    if (typeof value === "object") {

        if (typeof value.text === "string")
            return value.text;

        return JSON.stringify(value);

    }

    return String(value);

}

function match(value, keywords) {

    if (!keywords?.length)
        return true;

    const text = normalize(value).toLowerCase();

    return keywords.some(keyword =>
        text.includes(String(keyword).toLowerCase())
    );

}

function matchFilter(mail) {

    const from = normalize(mail.from);
    const subject = normalize(mail.subject);

    for (const filter of filters) {

        const senderMatch = match(mail.from, filter.sender);
        const subjectMatch = match(mail.subject, filter.subject);

        if (senderMatch && subjectMatch) {

            return filter;

        }

        logger.debug(
            `Filter "${filter.name}" skipped ` +
            `(sender=${senderMatch}, subject=${subjectMatch})`
        );

    }

    return null;
}

module.exports = matchFilter;