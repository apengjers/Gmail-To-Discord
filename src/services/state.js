const fs = require("fs");
const path = require("path");

const STATE_PATH = path.join(__dirname, "../../storage/state.json");

function loadState() {
    try {
        if (!fs.existsSync(STATE_PATH)) {
            return {
                lastUID: 0
            };
        }

        return JSON.parse(fs.readFileSync(STATE_PATH, "utf8"));
    } catch (err) {
        console.error("Failed to load state:", err);

        return {
            lastUID: 0
        };
    }
}

function saveState(state) {
    try {
        fs.writeFileSync(
            STATE_PATH,
            JSON.stringify(state, null, 4)
        );
    } catch (err) {
        console.error("Failed to save state:", err);
    }
}

module.exports = {
    loadState,
    saveState
};