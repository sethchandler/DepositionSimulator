// ui.js

import { DOM_ELEMENT_IDS, PROVIDERS_CONFIG } from './config.js';
import { getState, getActiveWitness } from './state.js';

// A single object to hold all DOM elements for easy access.
export const dom = Object.keys(DOM_ELEMENT_IDS).reduce((acc, key) => {
    acc[key] = document.getElementById(DOM_ELEMENT_IDS[key]);
    return acc;
}, {});

/**
 * Displays an error message in the chat window.
 * @param {string} errorMessage - The error message to display.
 */
export function displayError(errorMessage) {
    const state = getState();
    state.messages.push({ role: 'assistant', content: `Error: ${errorMessage}`, isOoc: true });
    renderChatMessages();
}

function markdownToHtml(text) {
    if (!text || typeof text !== 'string') return '';
    try {
        if (typeof marked !== 'undefined') {
            // Sanitize to prevent XSS, allowing only basic formatting.
            return marked.parse(text, { sanitize: true });
        }
        return text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    } catch (e) {
        console.error('Markdown parsing error:', e);
        return text; // Fallback to plain text on error
    }
}

export function renderProviderOptions() {
    if (!dom.providerSelect) return;
    dom.providerSelect.innerHTML = '';
    for (const [id, provider] of Object.entries(PROVIDERS_CONFIG)) {
        const option = document.createElement('option');
        option.value = id;
        option.textContent = provider.label;
        dom.providerSelect.appendChild(option);
    }
}

export function renderModelOptions() {
    const { providerId } = getState();
    const provider = PROVIDERS_CONFIG[providerId];
    if (!provider || !dom.modelSelect) return;

    dom.modelSelect.innerHTML = '';
    provider.models.forEach(model => {
        const option = document.createElement('option');
        option.value = model.name;
        option.textContent = model.name;
        dom.modelSelect.appendChild(option);
    });
    dom.modelSelect.value = provider.defaultModel;
}

export function renderChatMessages() {
    const { messages, isLoading } = getState();
    if (!dom.chatHistory) return;

    dom.chatHistory.innerHTML = '';
    messages.slice(1).forEach(msg => { // slice(1) to skip system prompt
        const wrapper = document.createElement('div');
        wrapper.className = 'message-wrapper';

        const messageDiv = document.createElement('div');
        messageDiv.className = 'chat-message';
        messageDiv.classList.add(
            msg.isOoc ? 'meta-message' :
            msg.role === 'user' ? 'user-message' : 'assistant-message'
        );

        messageDiv.innerHTML = markdownToHtml(msg.content);
        
        wrapper.appendChild(messageDiv);
        dom.chatHistory.appendChild(wrapper);
    });

    if (isLoading) {
        const typingIndicator = document.createElement('div');
        typingIndicator.className = 'typing-indicator assistant-message';
        typingIndicator.textContent = 'Typing...';
        dom.chatHistory.appendChild(typingIndicator);
    }
    dom.chatHistory.scrollTop = dom.chatHistory.scrollHeight;
}

export function renderCost() {
    const { totalTokens, totalCost } = getState();
    if (dom.totalTokensSpan) dom.totalTokensSpan.textContent = totalTokens.toLocaleString();
    if (dom.estimatedCostSpan) dom.estimatedCostSpan.textContent = `$${totalCost.toFixed(6)}`;
}

export function renderWitnessOptions() {
    const { witnesses } = getState();
    if (!dom.witnessSelector) return;

    dom.witnessSelector.innerHTML = '';
    witnesses.forEach((w, i) => {
        const option = document.createElement('option');
        option.value = i;
        option.textContent = w.name || w?.witnessBackground?.personalDetails?.fullName || `Witness ${i + 1}`;
        dom.witnessSelector.appendChild(option);
    });
}

// PASTE THIS ENTIRE FUNCTION INTO ui.js

export function updateRecordButtonState(isRecording, isEnabled) {
    if (!dom.recordButton) return;
    dom.recordButton.disabled = !isEnabled;
    if (isRecording) {
        dom.recordButton.classList.add('recording');
    } else {
        dom.recordButton.classList.remove('recording');
    }
}

// In ui.js, add this new function

export function setRecordingActive(isActive) {
    if (!dom.chatInput) return;

    if (isActive) {
        dom.chatInput.classList.add('recording-active');
        dom.chatInput.placeholder = "Listening... Click the mic again to stop.";
    } else {
        dom.chatInput.classList.remove('recording-active');
        // The main updateUI function will restore the correct placeholder
    }
}


export function updateUI() {
    const { isLoading, isOocMode, messages } = getState();
    const witness = getActiveWitness();
    const isScenarioLoaded = witness !== null;
    const hasHistory = messages.length > 1;

    // Toggle visibility of cards
    if (dom.intelCard) dom.intelCard.style.display = isScenarioLoaded ? 'block' : 'none';
    if (dom.witnessSelectorCard) dom.witnessSelectorCard.style.display = getState().witnesses.length > 1 ? 'block' : 'none';

    // Update input area
    if (dom.chatInput) {
        dom.chatInput.disabled = !isScenarioLoaded || isLoading;
        dom.chatInput.placeholder = isScenarioLoaded
            ? (isOocMode ? "Ask for a hint or feedback..." : "Type your question...")
            : "Choose or upload a scenario to begin...";
    }

    // Update buttons
    if (dom.sendButton) dom.sendButton.disabled = !isScenarioLoaded || isLoading;
    if (dom.recordButton) updateRecordButtonState(false, isScenarioLoaded && !isLoading);
    if (dom.modeToggleCheckbox) dom.modeToggleCheckbox.disabled = !isScenarioLoaded || isLoading;
    if (dom.saveTranscriptButton) dom.saveTranscriptButton.disabled = !isScenarioLoaded || isLoading || !hasHistory;
    if (dom.getSummaryButton) dom.getSummaryButton.disabled = !isScenarioLoaded || isLoading;
    if (dom.getCaseSummaryButton) dom.getCaseSummaryButton.disabled = !isScenarioLoaded || isLoading;

    // Update chat title
    if (dom.chatTitle) {
        const witnessName = witness?.name || witness?.witnessBackground?.personalDetails?.fullName || 'Unnamed Witness';
        dom.chatTitle.textContent = isScenarioLoaded ? `Deposition of: ${witnessName}` : 'Deposition';
    }
}

export function initializeUI() {
    renderProviderOptions();
    renderModelOptions();
    updateUI();
}
