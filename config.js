export const DOM_ELEMENT_IDS = {
    providerSelect: 'provider',
    apiKeyInput: 'apiKey',
    modelSelect: 'model',
    judgeModeCheckbox: 'judgeMode',
    fileLoaderInput: 'fileLoader',
    scenarioSelector: 'scenarioSelector',
    witnessSelectorCard: 'witnessSelectorCard',
    witnessSelector: 'witnessSelector',
    intelCard: 'intelCard',
    summaryDetailSlider: 'summaryDetailSlider',
    getSummaryButton: 'getSummaryButton',
    getCaseSummaryButton: 'getCaseSummaryButton',
    chatTitle: 'chat-title',
    chatHistory: 'chat-history',
    modeToggleCheckbox: 'modeToggleCheckbox',
    chatInput: 'chatInput',
    sendButton: 'sendButton',
    saveTranscriptButton: 'saveTranscriptButton',
    totalTokensSpan: 'totalTokens',
    estimatedCostSpan: 'estimatedCost',
    ollamaSetupInfo: 'ollamaSetupInfo',
    testOllamaConnection: 'testOllamaConnection'
};

export const PROVIDERS_CONFIG = {
    openai: {
    label: "OpenAI",
    models: [
        { name: "GPT-4.1 mini", pricing: { inputPerMillionTokens: 0.40, outputPerMillionTokens: 1.60 } },
        { name: "GPT-4.1 nano", pricing: { inputPerMillionTokens: 0.10, outputPerMillionTokens: 0.40 } },
        { name: "OpenAI o4-mini", pricing: { inputPerMillionTokens: 1.10, outputPerMillionTokens: 4.40 } },
        { name: "GPT-4.1", pricing: { inputPerMillionTokens: 2.00, outputPerMillionTokens: 8.00 } },
        { name: "OpenAI o3", pricing: { inputPerMillionTokens: 2.00, outputPerMillionTokens: 8.00 } }
    ],
    defaultModel: "GPT-4.1 mini",
},

gemini: {
    label: "Google Gemini",
    models: [
        { name: "gemini-2.5-flash", pricing: { inputPerMillionTokens: 0.35, outputPerMillionTokens: 0.70 } },
        { name: "gemini-2.5-pro (Most expensive)", pricing: { inputPerMillionTokens: 3.50, outputPerMillionTokens: 10.50 } }
    ],
    defaultModel: "gemini-2.5-flash",
},
    ollama: {
        label: "Ollama (Local - Privacy Mode)",
        requiresSetup: true,
        models: [
            { name: "llama3:latest", pricing: { inputPerMillionTokens: 0, outputPerMillionTokens: 0 } },
            { name: "llama3.1:8b", pricing: { inputPerMillionTokens: 0, outputPerMillionTokens: 0 } },
            { name: "mistral:latest", pricing: { inputPerMillionTokens: 0, outputPerMillionTokens: 0 } },
            { name: "gemma:latest", pricing: { inputPerMillionTokens: 0, outputPerMillionTokens: 0 } }
        ],
        defaultModel: "llama3:latest",
    },
};
