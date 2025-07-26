// api.js

import { PROVIDERS_CONFIG } from './config.js';
import { 
    APIError, 
    ConfigurationError, 
    ErrorCodes, 
    withRetry 
} from './utils/errorHandler.js';

// --- Private API Functions ---

async function callOpenAI({ apiKey, model, messages }) {
    if (!apiKey) {
        throw new ConfigurationError(
            'OpenAI API key is required',
            'apiKey'
        ).markConfidential();
    }
    
    try {
        const response = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
            body: JSON.stringify({ model, messages }),
        });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            const errorMsg = errorData?.error?.message || response.statusText;
            
            // Categorize different types of API errors
            if (response.status === 401) {
                throw new APIError(
                    'Invalid OpenAI API key',
                    'openai',
                    401
                ).markConfidential();
            } else if (response.status === 429) {
                throw new APIError(
                    'OpenAI rate limit exceeded',
                    'openai',
                    429,
                    null
                );
            } else if (response.status >= 500) {
                throw new APIError(
                    'OpenAI server error',
                    'openai',
                    response.status
                );
            } else {
                throw new APIError(
                    `OpenAI API error: ${errorMsg}`,
                    'openai',
                    response.status
                );
            }
        }
        
        const data = await response.json();
        
        if (!data.choices || data.choices.length === 0) {
            throw new APIError(
                'Invalid response from OpenAI: no choices returned',
                'openai'
            );
        }
        
        return {
            message: data.choices[0].message,
            usage: { 
                inputTokens: data.usage?.prompt_tokens || 0, 
                outputTokens: data.usage?.completion_tokens || 0 
            }
        };
    } catch (error) {
        if (error instanceof APIError || error instanceof ConfigurationError) {
            throw error;
        }
        // Handle network errors
        throw new APIError(
            'Network error connecting to OpenAI',
            'openai',
            null,
            error
        );
    }
}

async function callGemini({ apiKey, model, messages }) {
    if (!apiKey) {
        throw new ConfigurationError(
            'Google Gemini API key is required',
            'apiKey'
        ).markConfidential();
    }
    
    try {
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
            
            // Categorize different types of API errors
            if (response.status === 401 || response.status === 403) {
                throw new APIError(
                    'Invalid Google Gemini API key or access denied',
                    'gemini',
                    response.status
                ).markConfidential();
            } else if (response.status === 429) {
                throw new APIError(
                    'Google Gemini rate limit exceeded',
                    'gemini',
                    429
                );
            } else if (response.status >= 500) {
                throw new APIError(
                    'Google Gemini server error',
                    'gemini',
                    response.status
                );
            } else {
                throw new APIError(
                    `Google Gemini API error: ${errorMsg}`,
                    'gemini',
                    response.status
                );
            }
        }

        const data = await response.json();

        if (!data.candidates || data.candidates.length === 0 || !data.candidates[0].content) {
            let reason = "The model returned an empty or invalid response.";
            if (data.promptFeedback?.blockReason) {
                reason = `Content blocked by safety settings: ${data.promptFeedback.blockReason}.`;
            } else if (data.candidates?.[0]?.finishReason) {
                reason = `Generation stopped. Reason: ${data.candidates[0].finishReason}.`;
            }
            throw new APIError(reason, 'gemini');
        }

        const usage = data.usageMetadata || { promptTokenCount: 0, candidatesTokenCount: 0 };
        return {
            message: { role: 'assistant', content: data.candidates[0].content.parts[0].text },
            usage: { inputTokens: usage.promptTokenCount, outputTokens: usage.candidatesTokenCount }
        };
    } catch (error) {
        if (error instanceof APIError || error instanceof ConfigurationError) {
            throw error;
        }
        // Handle network errors
        throw new APIError(
            'Network error connecting to Google Gemini',
            'gemini',
            null,
            error
        );
    }
}

async function callOllama({ model, messages }) {
    try {
        const response = await fetch("http://localhost:11434/v1/chat/completions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ model, messages, stream: false }),
        });
        
        if (!response.ok) {
            if (response.status === 404) {
                throw new APIError(
                    `Model '${model}' not found in Ollama. Please pull the model first.`,
                    'ollama',
                    404
                );
            } else {
                throw new APIError(
                    `Ollama server error (${response.status}): ${response.statusText}`,
                    'ollama',
                    response.status
                );
            }
        }
        
        const data = await response.json();
        
        if (!data.choices || data.choices.length === 0) {
            throw new APIError(
                'Invalid response from Ollama: no choices returned',
                'ollama'
            );
        }
        
        return {
            message: data.choices[0].message,
            usage: { 
                inputTokens: data.usage?.prompt_tokens || 0, 
                outputTokens: data.usage?.completion_tokens || 0 
            }
        };
    } catch (error) {
        if (error instanceof APIError) {
            throw error;
        }
        
        // Handle network errors specifically for Ollama
        if (error instanceof TypeError || error.name === 'NetworkError') {
            throw new APIError(
                "Cannot connect to Ollama. Please ensure it is installed and running on localhost:11434.",
                'ollama',
                null,
                error
            );
        }
        
        throw new APIError(
            'Unexpected error connecting to Ollama',
            'ollama',
            null,
            error
        );
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
    // Validate provider
    if (!apiImplementations[providerId]) {
        throw new ConfigurationError(
            `Provider "${providerId}" is not supported`,
            'providerId'
        );
    }
    
    // Validate provider configuration
    if (!PROVIDERS_CONFIG[providerId]) {
        throw new ConfigurationError(
            `Provider "${providerId}" is not configured`,
            'providerId'
        );
    }
    
    // Validate model
    const providerConfig = PROVIDERS_CONFIG[providerId];
    if (!providerConfig.models.some(m => m.name === params.model)) {
        throw new ConfigurationError(
            `Model "${params.model}" is not available for provider "${providerId}"`,
            'model'
        );
    }
    
    // For Ollama, the API key is not needed
    if (providerId === 'ollama') {
        params.apiKey = 'ollama'; 
    } else if (!params.apiKey) {
        throw new ConfigurationError(
            'API key is required for this provider',
            'apiKey'
        ).markConfidential();
    }
    
    // Validate messages
    if (!params.messages || !Array.isArray(params.messages) || params.messages.length === 0) {
        throw new ConfigurationError(
            'Messages array is required and cannot be empty',
            'messages'
        );
    }
    
    // Use retry mechanism for API calls
    return await withRetry(
        () => apiImplementations[providerId](params),
        3, // maxRetries
        1000, // delayMs
        2, // backoffMultiplier
        [ErrorCodes.NETWORK_ERROR, ErrorCodes.RATE_LIMIT_ERROR] // retryableErrors
    );
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
