module.exports = [

    {
        name: "Itemku Stock",

        enabled: true,

        sender: [
            "no-reply@itemku.com"
        ],

        subject: [
            "stok"
        ],

        webhook: process.env.DISCORD_STOCK_WEBHOOK
    },

    {
        name: "Itemku Order",

        enabled: true,

        sender: [
            "no-reply@itemku.com"
        ],

        subject: [
            "dagangan kamu dibeli"
        ],

        webhook: process.env.DISCORD_ORDER_WEBHOOK
    }

];