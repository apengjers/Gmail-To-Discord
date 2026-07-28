function formatDate(date) {

    if (!date)
        return "-";

    return new Date(date).toLocaleString("id-ID", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit"
    });

}

function getSender(mail) {

    if (!mail.from)
        return "Unknown";

    if (typeof mail.from === "string")
        return mail.from.split("<")[0].trim();

    return mail.from.text?.split("<")[0].trim() || "Unknown";

}

function extractField(html, label) {

    if (!html)
        return "-";

    const regex = new RegExp(
        `${label}[\\s\\S]*?<td[^>]*>([\\s\\S]*?)<\\/td>`,
        "i"
    );

    const match = html.match(regex);

    if (!match)
        return "-";

    return match[1]
        .replace(/<[^>]+>/g, "")
        .replace(/&nbsp;/g, " ")
        .trim();

}

function createEmbed(mail, filter) {

    if (filter.name === "Itemku Order") {

        const produk = extractField(mail.html, "Produk");
        const jumlah = extractField(mail.html, "Jumlah");
        const harga = extractField(mail.html, "Harga Produk");

        return {
            username: "Yanamin",
            avatar_url: "https://w.wallhaven.cc/full/w5/wallhaven-w5qz36.jpg",
            content: "@everyone",
            embeds: [
                {
                    title: "🛒 Dagangan Kamu Dibeli!",

                    color: 0x57F287,

                    description:
`🎮 **${produk}**
📦 **${jumlah}**
💰 **${harga}**

✅ **Success**`,

                    timestamp: mail.date
                        ? new Date(mail.date).toISOString()
                        : new Date().toISOString()
                }
            ]
        };

    }

    return {
        username: "Yanamin",
        avatar_url: "https://w.wallhaven.cc/full/w5/wallhaven-w5qz36.jpg",
        content: "@everyone",
        embeds: [
            {
                title: `📦 ${mail.subject || "(No Subject)"}`,

                color: 0x2ecc71,

                description:
`✅ **Success**

👤 **${getSender(mail)}**
🕒 **${formatDate(mail.date)}**`,

                footer: {
                    text: `UID ${mail.uid}`
                },

                timestamp: mail.date
                    ? new Date(mail.date).toISOString()
                    : new Date().toISOString()
            }
        ]
    };

}

module.exports = createEmbed;