const { loadState, saveState } = require("./services/state");

const state = loadState();

console.log(state);

state.lastUID = 12345;

saveState(state);

console.log("Saved!");