// utils/errorHandler.js

/**
 * Custom error types for the Deposition Simulator.
 * Provides specific error categories for different failure scenarios.
 */

/**
 * Base error class for all application-specific errors.
 */
export class DepositionError extends Error {
    constructor(message, code, cause = null, userMessage = null) {
        super(message);
        this.name = this.constructor.name;
        this.code = code;
        this.cause = cause;
        this.userMessage = userMessage || message;
        this.timestamp = new Date().toISOString();
        this.isConfidential = false;
        
        // Ensure proper stack trace
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, this.constructor);
        }
    }
    
    /**
     * Mark this error as containing potentially confidential information
     */
    markConfidential() {
        this.isConfidential = true;
        return this;
    }
}

/**
 * API-related errors (network, authentication, rate limits)
 */
export class APIError extends DepositionError {
    constructor(message, provider, statusCode = null, cause = null) {
        super(message, ErrorCodes.API_ERROR, cause);
        this.provider = provider;
        this.statusCode = statusCode;
    }
}

/**
 * Configuration errors (missing API keys, invalid settings)
 */
export class ConfigurationError extends DepositionError {
    constructor(message, setting = null, cause = null) {
        super(message, ErrorCodes.CONFIGURATION_ERROR, cause);
        this.setting = setting;
    }
}

/**
 * Data validation errors (invalid witness data, malformed inputs)
 */
export class ValidationError extends DepositionError {
    constructor(message, field = null, value = null, cause = null) {
        super(message, ErrorCodes.VALIDATION_ERROR, cause);
        this.field = field;
        this.value = value;
        
        // Validation errors might contain sensitive data
        if (value && typeof value === 'string' && value.length > 100) {
            this.markConfidential();
        }
    }
}

/**
 * File processing errors (scenario loading, transcript export)
 */
export class FileError extends DepositionError {
    constructor(message, fileName = null, operation = null, cause = null) {
        super(message, ErrorCodes.FILE_ERROR, cause);
        this.fileName = fileName;
        this.operation = operation;
    }
}

/**
 * Speech recognition errors
 */
export class SpeechError extends DepositionError {
    constructor(message, cause = null) {
        super(message, ErrorCodes.SPEECH_ERROR, cause);
    }
}

/**
 * Error codes for categorizing different types of failures
 */
export const ErrorCodes = {
    // API and Network Errors
    API_ERROR: 'API_ERROR',
    NETWORK_ERROR: 'NETWORK_ERROR',
    RATE_LIMIT_ERROR: 'RATE_LIMIT_ERROR',
    AUTHENTICATION_ERROR: 'AUTHENTICATION_ERROR',
    
    // Configuration Errors
    CONFIGURATION_ERROR: 'CONFIGURATION_ERROR',
    API_KEY_MISSING: 'API_KEY_MISSING',
    INVALID_PROVIDER: 'INVALID_PROVIDER',
    INVALID_MODEL: 'INVALID_MODEL',
    
    // Data Validation Errors
    VALIDATION_ERROR: 'VALIDATION_ERROR',
    WITNESS_DATA_INVALID: 'WITNESS_DATA_INVALID',
    INPUT_VALIDATION_ERROR: 'INPUT_VALIDATION_ERROR',
    
    // File Errors
    FILE_ERROR: 'FILE_ERROR',
    FILE_NOT_FOUND: 'FILE_NOT_FOUND',
    FILE_PARSE_ERROR: 'FILE_PARSE_ERROR',
    FILE_EXPORT_ERROR: 'FILE_EXPORT_ERROR',
    
    // Speech Errors
    SPEECH_ERROR: 'SPEECH_ERROR',
    SPEECH_NOT_SUPPORTED: 'SPEECH_NOT_SUPPORTED',
    MICROPHONE_ACCESS_DENIED: 'MICROPHONE_ACCESS_DENIED',
    
    // Service Errors
    SERVICE_ERROR: 'SERVICE_ERROR',
    UNKNOWN_ERROR: 'UNKNOWN_ERROR'
};

/**
 * User-friendly error messages for different error types.
 * These are safe to display to users and don't contain technical details.
 */
const USER_FRIENDLY_MESSAGES = {
    [ErrorCodes.API_KEY_MISSING]: 'Please enter your API key in the settings to continue.',
    [ErrorCodes.AUTHENTICATION_ERROR]: 'Invalid API key. Please check your API key and try again.',
    [ErrorCodes.NETWORK_ERROR]: 'Network connection failed. Please check your internet connection and try again.',
    [ErrorCodes.RATE_LIMIT_ERROR]: 'API rate limit exceeded. Please wait a moment before trying again.',
    [ErrorCodes.INVALID_PROVIDER]: 'The selected AI provider is not supported. Please choose a different provider.',
    [ErrorCodes.INVALID_MODEL]: 'The selected model is not available. Please choose a different model.',
    [ErrorCodes.WITNESS_DATA_INVALID]: 'The witness file appears to be corrupted or invalid. Please check the file format.',
    [ErrorCodes.FILE_PARSE_ERROR]: 'Unable to read the file. Please ensure it\'s a valid JSON file.',
    [ErrorCodes.SPEECH_NOT_SUPPORTED]: 'Speech recognition is not supported in this browser. Please type your questions instead.',
    [ErrorCodes.MICROPHONE_ACCESS_DENIED]: 'Microphone access was denied. Please allow microphone access to use speech input.',
    [ErrorCodes.SERVICE_ERROR]: 'A service error occurred. Please try again.',
    [ErrorCodes.UNKNOWN_ERROR]: 'An unexpected error occurred. Please try again or contact support if the problem persists.'
};

/**
 * Sanitizes error messages to remove potentially confidential information.
 */
function sanitizeErrorMessage(error) {
    if (!error) return 'Unknown error occurred';
    
    let message = error.message || error.toString();
    
    // Remove common patterns that might contain sensitive data
    const sensitivePatterns = [
        /Bearer\s+[A-Za-z0-9\-._~+/]+=*/g,  // API keys
        /sk-[A-Za-z0-9]+/g,                 // OpenAI API keys
        /AIza[A-Za-z0-9\-_]{35}/g,          // Google API keys
        /"[^"]*password[^"]*"/gi,           // Password fields
        /"[^"]*secret[^"]*"/gi,             // Secret fields
        /"[^"]*token[^"]*"/gi,              // Token fields
        /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g, // Credit card numbers
        /\b\d{3}-\d{2}-\d{4}\b/g,           // SSN patterns
    ];
    
    sensitivePatterns.forEach(pattern => {
        message = message.replace(pattern, '[REDACTED]');
    });
    
    // Truncate very long messages that might contain witness data
    if (message.length > 500) {
        message = message.substring(0, 500) + '... [truncated for security]';
    }
    
    return message;
}

/**
 * Central error handler that processes all application errors.
 * Returns user-friendly error information while maintaining security.
 */
export function handleError(error, context = '', options = {}) {
    const {
        showTechnicalDetails = false,
        logToConsole = true,
        notifyUser = true
    } = options;
    
    // Determine error type and code
    let errorCode = ErrorCodes.UNKNOWN_ERROR;
    let userMessage = USER_FRIENDLY_MESSAGES[ErrorCodes.UNKNOWN_ERROR];
    let technicalMessage = '';
    
    if (error instanceof DepositionError) {
        errorCode = error.code;
        userMessage = error.userMessage || USER_FRIENDLY_MESSAGES[errorCode] || error.message;
        technicalMessage = error.message;
    } else if (error instanceof TypeError && error.message.includes('fetch')) {
        errorCode = ErrorCodes.NETWORK_ERROR;
        userMessage = USER_FRIENDLY_MESSAGES[ErrorCodes.NETWORK_ERROR];
        technicalMessage = 'Network request failed';
    } else if (error?.name === 'NetworkError') {
        errorCode = ErrorCodes.NETWORK_ERROR;
        userMessage = USER_FRIENDLY_MESSAGES[ErrorCodes.NETWORK_ERROR];
        technicalMessage = 'Network connection failed';
    } else {
        technicalMessage = sanitizeErrorMessage(error);
        
        // Try to categorize common error patterns
        if (technicalMessage.toLowerCase().includes('api key')) {
            errorCode = ErrorCodes.API_KEY_MISSING;
            userMessage = USER_FRIENDLY_MESSAGES[ErrorCodes.API_KEY_MISSING];
        } else if (technicalMessage.toLowerCase().includes('rate limit')) {
            errorCode = ErrorCodes.RATE_LIMIT_ERROR;
            userMessage = USER_FRIENDLY_MESSAGES[ErrorCodes.RATE_LIMIT_ERROR];
        } else if (technicalMessage.toLowerCase().includes('unauthorized')) {
            errorCode = ErrorCodes.AUTHENTICATION_ERROR;
            userMessage = USER_FRIENDLY_MESSAGES[ErrorCodes.AUTHENTICATION_ERROR];
        }
    }
    
    // Create error info object
    const errorInfo = {
        code: errorCode,
        userMessage,
        technicalMessage: showTechnicalDetails ? technicalMessage : null,
        context,
        timestamp: new Date().toISOString(),
        isConfidential: error?.isConfidential || false
    };
    
    // Log error (with sanitization for security)
    if (logToConsole) {
        const logMessage = `[${context}] Error ${errorCode}: ${technicalMessage}`;
        console.error(logMessage);
        
        // Log stack trace in development (but not in production to avoid leaking paths)
        if (error?.stack && window.location.hostname === 'localhost') {
            console.error('Stack trace:', error.stack);
        }
    }
    
    return errorInfo;
}

/**
 * Retry wrapper for operations that might fail due to transient issues.
 * Useful for network requests and API calls.
 */
export async function withRetry(
    operation, 
    maxRetries = 3, 
    delayMs = 1000, 
    backoffMultiplier = 2,
    retryableErrors = [ErrorCodes.NETWORK_ERROR, ErrorCodes.RATE_LIMIT_ERROR]
) {
    let lastError;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            return await operation();
        } catch (error) {
            lastError = error;
            
            // Check if error is retryable
            const errorCode = error instanceof DepositionError ? error.code : ErrorCodes.NETWORK_ERROR;
            const isRetryable = retryableErrors.includes(errorCode) || 
                              error instanceof TypeError || 
                              error?.name === 'NetworkError';
            
            // Don't retry on last attempt or non-retryable errors
            if (attempt === maxRetries || !isRetryable) {
                break;
            }
            
            // Calculate delay with exponential backoff
            const delay = delayMs * Math.pow(backoffMultiplier, attempt - 1);
            
            console.log(`Retry attempt ${attempt}/${maxRetries} after ${delay}ms delay`);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
    
    throw lastError;
}

/**
 * Creates a safe error reporter that won't leak confidential information.
 * Useful for logging errors to external services (if implemented in the future).
 */
export function createSafeErrorReport(error, context) {
    const errorInfo = handleError(error, context, { logToConsole: false });
    
    return {
        code: errorInfo.code,
        context: errorInfo.context,
        timestamp: errorInfo.timestamp,
        userAgent: navigator.userAgent,
        url: window.location.href,
        // Never include technical details in external reports
        message: errorInfo.userMessage
    };
}