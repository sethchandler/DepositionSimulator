// services/documentService.js

import { ValidationError, FileError, ErrorCodes } from '../utils/errorHandler.js';
import { formatCaseDocumentsForService } from '../scenarios/documentLibrary.js';
import { DOCUMENT_LIMITS } from '../config.js';

/**
 * Document service for managing document uploads, processing, and exhibit handling in depositions.
 */
export class DocumentService {
    
    constructor() {
        this.maxTokens = DOCUMENT_LIMITS.MAX_TOKENS;
        this.maxDocuments = DOCUMENT_LIMITS.MAX_DOCUMENTS;
        this.nextExhibitLetter = DOCUMENT_LIMITS.INITIAL_EXHIBIT_LETTER;
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
     * Extracts comprehensive metadata from document content using advanced pattern recognition.
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
            keyTopics: this.extractKeyTopics(content),
            // Enhanced metadata fields
            legalConcepts: this.extractLegalConcepts(content),
            financialInfo: this.extractFinancialInfo(content),
            locations: this.extractLocations(content),
            communications: this.extractCommunications(content),
            timeReferences: this.extractTimeReferences(content),
            documentStructure: this.analyzeDocumentStructure(content),
            sentimentIndicators: this.extractSentimentIndicators(content)
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
     * Extracts legal concepts and terminology from document content.
     * @param {string} content - Document content
     * @returns {Array<string>} Array of legal concepts found
     */
    extractLegalConcepts(content) {
        const legalTerms = [
            // Contract terms
            'agreement', 'contract', 'clause', 'breach', 'liability', 'indemnification',
            'warranty', 'consideration', 'termination', 'assignment', 'novation',
            
            // Legal procedures
            'deposition', 'testimony', 'affidavit', 'subpoena', 'discovery', 'motion',
            'objection', 'sustained', 'overruled', 'privilege', 'hearsay',
            
            // Criminal law
            'allegation', 'evidence', 'witness', 'defendant', 'plaintiff', 'prosecution',
            'defense', 'verdict', 'sentence', 'plea', 'conviction', 'acquittal',
            
            // Civil law
            'negligence', 'damages', 'injunction', 'settlement', 'mediation', 'arbitration',
            'jurisdiction', 'venue', 'standing', 'cause of action', 'statute of limitations',
            
            // Employment law
            'discrimination', 'harassment', 'wrongful termination', 'whistleblower',
            'retaliation', 'hostile work environment', 'accommodation'
        ];
        
        const foundTerms = new Set();
        const lowerContent = content.toLowerCase();
        
        legalTerms.forEach(term => {
            if (lowerContent.includes(term.toLowerCase())) {
                foundTerms.add(term);
            }
        });
        
        return Array.from(foundTerms).slice(0, 10);
    }
    
    /**
     * Extracts financial information from document content.
     * @param {string} content - Document content
     * @returns {Object} Financial information found
     */
    extractFinancialInfo(content) {
        const financialInfo = {
            amounts: [],
            currencies: [],
            accounts: [],
            paymentMethods: []
        };
        
        // Currency amounts
        const amountPatterns = [
            /\$[\d,]+\.?\d*/g,
            /USD\s*[\d,]+\.?\d*/g,
            /[\d,]+\.?\d*\s*dollars?/gi
        ];
        
        amountPatterns.forEach(pattern => {
            const matches = content.match(pattern) || [];
            financialInfo.amounts.push(...matches.slice(0, 5));
        });
        
        // Account numbers (partial for privacy)
        const accountPattern = /account\s*(?:number|#)?\s*:?\s*(\*+\d{4}|\d{4})/gi;
        const accountMatches = content.match(accountPattern) || [];
        financialInfo.accounts = accountMatches.slice(0, 3);
        
        // Payment methods
        const paymentMethods = ['cash', 'check', 'credit card', 'wire transfer', 'ach', 'paypal'];
        paymentMethods.forEach(method => {
            if (content.toLowerCase().includes(method)) {
                financialInfo.paymentMethods.push(method);
            }
        });
        
        return financialInfo;
    }
    
    /**
     * Extracts location information from document content.
     * @param {string} content - Document content
     * @returns {Array<string>} Array of locations found
     */
    extractLocations(content) {
        const locations = new Set();
        
        // Address patterns
        const addressPatterns = [
            /\d+\s+[A-Za-z\s]+(?:Street|St|Avenue|Ave|Boulevard|Blvd|Road|Rd|Drive|Dr|Lane|Ln|Court|Ct|Place|Pl)(?:\s*,?\s*[A-Za-z\s]+,?\s*[A-Z]{2}\s*\d{5})?/gi,
            /[A-Z][a-z]+,\s*[A-Z]{2}\s*\d{5}/g,
            /[A-Z][a-z]+\s+[A-Z]{2}\s*\d{5}/g
        ];
        
        addressPatterns.forEach(pattern => {
            const matches = content.match(pattern) || [];
            matches.forEach(match => locations.add(match.trim()));
        });
        
        // City, State patterns
        const cityStatePattern = /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*),\s*([A-Z]{2})/g;
        const cityStateMatches = [...content.matchAll(cityStatePattern)];
        cityStateMatches.forEach(match => {
            locations.add(`${match[1]}, ${match[2]}`);
        });
        
        return Array.from(locations).slice(0, 5);
    }
    
    /**
     * Extracts communication information (emails, phone numbers).
     * @param {string} content - Document content
     * @returns {Object} Communication information found
     */
    extractCommunications(content) {
        const communications = {
            emails: [],
            phoneNumbers: [],
            websites: []
        };
        
        // Email addresses
        const emailPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
        const emails = content.match(emailPattern) || [];
        communications.emails = emails.slice(0, 5);
        
        // Phone numbers
        const phonePatterns = [
            /\(\d{3}\)\s*\d{3}-\d{4}/g,
            /\d{3}-\d{3}-\d{4}/g,
            /\d{3}\.\d{3}\.\d{4}/g,
            /\d{10}/g
        ];
        
        phonePatterns.forEach(pattern => {
            const matches = content.match(pattern) || [];
            communications.phoneNumbers.push(...matches.slice(0, 3));
        });
        
        // Websites
        const websitePattern = /(?:https?:\/\/)?(?:www\.)?[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}(?:\/[^\s]*)?/g;
        const websites = content.match(websitePattern) || [];
        communications.websites = websites.slice(0, 3);
        
        return communications;
    }
    
    /**
     * Extracts time references from document content.
     * @param {string} content - Document content
     * @returns {Array<string>} Array of time references found
     */
    extractTimeReferences(content) {
        const timeReferences = new Set();
        
        // Time patterns
        const timePatterns = [
            /\d{1,2}:\d{2}\s*(?:AM|PM|am|pm)/gi,
            /\d{1,2}:\d{2}:\d{2}/g,
            /(?:morning|afternoon|evening|night|dawn|dusk|midnight|noon)/gi,
            /(?:yesterday|today|tomorrow|last\s+\w+|next\s+\w+)/gi,
            /\d+\s*(?:hours?|minutes?|seconds?|days?|weeks?|months?|years?)\s*(?:ago|later|before|after)/gi
        ];
        
        timePatterns.forEach(pattern => {
            const matches = content.match(pattern) || [];
            matches.forEach(match => timeReferences.add(match.trim()));
        });
        
        return Array.from(timeReferences).slice(0, 8);
    }
    
    /**
     * Analyzes the structure of the document.
     * @param {string} content - Document content
     * @returns {Object} Document structure analysis
     */
    analyzeDocumentStructure(content) {
        const lines = content.split('\n').filter(line => line.trim().length > 0);
        const words = content.split(/\s+/).filter(word => word.length > 0);
        
        return {
            lineCount: lines.length,
            wordCount: words.length,
            averageLineLength: lines.length > 0 ? Math.round(words.length / lines.length) : 0,
            hasHeaders: /^[A-Z\s]+$/m.test(content),
            hasBulletPoints: /^\s*[-•*]\s/m.test(content),
            hasNumberedList: /^\s*\d+\.\s/m.test(content),
            hasSignature: /signature|signed|regards|sincerely|best/i.test(content),
            isStructured: lines.some(line => /^\s*[A-Z][^:]*:\s*/.test(line))
        };
    }
    
    /**
     * Extracts sentiment indicators from document content.
     * @param {string} content - Document content
     * @returns {Object} Sentiment analysis
     */
    extractSentimentIndicators(content) {
        const sentiment = {
            positive: [],
            negative: [],
            neutral: [],
            legal: [],
            urgent: []
        };
        
        const sentimentWords = {
            positive: ['agree', 'satisfied', 'pleased', 'excellent', 'good', 'successful', 'effective'],
            negative: ['disagree', 'concerned', 'disappointed', 'failed', 'breach', 'violation', 'deny'],
            legal: ['pursuant', 'whereas', 'hereby', 'heretofore', 'notwithstanding', 'therein'],
            urgent: ['immediate', 'urgent', 'asap', 'critical', 'emergency', 'deadline', 'expires']
        };
        
        const lowerContent = content.toLowerCase();
        
        Object.entries(sentimentWords).forEach(([category, words]) => {
            words.forEach(word => {
                if (lowerContent.includes(word)) {
                    sentiment[category].push(word);
                }
            });
        });
        
        return sentiment;
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
     * Detects if a user question references any uploaded documents using advanced pattern matching.
     * @param {string} userInput - User's question or statement
     * @returns {Array<Object>} Array of potentially referenced documents with relevance scores
     */
    detectDocumentReferences(userInput) {
        const referencedDocs = [];
        const lowerInput = userInput.toLowerCase();
        
        // Advanced reference patterns
        const referencePatterns = {
            exhibit: /exhibit\s*([a-z])\b/gi,
            document: /(?:the\s+)?(?:document|email|letter|contract|report|memo|statement)\s*(?:from|dated|about|regarding)\s*([^.!?]+)/gi,
            date: /(?:on|from|dated|during)\s*([^.!?]*(?:\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}|january|february|march|april|may|june|july|august|september|october|november|december)[^.!?]*)/gi,
            person: /(?:from|to|by|with|regarding)\s+([a-z][a-z\s]+?[a-z])(?:\s|,|\.|\?|!|$)/gi,
            content: /(?:says?|states?|mentions?|shows?|indicates?)\s*[""']([^""']+)[""']/gi
        };
        
        for (const [id, doc] of this.documentRegistry) {
            let relevanceScore = 0;
            const matchReasons = [];
            
            // Direct exhibit reference (highest priority)
            const exhibitMatches = [...lowerInput.matchAll(referencePatterns.exhibit)];
            if (exhibitMatches.some(match => match[1].toLowerCase() === doc.exhibitLetter.toLowerCase())) {
                relevanceScore += 100;
                matchReasons.push(`Direct exhibit reference (${doc.exhibitLetter})`);
            }
            
            // Document type references
            if (lowerInput.includes(doc.metadata.documentType)) {
                relevanceScore += 20;
                matchReasons.push(`Document type match (${doc.metadata.documentType})`);
            }
            
            // Date references with fuzzy matching
            const dateMatches = [...lowerInput.matchAll(referencePatterns.date)];
            for (const dateMatch of dateMatches) {
                const matchedDate = dateMatch[1];
                if (doc.metadata.dates.some(docDate => 
                    this.datesAreSimilar(matchedDate, docDate))) {
                    relevanceScore += 30;
                    matchReasons.push(`Date reference match`);
                    break;
                }
            }
            
            // Party/person name references
            const personMatches = [...lowerInput.matchAll(referencePatterns.person)];
            for (const personMatch of personMatches) {
                const matchedPerson = personMatch[1].trim();
                if (doc.metadata.parties.some(party => 
                    this.namesAreSimilar(matchedPerson, party))) {
                    relevanceScore += 25;
                    matchReasons.push(`Person name match (${matchedPerson})`);
                    break;
                }
            }
            
            // Content keyword matching
            const contentMatches = [...lowerInput.matchAll(referencePatterns.content)];
            for (const contentMatch of contentMatches) {
                const quotedContent = contentMatch[1];
                if (doc.textContent.toLowerCase().includes(quotedContent.toLowerCase())) {
                    relevanceScore += 40;
                    matchReasons.push(`Content quote match`);
                    break;
                }
            }
            
            // Topic keyword matching
            const inputWords = lowerInput.split(/\s+/).filter(word => word.length > 3);
            const topicMatches = inputWords.filter(word => 
                doc.metadata.keyTopics.some(topic => 
                    topic.includes(word) || word.includes(topic)
                )
            );
            if (topicMatches.length > 0) {
                relevanceScore += topicMatches.length * 5;
                matchReasons.push(`Topic keyword matches (${topicMatches.length})`);
            }
            
            // Contextual document type hints
            const contextualHints = {
                'receipt': ['paid', 'payment', 'cost', 'bill', 'charge'],
                'email': ['sent', 'received', 'correspondence', 'message'],
                'contract': ['agreement', 'terms', 'signed', 'clause'],
                'report': ['findings', 'analysis', 'investigation', 'conclusion'],
                'statement': ['said', 'testified', 'declared', 'claimed']
            };
            
            const hints = contextualHints[doc.metadata.documentType] || [];
            const hintMatches = hints.filter(hint => lowerInput.includes(hint));
            if (hintMatches.length > 0) {
                relevanceScore += hintMatches.length * 10;
                matchReasons.push(`Contextual hints (${hintMatches.join(', ')})`);
            }
            
            // Add document if it has any relevance
            if (relevanceScore > 0) {
                referencedDocs.push({
                    ...doc,
                    relevanceScore,
                    matchReasons
                });
            }
        }
        
        // Sort by relevance score (highest first) and return top matches
        return referencedDocs
            .sort((a, b) => b.relevanceScore - a.relevanceScore)
            .slice(0, 3); // Limit to top 3 most relevant documents
    }
    
    /**
     * Checks if two dates are referring to the same date with fuzzy matching.
     * @param {string} input - User input date string
     * @param {string} docDate - Document date string  
     * @returns {boolean} True if dates likely refer to the same date
     */
    datesAreSimilar(input, docDate) {
        // Simple fuzzy date matching - could be enhanced with date parsing libraries
        const inputNormalized = input.replace(/[^\w\s]/g, ' ').toLowerCase();
        const docDateNormalized = docDate.replace(/[^\w\s]/g, ' ').toLowerCase();
        
        // Check for common date components
        const dateComponents = docDateNormalized.split(/\s+/);
        return dateComponents.some(component => 
            component.length > 2 && inputNormalized.includes(component)
        );
    }
    
    /**
     * Checks if two names are likely referring to the same person.
     * @param {string} input - User input name
     * @param {string} docName - Document name
     * @returns {boolean} True if names likely refer to the same person
     */
    namesAreSimilar(input, docName) {
        const inputNormalized = input.toLowerCase().trim();
        const docNameNormalized = docName.toLowerCase().trim();
        
        // Exact match
        if (inputNormalized === docNameNormalized) return true;
        
        // Check if one name contains the other
        if (inputNormalized.includes(docNameNormalized) || 
            docNameNormalized.includes(inputNormalized)) return true;
        
        // Check for last name match
        const inputParts = inputNormalized.split(/\s+/);
        const docParts = docNameNormalized.split(/\s+/);
        
        return inputParts.some(inputPart => 
            docParts.some(docPart => 
                inputPart.length > 2 && docPart.length > 2 && 
                (inputPart === docPart || inputPart.includes(docPart) || docPart.includes(inputPart))
            )
        );
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
     * Loads pre-built documents for a case scenario.
     * @param {string} caseReference - Case reference ID from witness data
     * @returns {Promise<Array<Object>>} Array of loaded document objects
     */
    async loadPreBuiltDocuments(caseReference) {
        if (!caseReference || typeof caseReference !== 'string') {
            console.warn('Invalid case reference provided for document loading');
            return [];
        }
        
        try {
            // Get formatted documents from case library (now async)
            const caseDocuments = await formatCaseDocumentsForService(caseReference);
            
            if (caseDocuments.length === 0) {
                console.log(`No pre-built documents found for case: ${caseReference}`);
                return [];
            }
            
            // Clear any existing case documents to avoid conflicts
            this.clearCaseDocuments(caseReference);
            
            // Add documents to registry
            const loadedDocuments = [];
            for (const doc of caseDocuments) {
                // Ensure we don't exceed document limits
                this.cleanupOldDocumentsIfNeeded();
                
                this.documentRegistry.set(doc.id, doc);
                loadedDocuments.push(doc);
                
                console.log(`Loaded case document: ${doc.fileName} (Exhibit ${doc.exhibitLetter})`);
            }
            
            console.log(`Successfully loaded ${loadedDocuments.length} pre-built documents for case ${caseReference}`);
            return loadedDocuments;
            
        } catch (error) {
            console.error('Error loading pre-built documents:', error);
            throw new ValidationError(
                `Failed to load case documents: ${error.message}`,
                'caseReference',
                caseReference
            );
        }
    }
    
    /**
     * Clears all documents associated with a specific case.
     * @param {string} caseReference - Case reference to clear
     */
    clearCaseDocuments(caseReference) {
        const documentsToRemove = [];
        
        for (const [docId, doc] of this.documentRegistry) {
            if (doc.metadata?.caseReference === caseReference) {
                documentsToRemove.push(docId);
            }
        }
        
        documentsToRemove.forEach(docId => {
            const doc = this.documentRegistry.get(docId);
            console.log(`Removing existing case document: ${doc.fileName}`);
            this.documentRegistry.delete(docId);
        });
    }
    
    /**
     * Gets summary statistics about loaded documents.
     * @returns {Object} Document statistics
     */
    getDocumentStatistics() {
        const allDocs = Array.from(this.documentRegistry.values());
        const preBuiltDocs = allDocs.filter(doc => doc.metadata?.isPreBuilt);
        const uploadedDocs = allDocs.filter(doc => !doc.metadata?.isPreBuilt);
        const activeDocs = allDocs.filter(doc => doc.isActive);
        
        return {
            total: allDocs.length,
            preBuilt: preBuiltDocs.length,
            uploaded: uploadedDocs.length,
            active: activeDocs.length,
            totalTokens: this.getTotalTokenCount(),
            capacityUsed: (this.getTotalTokenCount() / this.maxTokens * 100).toFixed(1),
            documentTypes: this.getDocumentTypeBreakdown(allDocs)
        };
    }
    
    /**
     * Gets breakdown of document types.
     * @param {Array} documents - Array of document objects
     * @returns {Object} Document type counts
     */
    getDocumentTypeBreakdown(documents) {
        const breakdown = {};
        documents.forEach(doc => {
            const type = doc.metadata?.documentType || 'unknown';
            breakdown[type] = (breakdown[type] || 0) + 1;
        });
        return breakdown;
    }
    
    /**
     * Searches documents by content or metadata.
     * @param {string} searchTerm - Term to search for
     * @returns {Array<Object>} Array of matching documents
     */
    searchDocuments(searchTerm) {
        if (!searchTerm || typeof searchTerm !== 'string') {
            return [];
        }
        
        const lowerSearchTerm = searchTerm.toLowerCase();
        const matchingDocs = [];
        
        for (const doc of this.documentRegistry.values()) {
            // Search in content
            if (doc.textContent.toLowerCase().includes(lowerSearchTerm)) {
                matchingDocs.push({
                    ...doc,
                    matchType: 'content'
                });
                continue;
            }
            
            // Search in metadata
            const metadata = doc.metadata || {};
            const searchableText = [
                doc.fileName,
                metadata.documentType,
                ...(metadata.parties || []),
                ...(metadata.keyTopics || []),
                ...(metadata.dates || [])
            ].join(' ').toLowerCase();
            
            if (searchableText.includes(lowerSearchTerm)) {
                matchingDocs.push({
                    ...doc,
                    matchType: 'metadata'
                });
            }
        }
        
        return matchingDocs;
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