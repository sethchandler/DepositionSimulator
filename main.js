// main.js

import { PROVIDERS_CONFIG } from './config.js';
import { PRE_BUILT_SCENARIOS } from './scenarios.js';
import { getState, setState, getActiveWitness } from './state.js';
import { callLlmApi, testOllamaConnection } from './api.js';
import { dom, initializeUI, renderModelOptions, renderChatMessages, renderCost, renderWitnessOptions, updateUI, displayError, setRecordingActive, updateRecordButtonState } from './ui.js';
import { depositionService } from './services/depositionService.js';
import { handleError } from './utils/errorHandler.js';
// At the top of main.js
import { initializeSpeech, toggleRecording, isSpeechRecognitionSupported } from './speech.js';
// --- Event Handlers ---
// In main.js, replace the entire handleProviderChange function with this:
function handleProviderChange(e) {
    const providerId = e.target.value;
    const newProviderConfig = PROVIDERS_CONFIG[providerId]; // Get the new provider's config
    
    setState({
        providerId: providerId,
        apiKey: localStorage.getItem(`llm_${providerId}_key`) || '',
        model: newProviderConfig.defaultModel // Set the model to the new default
    });

    if (dom.apiKeyInput) dom.apiKeyInput.value = getState().apiKey;

    if (dom.ollamaSetupInfo) {
        dom.ollamaSetupInfo.style.display = (providerId === 'ollama') ? 'block' : 'none';
    }
    if (dom.apiKeyInput?.parentElement) {
        dom.apiKeyInput.parentElement.style.display = (providerId === 'ollama') ? 'none' : 'block';
    }
    renderModelOptions();
    resetChat();
}


function handleApiKeyChange(e) {
    const { providerId } = getState();
    const apiKey = e.target.value;
    setState({ apiKey });
    localStorage.setItem(`llm_${providerId}_key`, apiKey);
}

function handleModelChange(e) {
    setState({ model: e.target.value });
    resetChat();
}

function handleJudgeModeChange(e) {
    setState({ isJudgePresent: e.target.checked });
    resetChat();
}

function handleFileLoad(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
        try {
            const caseData = JSON.parse(event.target.result);
            // Basic validation
            if (!caseData || (!caseData.witnesses && !caseData.witnessProfile)) {
                 throw new Error("Invalid case file structure. Must contain a 'witnesses' array or witness profile.");
            }
            loadWitnessData(caseData);
            if (dom.scenarioSelector) dom.scenarioSelector.value = "-1";
        } catch (err) {
            const errorInfo = handleError(err, 'handleFileLoad');
            displayError(`Failed to load file: ${errorInfo.userMessage}`);
        }
    };
    reader.readAsText(file);
}

function handleScenarioChange(e) {
    const index = parseInt(e.target.value, 10);
    if (index >= 0) {
        try {
            const encodedData = PRE_BUILT_SCENARIOS[index];
            const decodedData = atob(encodedData);
            const jsonData = JSON.parse(decodedData);
            loadWitnessData(jsonData);
            if (dom.fileLoaderInput) dom.fileLoaderInput.value = ""; // Clear file input
        } catch (err) {
            const errorInfo = handleError(err, 'handleScenarioChange');
            displayError(`Failed to load scenario: ${errorInfo.userMessage}`);
        }
    }
}

async function handleTestOllama() {
    if (!dom.testOllamaConnection) return;
    const button = dom.testOllamaConnection;
    const originalText = button.textContent;
    button.textContent = 'Testing...';
    button.disabled = true;

    try {
        const modelCount = await testOllamaConnection();
        button.textContent = `✅ Connected (${modelCount} models)`;
        button.style.backgroundColor = '#28a745';
    } catch (e) {
        button.textContent = '❌ Connection Failed';
        button.style.backgroundColor = '#dc3545';
        const errorInfo = handleError(e, 'handleTestOllama');
        displayError(errorInfo.userMessage);
    } finally {
        setTimeout(() => {
            button.textContent = originalText;
            button.style.backgroundColor = '';
            button.disabled = false;
        }, 3000);
    }
}

async function handleSendMessage() {
    const userInput = dom.chatInput.value.trim();
    if (!userInput || getState().isLoading) return;

    const { isOocMode, messages, isJudgePresent, providerId, apiKey, model } = getState();
    const witness = getActiveWitness();

    // UI updates
    setState({ isLoading: true });
    clearChatInput();
    renderChatMessages();
    updateUI();

    try {
        // Business logic delegated to service
        const result = await depositionService.sendMessage(
            userInput,
            witness,
            messages,
            {
                isOocMode,
                isJudgePresent,
                apiConfig: { providerId, apiKey, model }
            }
        );
        
        // Handle results - update state
        setState({ 
            messages: [...getState().messages, result.userMessage, result.assistantMessage]
        });
        updateCost(result.usage);
        
    } catch (error) {
        const errorInfo = handleError(error, 'handleSendMessage');
        displayError(errorInfo.userMessage);
    } finally {
        setState({ isLoading: false });
        renderChatMessages();
        updateUI();
        dom.chatInput.focus();
    }
}

async function handleGetSummary(isCaseSummary = false) {
    if (getState().isLoading) return;

    const witness = getActiveWitness();
    const detailLevel = dom.summaryDetailSlider.value;
    const { providerId, apiKey, model } = getState();

    // UI updates
    setState({ isLoading: true });
    renderChatMessages();
    updateUI();
    
    try {
        // Business logic delegated to service
        const result = isCaseSummary
            ? await depositionService.generateCaseSummary(witness, detailLevel, { providerId, apiKey, model })
            : await depositionService.generateWitnessSummary(witness, detailLevel, { providerId, apiKey, model });

        // Handle results - update state
        setState({ messages: [...getState().messages, result.message] });
        updateCost(result.usage);
        
    } catch (error) {
        const errorInfo = handleError(error, 'handleGetSummary');
        displayError(errorInfo.userMessage);
    } finally {
        setState({ isLoading: false });
        renderChatMessages();
        updateUI();
        dom.chatInput.focus();
    }
}

function handleSaveTranscript() {
    const witness = getActiveWitness();
    if (!witness) return;
    
    const { providerId, model, messages } = getState();
    const witnessName = witness.name || witness?.witnessBackground?.personalDetails?.fullName || 'Unnamed Witness';
    const date = new Date().toISOString().slice(0, 10);
    const providerLabel = PROVIDERS_CONFIG[providerId]?.label || providerId;

    let transcriptContent = `# Deposition Transcript\n\n- **Witness:** ${witnessName}\n- **Date:** ${date}\n- **LLM Provider:** ${providerLabel}\n- **LLM Model:** ${model}\n---\n\n`;
    
    messages.slice(1).forEach(m => {
        let speaker = "Unknown";
        if (m.role === 'user') speaker = "Examiner";
        else if (m.isOoc) speaker = "Coach";
        else speaker = "Witness";
        transcriptContent += `**${speaker}:** ${m.content}\n\n`;
    });

    const blob = new Blob([transcriptContent], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Deposition-of-${witnessName.replace(/\s+/g, '_')}-${date}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// --- Helper Functions ---

function clearChatInput() {
    dom.chatInput.value = '';
    dom.chatInput.style.height = 'auto'; // Reset height
}

function loadWitnessData(data) {
    const witnesses = Array.isArray(data.witnesses) ? data.witnesses : [data];
    setState({
        caseData: data,
        witnesses: witnesses,
        activeWitnessIndex: 0
    });
    renderWitnessOptions();
    resetChat();
}

function resetChat() {
    const witness = getActiveWitness();
    const { isJudgePresent } = getState();
    
    // Use service to build system prompt if witness exists
    let systemPrompt = null;
    if (witness) {
        systemPrompt = depositionService.buildSystemPrompt(witness, [], false, isJudgePresent);
    }
    
    setState({
        messages: systemPrompt ? [systemPrompt] : [],
        totalTokens: 0,
        totalCost: 0.0
    });
    renderCost();
    renderChatMessages();
    updateUI();
}

function updateCost(usage) {
    if (!usage) return;
    const { providerId, model, totalTokens, totalCost } = getState();
    const provider = PROVIDERS_CONFIG[providerId];
    if (!provider) return;

    const modelInfo = provider.models.find(m => m.name === model);
    if (!modelInfo?.pricing) return;

    const inputCost = (usage.inputTokens / 1000000) * modelInfo.pricing.inputPerMillionTokens;
    const outputCost = (usage.outputTokens / 1000000) * modelInfo.pricing.outputPerMillionTokens;

    setState({
        totalTokens: totalTokens + usage.inputTokens + usage.outputTokens,
        totalCost: totalCost + inputCost + outputCost,
    });
    renderCost();
}

// --- Initialization ---
// In main.js, replace the entire initialize function
function initialize() {
    // Set initial state from localStorage if available
    const initialProviderId = dom.providerSelect.value || 'openai';
    setState({
        providerId: initialProviderId,
        apiKey: localStorage.getItem(`llm_${initialProviderId}_key`) || '',
        model: PROVIDERS_CONFIG[initialProviderId]?.defaultModel || ''
    });

    // Populate UI with initial state
    if (dom.apiKeyInput) dom.apiKeyInput.value = getState().apiKey;
    initializeUI();
    updateUI();

    // Initialize Speech Recognition
    if (isSpeechRecognitionSupported()) {
        const onTranscript = (final_transcript, interim_transcript) => {
            // This function is called by speech.js with the transcribed text
            const originalText = dom.chatInput.value.replace(dom.chatInput.dataset.interim || '', '');
            dom.chatInput.value = originalText + final_transcript + interim_transcript;
            dom.chatInput.dataset.interim = interim_transcript;
        };
        
        const onStateChange = (isRecording) => {
    const scenarioLoaded = getActiveWitness() !== null;
    updateRecordButtonState(isRecording, scenarioLoaded);
    setRecordingActive(isRecording);

    // If we just stopped recording, call updateUI to restore the correct placeholder
    if (!isRecording) {
        updateUI();
    }
};

        initializeSpeech(onTranscript, onStateChange);
    } else {
        // Hide the button if the browser doesn't support the API
        if (dom.recordButton) dom.recordButton.style.display = 'none';
    }

    // Attach all event listeners
    dom.providerSelect?.addEventListener('change', handleProviderChange);
    dom.apiKeyInput?.addEventListener('change', handleApiKeyChange);
    dom.modelSelect?.addEventListener('change', handleModelChange);
    dom.judgeModeCheckbox?.addEventListener('change', handleJudgeModeChange);
    dom.fileLoaderInput?.addEventListener('change', handleFileLoad);
    dom.scenarioSelector?.addEventListener('change', handleScenarioChange);
    dom.witnessSelector?.addEventListener('change', (e) => {
        setState({ activeWitnessIndex: Number(e.target.value) });
        resetChat();
    });
    dom.modeToggleCheckbox?.addEventListener('change', (e) => {
        setState({ isOocMode: e.target.checked });
        updateUI();
    });
    dom.chatInput?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    });
    dom.chatInput?.addEventListener('input', (e) => {
        e.target.style.height = 'auto';
        e.target.style.height = `${e.target.scrollHeight}px`;
    });
    dom.sendButton?.addEventListener('click', handleSendMessage);
    dom.getSummaryButton?.addEventListener('click', () => handleGetSummary(false));
    dom.getCaseSummaryButton?.addEventListener('click', () => handleGetSummary(true));
    dom.saveTranscriptButton?.addEventListener('click', handleSaveTranscript);
    dom.testOllamaConnection?.addEventListener('click', handleTestOllama);
    dom.recordButton?.addEventListener('click', toggleRecording); // Add listener for the new button

    console.log("Deposition Trainer Initialized.");
}


// Start the application
document.addEventListener('DOMContentLoaded', initialize);
