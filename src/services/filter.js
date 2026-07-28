const filters = require("../config/filters");

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

    console.log("MAIL FROM   :", normalize(mail.from));
    console.log("MAIL SUBJECT:", normalize(mail.subject));

    for (const filter of filters) {

        console.log("\nFilter:", filter.name);
        console.log("Sender :", match(mail.from, filter.sender));
        console.log("Subject:", match(mail.subject, filter.subject));

        if (
            match(mail.from, filter.sender) &&
            match(mail.subject, filter.subject)
        ) {
            return filter;
        }

    }

    return null;
}

module.exports = matchFilter;