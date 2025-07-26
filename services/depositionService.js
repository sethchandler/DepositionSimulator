// services/depositionService.js

import { buildDepositionPrompt, buildOocPrompt, buildSummaryPrompt, buildCaseSummaryPrompt } from '../promptBuilder.js';
import { callLlmApi } from '../api.js';
import { 
    ValidationError, 
    ConfigurationError, 
    APIError,
    ErrorCodes,
    handleError 
} from '../utils/errorHandler.js';

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
        // Validate input
        if (!userInput || typeof userInput !== 'string' || !userInput.trim()) {
            throw new ValidationError(
                'User input is required and must be a non-empty string',
                'userInput',
                userInput
            );
        }
        
        if (!witness || typeof witness !== 'object') {
            throw new ValidationError(
                'Witness data is required and must be a valid object',
                'witness',
                witness
            );
        }
        
        // Validate witness structure
        if (!witness.witnessBackground?.personalDetails?.fullName && !witness.name) {
            throw new ValidationError(
                'Witness data must contain valid background information',
                'witness.witnessBackground',
                null
            ).markConfidential();
        }
        
        // Validate configuration
        if (!config || typeof config !== 'object') {
            throw new ConfigurationError(
                'Configuration object is required',
                'config'
            );
        }
        
        if (!config.apiConfig) {
            throw new ConfigurationError(
                'API configuration is required',
                'apiConfig'
            );
        }
        
        this.validateApiConfig(config.apiConfig);
        
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
        
        // Call LLM API with enhanced error handling
        let apiResponse;
        try {
            apiResponse = await callLlmApi(config.apiConfig.providerId, {
                apiKey: config.apiConfig.apiKey,
                model: config.apiConfig.model,
                messages: messagesForApi
            });
        } catch (error) {
            // Re-throw with context
            if (error instanceof APIError || error instanceof ConfigurationError) {
                throw error;
            }
            throw new APIError(
                'Failed to get response from AI provider',
                config.apiConfig.providerId,
                null,
                error
            );
        }
        
        const { message, usage } = apiResponse;
        
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
        // Validate inputs
        if (!witness || typeof witness !== 'object') {
            throw new ValidationError(
                'Witness data is required and must be a valid object',
                'witness',
                witness
            );
        }
        
        if (!detailLevel || ![1, 2, 3].includes(Number(detailLevel))) {
            throw new ValidationError(
                'Detail level must be 1, 2, or 3',
                'detailLevel',
                detailLevel
            );
        }
        
        this.validateApiConfig(apiConfig);
        
        const summaryPrompt = buildSummaryPrompt(witness, detailLevel);
        
        let apiResponse;
        try {
            apiResponse = await callLlmApi(apiConfig.providerId, {
                apiKey: apiConfig.apiKey,
                model: apiConfig.model,
                messages: [summaryPrompt]
            });
        } catch (error) {
            if (error instanceof APIError || error instanceof ConfigurationError) {
                throw error;
            }
            throw new APIError(
                'Failed to generate witness summary',
                apiConfig.providerId,
                null,
                error
            );
        }
        
        const { message, usage } = apiResponse;
        
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
        // Validate inputs
        if (!witness || typeof witness !== 'object') {
            throw new ValidationError(
                'Witness data is required and must be a valid object',
                'witness',
                witness
            );
        }
        
        if (!detailLevel || ![1, 2, 3].includes(Number(detailLevel))) {
            throw new ValidationError(
                'Detail level must be 1, 2, or 3',
                'detailLevel',
                detailLevel
            );
        }
        
        this.validateApiConfig(apiConfig);
        
        const caseSummaryPrompt = buildCaseSummaryPrompt(witness, detailLevel);
        
        let apiResponse;
        try {
            apiResponse = await callLlmApi(apiConfig.providerId, {
                apiKey: apiConfig.apiKey,
                model: apiConfig.model,
                messages: [caseSummaryPrompt]
            });
        } catch (error) {
            if (error instanceof APIError || error instanceof ConfigurationError) {
                throw error;
            }
            throw new APIError(
                'Failed to generate case summary',
                apiConfig.providerId,
                null,
                error
            );
        }
        
        const { message, usage } = apiResponse;
        
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
        if (!apiConfig || typeof apiConfig !== 'object') {
            throw new ConfigurationError(
                'API configuration object is required',
                'apiConfig'
            );
        }
        
        const { providerId, model, apiKey } = apiConfig;
        
        if (!providerId || typeof providerId !== 'string') {
            throw new ConfigurationError(
                'Provider ID is required and must be a string',
                'providerId'
            );
        }
        
        if (!model || typeof model !== 'string') {
            throw new ConfigurationError(
                'Model name is required and must be a string',
                'model'
            );
        }
        
        // API key validation (except for Ollama)
        if (providerId !== 'ollama') {
            if (!apiKey || typeof apiKey !== 'string' || apiKey.trim().length === 0) {
                throw new ConfigurationError(
                    'API key is required for this provider',
                    'apiKey'
                ).markConfidential();
            }
        }
    }
}

// Export a singleton instance for convenience
export const depositionService = new DepositionService();