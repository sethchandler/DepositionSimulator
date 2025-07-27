// services/documentService.js

import { ValidationError, FileError, ErrorCodes } from '../utils/errorHandler.js';

/**
 * Document service for managing document uploads, processing, and exhibit handling in depositions.
 */
export class DocumentService {
    
    constructor() {
        this.maxTokens = 10000;
        this.maxDocuments = 50; // Prevent memory issues
        this.nextExhibitLetter = 'A';
        this.documentRegistry = new Map();
    }
    
    /**
     * Processes an uploaded file and adds it to the document registry.
     * @param {File} file - The uploaded file
     * @returns {Promise<Object>} Document metadata object
     */
    async processUpload(file) {
        // Validate file
        this.validateFile(file);
        
        // Extract text content
        const textContent = await this.extractTextContent(file);
        
        // Validate extracted content
        this.validateFileContent(file, textContent);
        
        // Count tokens (rough estimation: ~0.75 tokens per word)
        const tokenCount = this.estimateTokenCount(textContent);
        
        if (tokenCount > this.maxTokens) {
            throw new FileError(
                `Document is too large (${tokenCount} tokens). Maximum allowed is ${this.maxTokens} tokens.`,
                file.name,
                'upload'
            );
        }
        
        // Extract metadata
        const metadata = this.extractMetadata(file.name, textContent);
        
        // Create smart summary for large documents
        const summary = tokenCount > 2000 ? this.createSummary(textContent) : null;
        
        // Assign exhibit letter
        const exhibitLetter = this.assignExhibitLetter();
        
        // Create document object
        const document = {
            id: this.generateDocumentId(),
            fileName: file.name,
            exhibitLetter,
            textContent,
            tokenCount,
            summary,
            metadata,
            uploadDate: new Date().toISOString(),
            isActive: false // Whether currently injected in context
        };
        
        // Add to registry with cleanup if needed
        this.cleanupOldDocumentsIfNeeded();
        this.documentRegistry.set(document.id, document);
        
        return document;
    }
    
    /**
     * Validates uploaded file type and size.
     * @param {File} file - The file to validate
     */
    validateFile(file) {
        const allowedTypes = ['.txt', '.pdf', '.docx'];
        const fileExtension = '.' + file.name.split('.').pop().toLowerCase();
        
        if (!allowedTypes.includes(fileExtension)) {
            throw new ValidationError(
                `File type ${fileExtension} not supported. Allowed types: ${allowedTypes.join(', ')}`,
                'fileType',
                fileExtension
            );
        }
        
        // 50MB file size limit (before text extraction)
        if (file.size > 50 * 1024 * 1024) {
            throw new FileError(
                'File is too large. Maximum file size is 50MB.',
                file.name,
                'validation'
            );
        }
    }
    
    /**
     * Validates the extracted content from a file.
     * @param {File} file - The original file
     * @param {string} content - Extracted text content
     */
    validateFileContent(file, content) {
        if (!content || typeof content !== 'string') {
            throw new FileError(
                'File appears to be empty or contains no readable text.',
                file.name,
                'validation'
            );
        }
        
        // Check for reasonable content length
        if (content.length < 10) {
            throw new FileError(
                'File content is too short to be meaningful.',
                file.name,
                'validation'
            );
        }
        
        // Check for extremely large content (10MB text limit)
        if (content.length > 10 * 1024 * 1024) {
            throw new FileError(
                'File content is too large. Maximum text content is 10MB.',
                file.name,
                'validation'
            );
        }
        
        // Check for binary content by looking for null bytes and excessive control characters
        const nullByteCount = (content.match(/\x00/g) || []).length;
        if (nullByteCount > 0) {
            throw new FileError(
                'File appears to contain binary data rather than text.',
                file.name,
                'validation'
            );
        }
        
        // Check for reasonable text content (should contain some letters)
        const letterCount = (content.match(/[a-zA-Z]/g) || []).length;
        const totalChars = content.length;
        
        if (letterCount / totalChars < 0.1) {
            throw new FileError(
                'File does not appear to contain meaningful text content.',
                file.name,
                'validation'
            );
        }
        
        // Check for potential malicious content patterns
        const suspiciousPatterns = [
            /<script/i,
            /javascript:/i,
            /data:.*base64/i,
            /eval\s*\(/i,
            /document\.write/i
        ];
        
        for (const pattern of suspiciousPatterns) {
            if (pattern.test(content)) {
                throw new ValidationError(
                    'File content contains potentially unsafe elements.',
                    'content',
                    'suspicious_content'
                );
            }
        }
    }
    
    /**
     * Extracts text content from various file types.
     * @param {File} file - The file to extract text from
     * @returns {Promise<string>} Extracted text content
     */
    async extractTextContent(file) {
        const fileExtension = '.' + file.name.split('.').pop().toLowerCase();
        
        try {
            switch (fileExtension) {
                case '.txt':
                    return await this.readTextFile(file);
                case '.pdf':
                    // For now, just read as text (user can copy-paste from PDF)
                    // In future, could integrate PDF.js for proper extraction
                    return await this.readTextFile(file);
                case '.docx':
                    // For now, just read as text (user can save as .txt)
                    // In future, could integrate docx parser
                    return await this.readTextFile(file);
                default:
                    throw new FileError(
                        `Unsupported file type: ${fileExtension}`,
                        file.name,
                        'extraction'
                    );
            }
        } catch (error) {
            throw new FileError(
                `Failed to extract text from file: ${error.message}`,
                file.name,
                'extraction',
                error
            );
        }
    }
    
    /**
     * Reads a text file and returns its content.
     * @param {File} file - The text file to read
     * @returns {Promise<string>} File content
     */
    readTextFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = (e) => reject(new Error('Failed to read file'));
            reader.readAsText(file);
        });
    }
    
    /**
     * Estimates token count for text content.
     * @param {string} text - The text to count tokens for
     * @returns {number} Estimated token count
     */
    estimateTokenCount(text) {
        // Rough estimation: ~0.75 tokens per word
        const wordCount = text.trim().split(/\s+/).length;
        return Math.ceil(wordCount * 0.75);
    }
    
    /**
     * Extracts metadata from document content.
     * @param {string} fileName - Original file name
     * @param {string} content - Document text content
     * @returns {Object} Extracted metadata
     */
    extractMetadata(fileName, content) {
        const metadata = {
            fileName,
            documentType: this.identifyDocumentType(fileName, content),
            dates: this.extractDates(content),
            parties: this.extractParties(content),
            keyTopics: this.extractKeyTopics(content)
        };
        
        return metadata;
    }
    
    /**
     * Identifies the type of document based on filename and content.
     * @param {string} fileName - Original file name
     * @param {string} content - Document content
     * @returns {string} Document type
     */
    identifyDocumentType(fileName, content) {
        const lowerFileName = fileName.toLowerCase();
        const lowerContent = content.toLowerCase();
        
        if (lowerFileName.includes('email') || lowerContent.includes('from:') || lowerContent.includes('to:')) {
            return 'email';
        }
        if (lowerFileName.includes('contract') || lowerContent.includes('agreement') || lowerContent.includes('hereby agree')) {
            return 'contract';
        }
        if (lowerFileName.includes('letter') || lowerContent.includes('dear ') || lowerContent.includes('sincerely')) {
            return 'letter';
        }
        if (lowerFileName.includes('report') || lowerContent.includes('findings') || lowerContent.includes('conclusion')) {
            return 'report';
        }
        if (lowerFileName.includes('memo') || lowerContent.includes('memorandum')) {
            return 'memorandum';
        }
        
        return 'document';
    }
    
    /**
     * Extracts dates from document content.
     * @param {string} content - Document content
     * @returns {Array<string>} Array of found dates
     */
    extractDates(content) {
        const datePatterns = [
            /\b\d{1,2}\/\d{1,2}\/\d{4}\b/g, // MM/DD/YYYY
            /\b\d{4}-\d{2}-\d{2}\b/g, // YYYY-MM-DD
            /\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}\b/gi,
            /\b\d{1,2}\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4}\b/gi
        ];
        
        const dates = new Set();
        datePatterns.forEach(pattern => {
            const matches = content.match(pattern) || [];
            matches.forEach(date => dates.add(date));
        });
        
        return Array.from(dates).slice(0, 5); // Limit to 5 dates
    }
    
    /**
     * Extracts potential party names from document content.
     * @param {string} content - Document content
     * @returns {Array<string>} Array of potential party names
     */
    extractParties(content) {
        // Look for patterns like "From: Name", "To: Name", proper names, etc.
        const partyPatterns = [
            /(?:From|To|Dear|Mr\.|Ms\.|Mrs\.|Dr\.)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/g,
            /\b([A-Z][a-z]+\s+[A-Z][a-z]+)\b/g // Simple two-word proper names
        ];
        
        const parties = new Set();
        partyPatterns.forEach(pattern => {
            const matches = content.match(pattern) || [];
            matches.forEach(match => {
                const cleaned = match.replace(/^(From|To|Dear|Mr\.|Ms\.|Mrs\.|Dr\.)\s+/, '');
                if (cleaned.length > 3 && cleaned.length < 50) {
                    parties.add(cleaned);
                }
            });
        });
        
        return Array.from(parties).slice(0, 10); // Limit to 10 parties
    }
    
    /**
     * Extracts key topics and themes from document content.
     * @param {string} content - Document content
     * @returns {Array<string>} Array of key topics
     */
    extractKeyTopics(content) {
        // Simple keyword extraction - could be enhanced with NLP
        const topicWords = content.toLowerCase()
            .replace(/[^\w\s]/g, ' ')
            .split(/\s+/)
            .filter(word => word.length > 4)
            .filter(word => !this.isCommonWord(word));
        
        // Count frequency and get top topics
        const wordCounts = {};
        topicWords.forEach(word => {
            wordCounts[word] = (wordCounts[word] || 0) + 1;
        });
        
        return Object.entries(wordCounts)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 10)
            .map(([word]) => word);
    }
    
    /**
     * Checks if a word is a common stop word.
     * @param {string} word - Word to check
     * @returns {boolean} True if common word
     */
    isCommonWord(word) {
        const commonWords = new Set([
            'that', 'with', 'have', 'this', 'will', 'your', 'from', 'they',
            'know', 'want', 'been', 'good', 'much', 'some', 'time', 'very',
            'when', 'come', 'here', 'just', 'like', 'long', 'make', 'many',
            'over', 'such', 'take', 'than', 'them', 'well', 'were'
        ]);
        return commonWords.has(word);
    }
    
    /**
     * Creates a smart summary for large documents.
     * @param {string} content - Full document content
     * @returns {string} Document summary
     */
    createSummary(content) {
        // Simple extractive summary - take first and last paragraphs + key sentences
        const paragraphs = content.split('\n').filter(p => p.trim().length > 50);
        
        let summary = '';
        if (paragraphs.length > 0) {
            summary += paragraphs[0] + '\n\n';
        }
        if (paragraphs.length > 2) {
            summary += '[... content omitted ...]\n\n';
            summary += paragraphs[paragraphs.length - 1];
        }
        
        return summary;
    }
    
    /**
     * Assigns the next available exhibit letter.
     * @returns {string} Exhibit letter (A, B, C, etc.)
     */
    assignExhibitLetter() {
        const letter = this.nextExhibitLetter;
        this.nextExhibitLetter = String.fromCharCode(this.nextExhibitLetter.charCodeAt(0) + 1);
        return letter;
    }
    
    /**
     * Generates a unique document ID.
     * @returns {string} Unique document ID
     */
    generateDocumentId() {
        return 'doc_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }
    
    /**
     * Detects if a user question references any uploaded documents.
     * @param {string} userInput - User's question or statement
     * @returns {Array<Object>} Array of potentially referenced documents
     */
    detectDocumentReferences(userInput) {
        const referencedDocs = [];
        const lowerInput = userInput.toLowerCase();
        
        for (const [id, doc] of this.documentRegistry) {
            // Check for date references
            if (doc.metadata.dates.some(date => lowerInput.includes(date.toLowerCase()))) {
                referencedDocs.push(doc);
                continue;
            }
            
            // Check for document type references
            if (lowerInput.includes(doc.metadata.documentType)) {
                referencedDocs.push(doc);
                continue;
            }
            
            // Check for exhibit references
            if (lowerInput.includes(`exhibit ${doc.exhibitLetter.toLowerCase()}`)) {
                referencedDocs.push(doc);
                continue;
            }
            
            // Check for party name references
            if (doc.metadata.parties.some(party => lowerInput.includes(party.toLowerCase()))) {
                referencedDocs.push(doc);
                continue;
            }
        }
        
        return referencedDocs;
    }
    
    /**
     * Gets the full content of a document for context injection.
     * @param {string} documentId - Document ID
     * @returns {string} Full document content with exhibit info
     */
    getDocumentForContext(documentId) {
        const doc = this.documentRegistry.get(documentId);
        if (!doc) return '';
        
        // Mark as active for this context
        doc.isActive = true;
        
        // Format for context injection
        return `DEPOSITION EXHIBIT ${doc.exhibitLetter} (${doc.metadata.documentType}):
File: ${doc.fileName}
${doc.textContent}
[END OF EXHIBIT ${doc.exhibitLetter}]`;
    }
    
    /**
     * Gets all uploaded documents.
     * @returns {Array<Object>} Array of document metadata
     */
    getAllDocuments() {
        return Array.from(this.documentRegistry.values());
    }
    
    /**
     * Removes a document from the registry.
     * @param {string} documentId - Document ID to remove
     */
    removeDocument(documentId) {
        this.documentRegistry.delete(documentId);
    }
    
    /**
     * Cleans up old documents when approaching memory limits.
     * Removes oldest documents to stay within maxDocuments limit.
     */
    cleanupOldDocumentsIfNeeded() {
        if (this.documentRegistry.size >= this.maxDocuments) {
            console.log(`Cleaning up old documents. Current count: ${this.documentRegistry.size}`);
            
            // Get all documents sorted by upload date (oldest first)
            const sortedDocs = Array.from(this.documentRegistry.entries())
                .sort(([,a], [,b]) => new Date(a.uploadDate) - new Date(b.uploadDate));
            
            // Remove oldest 10 documents to free up space
            const documentsToRemove = Math.min(10, sortedDocs.length - (this.maxDocuments - 10));
            
            for (let i = 0; i < documentsToRemove; i++) {
                const [docId, doc] = sortedDocs[i];
                console.log(`Removing old document: ${doc.fileName} (${doc.exhibitLetter})`);
                this.documentRegistry.delete(docId);
            }
            
            console.log(`Cleanup complete. Remaining documents: ${this.documentRegistry.size}`);
        }
    }
    
    /**
     * Forces cleanup of all documents (useful for memory management).
     */
    clearAllDocuments() {
        console.log(`Clearing all ${this.documentRegistry.size} documents from registry`);
        this.documentRegistry.clear();
        this.nextExhibitLetter = 'A'; // Reset exhibit letters
    }
    
    /**
     * Gets total token count of all uploaded documents.
     * @returns {number} Total token count
     */
    getTotalTokenCount() {
        return Array.from(this.documentRegistry.values())
            .reduce((total, doc) => total + doc.tokenCount, 0);
    }
    
    /**
     * Checks if more documents can be uploaded.
     * @param {number} newDocumentTokens - Token count of new document
     * @returns {boolean} True if document can be uploaded
     */
    canUploadDocument(newDocumentTokens) {
        return this.getTotalTokenCount() + newDocumentTokens <= this.maxTokens;
    }
}

// Export singleton instance
export const documentService = new DocumentService();