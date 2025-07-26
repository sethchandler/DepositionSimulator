// services/depositionService.js

import { buildDepositionPrompt, buildOocPrompt, buildSummaryPrompt, buildCaseSummaryPrompt } from '../promptBuilder.js';
import { callLlmApi } from '../api.js';

/**
 * Domain service encapsulating all deposition-related business logic.
 * This service handles the core business rules and workflows without dealing with UI or global state.
 */
export class DepositionService {
    
    /**
     * Sends a message in the deposition and gets the AI response.
     * @param {string} userInput - The user's question or statement
     * @param {Object} witness - The witness object containing profile and motivations
     * @param {Array} messageHistory - Previous messages in the conversation
     * @param {Object} config - Configuration object
     * @param {boolean} config.isOocMode - Whether in out-of-character coaching mode
     * @param {boolean} config.isJudgePresent - Whether a judge is present
     * @param {Object} config.apiConfig - API configuration (providerId, apiKey, model)
     * @returns {Promise<Object>} Result containing userMessage, assistantMessage, and usage
     */
    async sendMessage(userInput, witness, messageHistory, config) {
        if (!userInput || !userInput.trim()) {
            throw new Error('User input is required');
        }
        
        if (!witness) {
            throw new Error('Witness data is required');
        }
        
        // Create user message
        const userMessage = this.createUserMessage(userInput, config.isOocMode);
        
        // Build system prompt based on mode
        const systemPrompt = this.buildSystemPrompt(
            witness, 
            messageHistory, 
            config.isOocMode, 
            config.isJudgePresent
        );
        
        // Prepare messages for API
        const messagesForApi = this.prepareMessagesForApi(systemPrompt, messageHistory, userMessage);
        
        // Call LLM API
        const { message, usage } = await callLlmApi(config.apiConfig.providerId, {
            apiKey: config.apiConfig.apiKey,
            model: config.apiConfig.model,
            messages: messagesForApi
        });
        
        // Mark message with mode
        message.isOoc = config.isOocMode;
        
        return {
            userMessage,
            assistantMessage: message,
            usage
        };
    }
    
    /**
     * Generates a witness summary based on publicly available information.
     * @param {Object} witness - The witness object
     * @param {number} detailLevel - Detail level (1-3)
     * @param {Object} apiConfig - API configuration (providerId, apiKey, model)
     * @returns {Promise<Object>} Result containing the summary message and usage
     */
    async generateWitnessSummary(witness, detailLevel, apiConfig) {
        if (!witness) {
            throw new Error('Witness data is required');
        }
        
        const summaryPrompt = buildSummaryPrompt(witness, detailLevel);
        
        const { message, usage } = await callLlmApi(apiConfig.providerId, {
            apiKey: apiConfig.apiKey,
            model: apiConfig.model,
            messages: [summaryPrompt]
        });
        
        // Summaries are always out-of-character
        message.isOoc = true;
        
        return {
            message,
            usage
        };
    }
    
    /**
     * Generates a case summary based on witness information.
     * @param {Object} witness - The witness object
     * @param {number} detailLevel - Detail level (1-3)
     * @param {Object} apiConfig - API configuration (providerId, apiKey, model)
     * @returns {Promise<Object>} Result containing the summary message and usage
     */
    async generateCaseSummary(witness, detailLevel, apiConfig) {
        if (!witness) {
            throw new Error('Witness data is required');
        }
        
        const caseSummaryPrompt = buildCaseSummaryPrompt(witness, detailLevel);
        
        const { message, usage } = await callLlmApi(apiConfig.providerId, {
            apiKey: apiConfig.apiKey,
            model: apiConfig.model,
            messages: [caseSummaryPrompt]
        });
        
        // Case summaries are always out-of-character
        message.isOoc = true;
        
        return {
            message,
            usage
        };
    }
    
    /**
     * Creates a properly formatted user message.
     * @param {string} content - The message content
     * @param {boolean} isOoc - Whether the message is out-of-character
     * @returns {Object} Formatted user message
     */
    createUserMessage(content, isOoc = false) {
        return {
            role: 'user',
            content: content.trim(),
            isOoc,
            timestamp: new Date().toISOString()
        };
    }
    
    /**
     * Builds the appropriate system prompt based on the current mode.
     * @param {Object} witness - The witness object
     * @param {Array} messageHistory - Previous messages for context
     * @param {boolean} isOocMode - Whether in coaching mode
     * @param {boolean} isJudgePresent - Whether a judge is present
     * @returns {Object} System prompt message
     */
    buildSystemPrompt(witness, messageHistory, isOocMode, isJudgePresent) {
        if (isOocMode) {
            return buildOocPrompt(witness, messageHistory);
        } else {
            return buildDepositionPrompt(witness, isJudgePresent);
        }
    }
    
    /**
     * Prepares the message array for the API call.
     * @param {Object} systemPrompt - The system prompt message
     * @param {Array} messageHistory - Previous messages
     * @param {Object} userMessage - The new user message
     * @returns {Array} Array of messages for the API
     */
    prepareMessagesForApi(systemPrompt, messageHistory, userMessage) {
        // For new conversations, start with system prompt + user message
        if (messageHistory.length <= 1) {
            return [systemPrompt, userMessage];
        }
        
        // For ongoing conversations, include relevant history
        return [systemPrompt, ...messageHistory.slice(1), userMessage];
    }
    
    /**
     * Validates that all required configuration is present.
     * @param {Object} apiConfig - API configuration to validate
     * @throws {Error} If configuration is invalid
     */
    validateApiConfig(apiConfig) {
        if (!apiConfig) {
            throw new Error('API configuration is required');
        }
        
        const { providerId, model } = apiConfig;
        
        if (!providerId) {
            throw new Error('Provider ID is required');
        }
        
        if (!model) {
            throw new Error('Model is required');
        }
        
        // API key validation (except for Ollama)
        if (providerId !== 'ollama' && !apiConfig.apiKey) {
            throw new Error('API key is required for this provider');
        }
    }
}

// Export a singleton instance for convenience
export const depositionService = new DepositionService();