// main.js

import { PROVIDERS_CONFIG } from './config.js';
import { PRE_BUILT_SCENARIOS } from './scenarios.js';
import { dataLoader } from './services/dataLoader.js';
import { getState, setState, getActiveWitness } from './state.js';
import { callLlmApi, testOllamaConnection } from './api.js';
import { dom, initializeUI, initializeDOMElements, renderModelOptions, renderPresetOptions, renderChatMessages, renderCost, renderWitnessOptions, updateUI, displayError, setRecordingActive, updateRecordButtonState } from './ui.js';
import { depositionService } from './services/depositionService.js';
import { handleError } from './utils/errorHandler.js';
// At the top of main.js
import { initializeSpeech, toggleRecording, isSpeechRecognitionSupported } from './speech.js';
import { getPresetInstruction } from './prompts/presets.js';
// Document system imports
import { initializeDocumentUI, updateDocumentUI, getDocumentContextForQuestion, clearActiveDocumentContexts } from './ui/documentUI.js';
import { documentService } from './services/documentService.js';
import { documentViewer } from './ui/documentViewer.js';

// --- Security Utilities ---
/**
 * Basic obfuscation for API keys stored in localStorage.
 * Note: This is not true encryption, just basic obfuscation for casual protection.
 * @param {string} key - API key to obfuscate
 * @returns {string} Obfuscated key
 */
function obfuscateApiKey(key) {
    if (!key) return '';
    try {
        // Simple obfuscation: base64 encode + reverse + add padding
        const encoded = btoa(key);
        const reversed = encoded.split('').reverse().join('');
        return 'obf_' + reversed + '_end';
    } catch (error) {
        console.warn('Failed to obfuscate API key:', error);
        return key; // Fallback to plain text if obfuscation fails
    }
}

/**
 * Deobfuscates API keys from localStorage.
 * @param {string} obfuscatedKey - Obfuscated key to restore
 * @returns {string} Original API key
 */
function deobfuscateApiKey(obfuscatedKey) {
    if (!obfuscatedKey) return '';
    
    // Check if it's obfuscated format
    if (!obfuscatedKey.startsWith('obf_') || !obfuscatedKey.endsWith('_end')) {
        // Not obfuscated, return as-is (backward compatibility)
        return obfuscatedKey;
    }
    
    try {
        // Remove prefix and suffix
        const encoded = obfuscatedKey.slice(4, -4);
        // Reverse and decode
        const reversed = encoded.split('').reverse().join('');
        return atob(reversed);
    } catch (error) {
        console.warn('Failed to deobfuscate API key:', error);
        return ''; // Return empty string if deobfuscation fails
    }
}
// --- Event Handlers ---
// In main.js, replace the entire handleProviderChange function with this:
async function handleProviderChange(e) {
    const providerId = e.target.value;
    const newProviderConfig = PROVIDERS_CONFIG[providerId]; // Get the new provider's config
    
    const storedKey = localStorage.getItem(`llm_${providerId}_key`) || '';
    const deobfuscatedKey = deobfuscateApiKey(storedKey);
    
    setState({
        providerId: providerId,
        apiKey: deobfuscatedKey,
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
    await resetChat();
}


function handleApiKeyChange(e) {
    const { providerId } = getState();
    const apiKey = e.target.value;
    setState({ apiKey });
    
    // Store obfuscated version in localStorage for basic protection
    const obfuscatedKey = obfuscateApiKey(apiKey);
    localStorage.setItem(`llm_${providerId}_key`, obfuscatedKey);
}

async function handleModelChange(e) {
    setState({ model: e.target.value });
    await resetChat();
}

async function handleJudgeModeChange(e) {
    setState({ isJudgePresent: e.target.checked });
    await resetChat();
}

// Advanced prompt setting handlers
function handleAdvancedToggle() {
    const advancedSettings = dom.advancedSettings;
    const toggleText = dom.advancedToggleText;
    
    if (advancedSettings.style.display === 'none') {
        advancedSettings.style.display = 'block';
        toggleText.textContent = '▼ Advanced Prompt Settings';
    } else {
        advancedSettings.style.display = 'none';
        toggleText.textContent = '▶ Advanced Prompt Settings';
    }
}

function handlePresetChange(role, presetSelect, customTextarea) {
    const presetKey = presetSelect.value;
    const instruction = getPresetInstruction(role, presetKey);
    
    // Update the custom textarea with the preset instruction
    customTextarea.value = instruction;
    
    // Update state
    const stateUpdate = {};
    stateUpdate[`${role}Preset`] = presetKey;
    stateUpdate[`${role}Custom`] = instruction;
    setState(stateUpdate);
    
    // Don't reset chat - allow mid-deposition personality changes
    // Only update UI to reflect new settings
    updateUI();
}

function handleCustomPromptChange(role, textarea) {
    const stateUpdate = {};
    stateUpdate[`${role}Custom`] = textarea.value;
    setState(stateUpdate);
    
    // Don't reset chat - allow mid-deposition personality changes
    // Only update UI to reflect new settings
    updateUI();
}

async function handlePromptFileUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = async function(event) {
        try {
            const fileContent = event.target.result;
            let parsedInstructions;
            
            // Check if it's JSON or plain text
            if (file.name.endsWith('.json')) {
                // Handle JSON files (legacy format)
                const promptConfig = JSON.parse(fileContent);
                parsedInstructions = {
                    judgeInstructions: promptConfig.judgeCustom || null,
                    counselInstructions: promptConfig.counselCustom || null,
                    rulesInstructions: promptConfig.rulesCustom || null
                };
            } else {
                // Handle text/markdown files - use AI to parse
                const { parseCustomInstructions } = await import('./promptBuilder.js');
                parsedInstructions = await parseCustomInstructions(fileContent);
            }
            
            // Update UI with parsed instructions
            if (parsedInstructions.judgeInstructions && dom.judgeCustom) {
                dom.judgeCustom.value = parsedInstructions.judgeInstructions;
            }
            if (parsedInstructions.counselInstructions && dom.counselCustom) {
                dom.counselCustom.value = parsedInstructions.counselInstructions;
            }
            if (parsedInstructions.rulesInstructions && dom.rulesCustom) {
                dom.rulesCustom.value = parsedInstructions.rulesInstructions;
            }
            
            // Update state
            setState({
                judgeCustom: parsedInstructions.judgeInstructions || getState().judgeCustom || '',
                counselCustom: parsedInstructions.counselInstructions || getState().counselCustom || '',
                rulesCustom: parsedInstructions.rulesInstructions || getState().rulesCustom || ''
            });
            
            await resetChat();
            
            // Show success message
            const roleCount = [parsedInstructions.judgeInstructions, parsedInstructions.counselInstructions, parsedInstructions.rulesInstructions].filter(Boolean).length;
            console.log(`Successfully parsed instructions for ${roleCount} role(s)`);
            
        } catch (error) {
            console.error('Error processing prompt file:', error);
            displayError('Unable to process the uploaded file. Please check the format and try again.');
        }
    };
    reader.readAsText(file);
}

function handleExportPrompts() {
    const state = getState();
    const promptConfig = {
        judgeCustom: state.judgeCustom || '',
        counselCustom: state.counselCustom || '',
        rulesCustom: state.rulesCustom || ''
    };
    
    const blob = new Blob([JSON.stringify(promptConfig, null, 2)], 
                         { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = 'deposition-prompts.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function handleFileLoad(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
        try {
            const caseData = JSON.parse(event.target.result);
            // Basic validation
            if (!caseData || (!caseData.witnesses && !caseData.witnessProfile)) {
                 throw new Error("Invalid case file structure. Must contain a 'witnesses' array or witness profile.");
            }
            
            // Clear existing documents before loading new case
            documentService.clearAllDocuments();
            
            await loadWitnessData(caseData);
            if (dom.scenarioSelector) dom.scenarioSelector.value = "-1";
            
            console.log('Loaded custom case file and cleared previous documents');
        } catch (err) {
            const errorInfo = handleError(err, 'handleFileLoad');
            displayError(`Failed to load file: ${errorInfo.userMessage}`);
        }
    };
    reader.readAsText(file);
}

async function handleScenarioChange(e) {
    const index = parseInt(e.target.value, 10);
    if (index >= 0) {
        try {
            // Map scenario indices to JSON scenario IDs
            const scenarioMap = {
                0: 'homicide-eyewitness',        // John Sterling
                1: 'domestic-violence-neighbor', // Margaret Chen  
                2: 'hr-manager-discrimination',  // Susan Miller
                3: 'vp-sexual-harassment',       // Jeffrey Hinton
                4: 'surgeon-breach-contract'     // Dr. McGee
            };
            
            const scenarioId = scenarioMap[index];
            
            if (scenarioId) {
                // Use new JSON system for all scenarios
                console.log(`Loading ${scenarioId} using new JSON system...`);
                
                // Clear existing documents before loading new scenario
                documentService.clearAllDocuments();
                
                // Load complete scenario using new dataLoader  
                console.log(`About to load scenario: ${scenarioId}`);
                const scenarioData = await dataLoader.loadCompleteScenario(scenarioId);
                console.log('Loaded scenario data:', scenarioData);
                console.log('Documents loaded:', scenarioData.documents);
                
                // Convert witness to legacy format for compatibility
                const legacyWitness = dataLoader.convertWitnessToLegacyFormat(scenarioData.witness);
                await loadWitnessData(legacyWitness);
                
                // Convert and load documents
                console.log('About to convert documents...', scenarioData.documents);
                const documentsForService = dataLoader.convertDocumentsToServiceFormat(scenarioData.documents);
                console.log('Converted documents for service:', documentsForService);
                
                // Load documents into documentService
                documentsForService.forEach(doc => {
                    // Ensure we don't exceed document limits
                    documentService.cleanupOldDocumentsIfNeeded();
                    
                    // Add document to registry using the same pattern as loadPreBuiltDocuments
                    documentService.documentRegistry.set(doc.id, doc);
                    
                    console.log(`Loaded document: ${doc.fileName} (Exhibit ${doc.exhibitLetter})`);
                });
                
                // Update the document UI to show loaded documents
                updateDocumentUI();
                
                console.log(`Successfully loaded ${scenarioId} from new JSON format`);
            } else {
                // Fallback to old base64 system if scenario not in map
                const encodedData = PRE_BUILT_SCENARIOS[index];
                const decodedData = atob(encodedData);
                const jsonData = JSON.parse(decodedData);
                
                // Clear existing documents before loading new scenario
                documentService.clearAllDocuments();
                
                await loadWitnessData(jsonData);
                console.log(`Switched to legacy scenario ${index} and cleared previous documents`);
            }
            
            if (dom.fileLoaderInput) dom.fileLoaderInput.value = ""; // Clear file input
            
        } catch (err) {
            const errorInfo = handleError(err, 'handleScenarioChange');
            displayError(`Failed to load scenario: ${errorInfo.userMessage}`);
            console.error('Scenario loading error:', err);
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

    // Check for document references and get context
    const documentContexts = getDocumentContextForQuestion(userInput);

    // UI updates
    setState({ isLoading: true });
    clearChatInput();
    renderChatMessages();
    updateUI();
    updateDocumentUI(); // Update document UI to show active documents

    try {
        // Business logic delegated to service
        const result = await depositionService.sendMessage(
            userInput,
            witness,
            messages,
            {
                isOocMode,
                isJudgePresent,
                apiConfig: { providerId, apiKey, model },
                customPrompts: {
                    judgeCustom: getState().judgeCustom,
                    counselCustom: getState().counselCustom,
                    rulesCustom: getState().rulesCustom
                },
                documentContexts // Pass document contexts to service
            }
        );
        
        // Handle results - update state
        setState({ 
            messages: [...getState().messages, result.userMessage, result.assistantMessage]
        });
        updateCost(result.usage);
        
        // Clear active document contexts after response
        clearActiveDocumentContexts();
        
    } catch (error) {
        const errorInfo = handleError(error, 'handleSendMessage');
        displayError(errorInfo.userMessage);
        // Clear active contexts on error too
        clearActiveDocumentContexts();
    } finally {
        setState({ isLoading: false });
        renderChatMessages();
        updateUI();
        updateDocumentUI();
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

async function loadWitnessData(data) {
    const witnesses = Array.isArray(data.witnesses) ? data.witnesses : [data];
    setState({
        caseData: data,
        witnesses: witnesses,
        activeWitnessIndex: 0
    });
    
    // Load pre-built documents if available (now async)
    // Skip auto-loading for new JSON scenarios - they handle documents differently
    const witness = witnesses[0];
    const newJsonCases = [
        'Homicide-PKM-2024-031',
        'Civil-DV-2024-047', 
        'Clark v. Ener-SzE Solutions',
        'Martinez v. Hinton - Civil Case No. 2023-CV-4821',
        'Hawkins v. McGee - Civil Case No. 2025-CV-3847'
    ];
    
    if (witness && witness.witnessProfile?.caseReference && 
        !newJsonCases.includes(witness.witnessProfile.caseReference)) {
        try {
            await documentService.loadPreBuiltDocuments(witness.witnessProfile.caseReference);
            console.log(`Loaded case documents for: ${witness.witnessProfile.caseReference}`);
        } catch (error) {
            console.warn('Failed to load case documents:', error);
        }
    } else if (witness && newJsonCases.includes(witness.witnessProfile?.caseReference)) {
        console.log(`Skipping old document system for new JSON case: ${witness.witnessProfile.caseReference}`);
    }
    
    renderWitnessOptions();
    await resetChat();
    updateDocumentUI(); // Update document UI to show loaded documents
}

async function resetChat() {
    const witness = getActiveWitness();
    const { isJudgePresent } = getState();
    
    // Use service to build system prompt if witness exists
    let systemPrompt = null;
    if (witness) {
        systemPrompt = await depositionService.buildSystemPrompt(witness, [], false, isJudgePresent);
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
    // First populate the UI so dropdowns have options
    initializeUI();
    initializeDocumentUI();
    renderPresetOptions();
    
    // Then set initial state from localStorage if available
    const initialProviderId = dom.providerSelect.value || 'openai';
    const storedKey = localStorage.getItem(`llm_${initialProviderId}_key`) || '';
    const deobfuscatedKey = deobfuscateApiKey(storedKey);
    
    setState({
        providerId: initialProviderId,
        apiKey: deobfuscatedKey,
        model: PROVIDERS_CONFIG[initialProviderId]?.defaultModel || ''
    });

    // Populate UI with initial state
    if (dom.apiKeyInput) dom.apiKeyInput.value = getState().apiKey;
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
    // Also add click handler to the checkbox container for better UX
    dom.judgeModeCheckbox?.parentElement?.addEventListener('click', (e) => {
        if (e.target !== dom.judgeModeCheckbox) {
            dom.judgeModeCheckbox.click();
        }
    });
    dom.fileLoaderInput?.addEventListener('change', handleFileLoad);
    dom.scenarioSelector?.addEventListener('change', handleScenarioChange);
    dom.witnessSelector?.addEventListener('change', async (e) => {
        setState({ activeWitnessIndex: Number(e.target.value) });
        await resetChat();
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
    
    // Advanced prompt settings event listeners
    dom.advancedToggle?.addEventListener('click', handleAdvancedToggle);
    
    // Preset change handlers
    dom.judgePreset?.addEventListener('change', () => 
        handlePresetChange('judge', dom.judgePreset, dom.judgeCustom));
    dom.counselPreset?.addEventListener('change', () => 
        handlePresetChange('opposingCounsel', dom.counselPreset, dom.counselCustom));
    dom.rulesPreset?.addEventListener('change', () => 
        handlePresetChange('rules', dom.rulesPreset, dom.rulesCustom));
    
    // Custom prompt change handlers
    dom.judgeCustom?.addEventListener('change', () => 
        handleCustomPromptChange('judge', dom.judgeCustom));
    dom.counselCustom?.addEventListener('change', () => 
        handleCustomPromptChange('counsel', dom.counselCustom));
    dom.rulesCustom?.addEventListener('change', () => 
        handleCustomPromptChange('rules', dom.rulesCustom));
    
    // Import/export handlers
    dom.promptFile?.addEventListener('change', handlePromptFileUpload);
    dom.exportPrompts?.addEventListener('click', handleExportPrompts);

    console.log("Deposition Trainer Initialized.");
}


// Start the application
document.addEventListener('DOMContentLoaded', initialize);
