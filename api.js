// api.js

import { PROVIDERS_CONFIG } from './config.js';

// --- Private API Functions ---

async function callOpenAI({ apiKey, model, messages }) {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({ model, messages }),
    });
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMsg = errorData?.error?.message || response.statusText;
        throw new Error(`OpenAI API Error: [${response.status}] ${errorMsg}`);
    }
    const data = await response.json();
    return {
        message: data.choices[0].message,
        usage: { inputTokens: data.usage.prompt_tokens, outputTokens: data.usage.completion_tokens }
    };
}

async function callGemini({ apiKey, model, messages }) {
    const formattedMessages = messages.filter(m => m.role !== 'system').map(m => ({
        role: m.role === 'assistant' ? 'model' : m.role,
        parts: [{ text: m.content }]
    }));
    const systemInstruction = messages.find(m => m.role === 'system');
    const body = {
        contents: formattedMessages,
        ...(systemInstruction && { systemInstruction: { parts: [{ text: systemInstruction.content }] } })
    };

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMsg = errorData?.error?.message || `API request failed with status ${response.status}.`;
        throw new Error(`Google Gemini API Error: ${errorMsg}`);
    }

    const data = await response.json();

    if (!data.candidates || data.candidates.length === 0 || !data.candidates[0].content) {
        let reason = "The model returned an empty or invalid response.";
        if (data.promptFeedback?.blockReason) {
            reason = `Content blocked by safety settings: ${data.promptFeedback.blockReason}.`;
        } else if (data.candidates?.[0]?.finishReason) {
            reason = `Generation stopped. Reason: ${data.candidates[0].finishReason}.`;
        }
        throw new Error(reason);
    }

    const usage = data.usageMetadata || { promptTokenCount: 0, candidatesTokenCount: 0 };
    return {
        message: { role: 'assistant', content: data.candidates[0].content.parts[0].text },
        usage: { inputTokens: usage.promptTokenCount, outputTokens: usage.candidatesTokenCount }
    };
}

async function callOllama({ model, messages }) {
    try {
        const response = await fetch("http://localhost:11434/v1/chat/completions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ model, messages, stream: false }),
        });
        if (!response.ok) {
            throw new Error(`Server error (${response.status}): ${response.statusText}. Is Ollama running?`);
        }
        const data = await response.json();
        return {
            message: data.choices[0].message,
            usage: { inputTokens: data.usage?.prompt_tokens || 0, outputTokens: data.usage?.completion_tokens || 0 }
        };
    } catch (e) {
        if (e instanceof TypeError) { // Catches network errors
            throw new Error("Cannot connect to Ollama. Please ensure it is installed and running on localhost:11434.");
        }
        throw e; // Re-throw other errors
    }
}

// --- Public API Interface ---

const apiImplementations = {
    openai: callOpenAI,
    gemini: callGemini,
    ollama: callOllama,
};

/**
 * Makes a chat completion request to the specified provider.
 * @param {string} providerId - The ID of the provider (e.g., 'openai').
 * @param {object} params - The parameters for the API call ({ apiKey, model, messages }).
 * @returns {Promise<object>} A promise that resolves to the API response ({ message, usage }).
 */
export async function callLlmApi(providerId, params) {
    if (!apiImplementations[providerId]) {
        throw new Error(`Provider "${providerId}" is not implemented.`);
    }
    // For Ollama, the API key is not needed, so we provide a placeholder.
    if (providerId === 'ollama') {
        params.apiKey = 'ollama'; 
    }
    if (!params.apiKey) {
        throw new Error("API Key is missing. Please enter your key in the settings.");
    }
    return apiImplementations[providerId](params);
}

/**
 * Tests the connection to the local Ollama server.
 * @returns {Promise<number>} A promise that resolves with the number of models found.
 */
export async function testOllamaConnection() {
    const response = await fetch("http://localhost:11434/api/tags");
    if (!response.ok) {
        throw new Error('Ollama server responded with an error.');
    }
    const data = await response.json();
    return data.models?.length || 0;
}
