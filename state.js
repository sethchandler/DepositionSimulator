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
    totalCost: 0.0,
    // Advanced prompt settings
    judgePreset: 'default',
    judgeCustom: '',
    counselPreset: 'default', 
    counselCustom: '',
    rulesPreset: 'default',
    rulesCustom: ''
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
 * @returns {object|null} Deep copy of active witness object or null if none is active.
 */
export function getActiveWitness() {
    const { witnesses, activeWitnessIndex } = appState;
    const witness = witnesses[activeWitnessIndex];
    
    // Return deep copy to maintain immutability
    return witness ? deepCopy(witness) : null;
}

/**
 * Creates a deep copy of an object to prevent mutation.
 * @param {any} obj - Object to copy
 * @returns {any} Deep copy of the object
 */
function deepCopy(obj) {
    if (obj === null || typeof obj !== 'object') {
        return obj;
    }
    
    if (obj instanceof Date) {
        return new Date(obj.getTime());
    }
    
    if (Array.isArray(obj)) {
        return obj.map(item => deepCopy(item));
    }
    
    if (typeof obj === 'object') {
        const copy = {};
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                copy[key] = deepCopy(obj[key]);
            }
        }
        return copy;
    }
    
    return obj;
}
