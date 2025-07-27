// ui.js

import { DOM_ELEMENT_IDS, PROVIDERS_CONFIG } from './config.js';
import { getState, getActiveWitness } from './state.js';
import { getPresetOptions } from './prompts/presets.js';

/**
 * Parses AI responses to identify multiple speakers and format them properly.
 * @param {string} content - The AI response content
 * @returns {string} Formatted content with proper speaker labels
 */
function parseTranscriptSpeakers(content) {
    if (!content) return content;
    
    let formattedContent = content;
    
    // Skip if already properly formatted with speaker labels
    if (/^(Judge|Counsel|Attorney):/m.test(formattedContent)) {
        return formattedContent;
    }
    
    // Enhanced objection patterns - catch more variations
    const objectionPatterns = [
        /^(Objection[^.!?]*(?:privilege|leading|compound|form|relevance)[^.!?]*[.!?])/i,
        /^(Objection!?\s+[^.!?]*[.!?])/i,
        /^(Objection[.!])/i
    ];
    
    // Judge ruling patterns
    const judgePatterns = [
        /^((?:Sustained|Overruled)[^.!?]*[.!?])/i,
        /^(I'll allow it[^.!?]*[.!?])/i,
        /^(The objection is (?:sustained|overruled)[^.!?]*[.!?])/i
    ];
    
    // Check for objection at start
    for (const pattern of objectionPatterns) {
        const match = formattedContent.match(pattern);
        if (match) {
            const objection = match[1].trim();
            const remainder = formattedContent.substring(match[0].length).trim();
            
            // Check if judge ruling follows
            let judgeRuling = '';
            let finalRemainder = remainder;
            
            for (const judgePattern of judgePatterns) {
                const judgeMatch = remainder.match(judgePattern);
                if (judgeMatch) {
                    judgeRuling = judgeMatch[1].trim();
                    finalRemainder = remainder.substring(judgeMatch[0].length).trim();
                    break;
                }
            }
            
            // Reconstruct with proper labels
            let result = `Counsel: ${objection}`;
            if (judgeRuling) {
                result += `\nJudge: ${judgeRuling}`;
            }
            if (finalRemainder) {
                result += `\n${finalRemainder}`;
            }
            
            return result;
        }
    }
    
    // Check for judge ruling at start (without objection)
    for (const pattern of judgePatterns) {
        const match = formattedContent.match(pattern);
        if (match) {
            const ruling = match[1].trim();
            const remainder = formattedContent.substring(match[0].length).trim();
            
            let result = `Judge: ${ruling}`;
            if (remainder) {
                result += `\n${remainder}`;
            }
            
            return result;
        }
    }
    
    // Check for mid-text judge statements (like "Mr. Sterling, how do you respond?")
    const judgeAddressPattern = /(.*?)((?:Mr\.|Ms\.|Mrs\.)\s+\w+,?\s+how do you respond\?)(.*)/s;
    const judgeAddressMatch = formattedContent.match(judgeAddressPattern);
    if (judgeAddressMatch) {
        const before = judgeAddressMatch[1].trim();
        const judgeStatement = judgeAddressMatch[2].trim();
        const after = judgeAddressMatch[3].trim();
        
        let result = '';
        if (before) result += `${before}\n`;
        result += `Judge: ${judgeStatement.replace(/Mr\.|Ms\.|Mrs\./, 'Deposing counsel,')}`;
        if (after) result += `\n${after}`;
        
        return result;
    }
    
    return formattedContent;
}

// A single object to hold all DOM elements for easy access.
// Initialize as empty object, elements will be populated when DOM is ready
export const dom = {};

// Function to initialize DOM elements after the DOM is ready
export function initializeDOMElements() {
    Object.keys(DOM_ELEMENT_IDS).forEach(key => {
        dom[key] = document.getElementById(DOM_ELEMENT_IDS[key]);
    });
}

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
            // Parse markdown first
            const html = marked.parse(text);
            // Sanitize HTML to prevent XSS attacks
            return sanitizeHtml(html);
        }
        return sanitizeText(text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>'));
    } catch (e) {
        console.error('Markdown parsing error:', e);
        return sanitizeText(text); // Fallback to plain text on error
    }
}

/**
 * Sanitizes HTML content to prevent XSS attacks.
 * @param {string} html - HTML content to sanitize
 * @returns {string} Sanitized HTML
 */
function sanitizeHtml(html) {
    if (!html) return '';
    
    // Remove dangerous tags and attributes
    const cleanHtml = html
        // Remove script tags entirely
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        // Remove dangerous event handlers
        .replace(/\s*on\w+\s*=\s*[^>]*/gi, '')
        // Remove javascript: URLs
        .replace(/javascript:[^"']*/gi, '')
        // Remove data: URLs (except safe ones)
        .replace(/data:(?!image\/(png|jpg|jpeg|gif|svg\+xml))[^"']*/gi, '')
        // Remove style tags (could contain javascript)
        .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
        // Remove iframe, object, embed tags
        .replace(/<(iframe|object|embed|form|input)[^>]*>/gi, '')
        // Remove dangerous attributes
        .replace(/\s*(srcdoc|formaction|background)\s*=\s*[^>]*/gi, '');
    
    return cleanHtml;
}

/**
 * Sanitizes plain text content.
 * @param {string} text - Text content to sanitize
 * @returns {string} Sanitized text
 */
function sanitizeText(text) {
    if (!text) return '';
    
    return text
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .replace(/\//g, '&#x2F;');
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

export function renderPresetOptions() {
    // Render judge preset options
    if (dom.judgePreset) {
        dom.judgePreset.innerHTML = '';
        const judgePresets = getPresetOptions('judge');
        judgePresets.forEach(preset => {
            const option = document.createElement('option');
            option.value = preset.value;
            option.textContent = preset.name;
            option.title = preset.description;
            dom.judgePreset.appendChild(option);
        });
    }
    
    // Render opposing counsel preset options
    if (dom.counselPreset) {
        dom.counselPreset.innerHTML = '';
        const counselPresets = getPresetOptions('opposingCounsel');
        counselPresets.forEach(preset => {
            const option = document.createElement('option');
            option.value = preset.value;
            option.textContent = preset.name;
            option.title = preset.description;
            dom.counselPreset.appendChild(option);
        });
    }
    
    // Render rules preset options
    if (dom.rulesPreset) {
        dom.rulesPreset.innerHTML = '';
        const rulesPresets = getPresetOptions('rules');
        rulesPresets.forEach(preset => {
            const option = document.createElement('option');
            option.value = preset.value;
            option.textContent = preset.name;
            option.title = preset.description;
            dom.rulesPreset.appendChild(option);
        });
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

        // Parse transcript speakers for assistant messages (but not OOC messages)
        let content = msg.content;
        if (msg.role === 'assistant' && !msg.isOoc) {
            content = parseTranscriptSpeakers(content);
        }

        messageDiv.innerHTML = markdownToHtml(content);
        
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


export function updateRecordButtonState(isRecording) {
    if (!dom.recordButton) return;
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
    if (dom.documentCard) dom.documentCard.style.display = isScenarioLoaded ? 'block' : 'none';

    // Update input area
    if (dom.chatInput) {
        dom.chatInput.disabled = !isScenarioLoaded || isLoading;
        dom.chatInput.placeholder = isScenarioLoaded
            ? (isOocMode ? "Ask for a hint or feedback..." : "Type your question...")
            : "Choose or upload a scenario to begin...";
    }

    // Update buttons
    if (dom.sendButton) dom.sendButton.disabled = !isScenarioLoaded || isLoading;
    if (dom.recordButton) dom.recordButton.disabled = !isScenarioLoaded || isLoading;
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
    initializeDOMElements();
    renderProviderOptions();
    renderModelOptions();
    updateUI();
}
