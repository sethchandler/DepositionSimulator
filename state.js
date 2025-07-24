// state.js

// The single source of truth for the application state.
let appState = {
    providerId: 'openai',
    apiKey: '',
    model: '',
    isJudgePresent: false,
    isOocMode: false, // Out-of-character "Coach" mode
    caseData: null,
    witnesses: [],
    activeWitnessIndex: 0,
    messages: [], // Chat history
    isLoading: false,
    totalTokens: 0,
    totalCost: 0.0
};

/**
 * Returns a copy of the current application state.
 * @returns {object} The current state.
 */
export function getState() {
    return { ...appState };
}

/**
 * Updates the application state by merging the new state with the existing state.
 * @param {object} newState - An object containing the state properties to update.
 */
export function setState(newState) {
    appState = { ...appState, ...newState };
}

/**
 * Retrieves the currently active witness object from the state.
 * @returns {object|null} The active witness object or null if none is active.
 */
export function getActiveWitness() {
    const { witnesses, activeWitnessIndex } = appState;
    return witnesses[activeWitnessIndex] || null;
}
