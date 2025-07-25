// main.js

import { PROVIDERS_CONFIG } from './config.js';
import { PRE_BUILT_SCENARIOS } from './scenarios.js';
import { getState, setState, getActiveWitness } from './state.js';
import { callLlmApi, testOllamaConnection } from './api.js';
import { dom, initializeUI, renderModelOptions, renderChatMessages, renderCost, renderWitnessOptions, updateUI, displayError } from './ui.js';
//import { buildDepositionPrompt, buildOocPrompt, buildSummaryPrompt, buildCaseSummaryPrompt } from './promptBuilder.js'; // We will create this file next
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
            console.error("File Load Error:", err);
            displayError(`Failed to load file. ${err.message}`);
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
            console.error("Scenario Load Error:", err);
            displayError("Failed to load pre-built scenario. It might be corrupted.");
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
        displayError(e.message);
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

    const { isOocMode, messages, isJudgePresent } = getState();
    const witness = getActiveWitness();

    const userMessage = { role: 'user', content: userInput, isOoc: isOocMode };
    setState({ isLoading: true, messages: [...messages, userMessage] });
    
    renderChatMessages();
    updateUI();
    dom.chatInput.value = '';
    dom.chatInput.style.height = 'auto'; // Reset height

    const systemPrompt = isOocMode 
        ? buildOocPrompt(witness, messages)
        : buildDepositionPrompt(witness, isJudgePresent);
    
    const messagesForApi = [systemPrompt, ...getState().messages.slice(1)];

    try {
        const { providerId, apiKey, model } = getState();
        const { message, usage } = await callLlmApi(providerId, { apiKey, model, messages: messagesForApi });
        message.isOoc = isOocMode;
        
        setState({ messages: [...getState().messages, message] });
        updateCost(usage);
    } catch (e) {
        console.error("API Error:", e);
        displayError(e.message);
    } finally {
        setState({ isLoading: false });
        renderChatMessages();
        updateUI();
        dom.chatInput.focus();
    }
}

async function handleGetSummary(isCaseSummary = false) {
    if (getState().isLoading) return;

    setState({ isLoading: true });
    renderChatMessages();
    updateUI();

    const witness = getActiveWitness();
    const detailLevel = dom.summaryDetailSlider.value;
    
    const summaryPrompt = isCaseSummary
        ? buildCaseSummaryPrompt(witness, detailLevel)
        : buildSummaryPrompt(witness, detailLevel);
    
    try {
        const { providerId, apiKey, model } = getState();
        // Summaries are meta-operations, so we can use a simple message array
        const { message, usage } = await callLlmApi(providerId, { apiKey, model, messages: [summaryPrompt] });
        message.isOoc = true; // Summaries are always out-of-character

        setState({ messages: [...getState().messages, message] });
        updateCost(usage);
    } catch(e) {
        console.error("Summary API Error:", e);
        displayError(e.message);
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
    const systemPrompt = witness ? buildDepositionPrompt(witness, isJudgePresent) : null;
    
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
            // This function is called by speech.js when recording starts/stops
            updateRecordButtonState(isRecording, getActiveWitness() !== null);
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


// Create one more file, `promptBuilder.js`, for the long prompt-building functions.
// For now, let's put them here temporarily.
// Ideally, these would go in `promptBuilder.js` and be imported above.

function buildDepositionPrompt(w, j) {
    if (!w) return { role: "system", content: "Error: No witness data." };
    const wt = JSON.stringify(w, null, 2);
    const ji = j ? `A judge IS present. After an objection, you MUST rule on it as THE JUDGE (e.g., "Sustained." or "Overruled."). If overruled, THE WITNESS must answer.` : `A judge is NOT present. You must NOT act as a judge. After a form objection, THE WITNESS should still answer.`;
    const dli = `**Role of OPPOSING COUNSEL (Defending Lawyer):** Your primary goal is to protect your client and the record.\n1.  **Form Objections:** For questions that are leading, compound, or assume facts, state the objection for the record (e.g., "Objection, form."), but then allow the witness to answer.\n2.  **Privilege Objections (CRITICAL):** If a question asks about communications between the witness and their attorney, you MUST object and instruct the witness not to answer. Format: "Objection, attorney-client privilege. I'm instructing the witness not to answer." THE WITNESS must then refuse to answer. This is the main reason to instruct a witness not to answer.`;
    const perjuryRisk = w.witnessMotivations?.perjuryRisk || 0;
    const willCommitPerjury = Math.random() < perjuryRisk;
    let truthfulnessInstruction;
    if (willCommitPerjury) {
        truthfulnessInstruction = `**Witness Truthfulness (This Session):** You have decided to lie to protect your secret. You will commit perjury, deny facts, and invent alternative explanations. For routine, non-threatening questions, answer normally. Your dishonesty should only activate when questioning approaches the information you need to conceal.`;
    } else {
        truthfulnessInstruction = `**Witness Truthfulness (This Session):** You have decided you must not lie, but you must still protect your secret.\n- For routine, non-threatening questions, be cooperative and answer directly.\n- When questioning approaches the embarrassing or secret information you must conceal, your strategy is to become evasive, forgetful, or provide minimal, technically true answers.\n- If asked a direct, inescapable question about the secret, you must answer it truthfully, however reluctantly.`;
    }
    return {
        role: "system",
        content: `You are an AI performing roles in a legal deposition.\n\n**Roles & Rules:**\n1.  **THE WITNESS:** Your primary role, defined by the JSON below. Stay in character.\n2.  **OPPOSING COUNSEL:** You must also act as the witness's lawyer. ${dli}\n3.  **THE JUDGE:** ${ji}\n\n**Execution:** Never mention you are an AI. You ARE the people you are portraying. Uphold all concealment motivations from the JSON according to the specific truthfulness rule for this session, provided below.\n\n${truthfulnessInstruction}\n\n**Witness Dossier:**\n\`\`\`json\n${wt}\n\`\`\``
    };
}
function buildOocPrompt(w, h) {
    const ht = h.slice(1).map(m => `${m.role === 'user' ? 'Examiner' : (m.isOoc ? 'Coach' : 'Witness')}: ${m.content}`).join('\n');
    return {
        role: "system",
        content: `You are an expert deposition coach AI. The user is in "Coach Mode" and needs out-of-character help. Your persona is a helpful law professor.\n\n**CRITICAL:** You must BREAK CHARACTER from the witness/lawyer persona. DO NOT answer in character.\n\nAnalyze the user's latest question based on the full deposition history provided below. Provide a helpful, meta-level response. Give hints, suggest better questions, or explain legal concepts.\n\n**Deposition History:**\n${ht}\n\n**Witness Dossier for Context:**\n\`\`\`json\n${JSON.stringify(w, null, 2)}\n\`\`\``
    };
}
function buildSummaryPrompt(w, d) {
    const dm = { 1: "a brief one-paragraph summary", 2: "a moderate summary with bullet points", 3: "a detailed summary" };
    const di = dm[d];
    const pi = {
        "Witness Name": w?.name || w?.witnessBackground?.personalDetails?.fullName,
        "Basic Details": { Age: w?.witnessBackground?.personalDetails?.age, Occupation: w?.witnessBackground?.personalDetails?.occupation, Residence: w?.witnessBackground?.personalDetails?.residence },
        "Professional Reputation": w?.witnessBackground?.professionalLife?.reputation,
        "Official Statement Summary": w?.fullWitnessInformation?.officialStatementSummary
    };
    Object.keys(pi).forEach(k => (pi[k] === undefined || pi[k] === null) && delete pi[k]);
    if (pi["Basic Details"]) { Object.keys(pi["Basic Details"]).forEach(k => (pi["Basic Details"][k] === undefined || pi["Basic Details"][k] === null) && delete pi["Basic Details"][k]); }
    return {
        role: "user",
        content: `You are a legal assistant providing a pre-deposition briefing. Based ONLY on the following pre-vetted information, provide ${di}. Do not infer or add any information not present below. Do not provide analysis or advice.\n\n**Vetted Witness Information:**\n\`\`\`json\n${JSON.stringify(pi, null, 2)}\n\`\`\``
    };
}
function buildCaseSummaryPrompt(w, d) {
    const dm = { 1: "a brief one-paragraph summary", 2: "a moderate summary with bullet points", 3: "a detailed, multi-paragraph summary" };
    const di = dm[d];
    const publicInfo = {
        witnessProfile: w.witnessProfile,
        witnessBackground: w.witnessBackground,
        fullWitnessInformation: {
            officialStatementSummary: w.fullWitnessInformation?.officialStatementSummary,
            officialReasonForTermination: w.fullWitnessInformation?.officialReasonForTermination
        }
    };
    if (!publicInfo.fullWitnessInformation.officialReasonForTermination) { delete publicInfo.fullWitnessInformation.officialReasonForTermination; }
    const wt = JSON.stringify(publicInfo, null, 2);
    return {
        role: "user",
        content: `You are a senior legal analyst. Your task is to provide a plausible case summary based on the provided witness dossier. The dossier contains information about ONE witness in a larger, unstated legal case.\n\nYour analysis must:\n1.  **Infer the Legal Context:** Based on the witness's role and official statements, determine the most likely type of legal case this deposition is for (e.g., "age discrimination lawsuit," "personal injury claim," "homicide prosecution").\n2.  **Synthesize a Narrative:** Create a brief narrative for the case. Who is likely suing whom? What is the central legal issue at stake?\n3.  **Use Only Provided Facts:** Base your summary ONLY on the information in the dossier. CRITICALLY, you must not mention the witness's internal thoughts, strategies, or motivations, as you have not been provided with them.\n4.  **Acknowledge Inference:** Frame your response as a plausible inference, not as established fact. For example, start with "This deposition appears to be part of..." or "The likely legal context for this witness is..."\n5.  **Adhere to Detail Level:** Provide ${di}.\n\n**Publicly Available Witness Information:**\n\`\`\`json\n${wt}\n\`\`\``
    };
}

// Start the application
document.addEventListener('DOMContentLoaded', initialize);
