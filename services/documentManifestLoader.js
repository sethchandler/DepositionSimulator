// services/documentManifestLoader.js

/**
 * Service for loading and processing document manifests with public/secret content separation.
 * Replaces the old base64 embedded system with more maintainable JSON structure.
 */
export class DocumentManifestLoader {
    
    constructor() {
        this.manifestCache = null;
        this.loadPromise = null;
    }
    
    /**
     * Loads the document manifest from JSON file.
     * @returns {Promise<Object>} The complete document manifest
     */
    async loadManifest() {
        // Return cached manifest if already loaded
        if (this.manifestCache) {
            return this.manifestCache;
        }
        
        // Prevent multiple simultaneous loads
        if (this.loadPromise) {
            return this.loadPromise;
        }
        
        this.loadPromise = this.fetchManifest();
        
        try {
            this.manifestCache = await this.loadPromise;
            return this.manifestCache;
        } catch (error) {
            this.loadPromise = null; // Reset on error to allow retry
            throw error;
        }
    }
    
    /**
     * Fetches the manifest file from the server.
     * @returns {Promise<Object>} Parsed manifest data
     */
    async fetchManifest() {
        try {
            const response = await fetch('./scenarios/documentManifest.json');
            
            if (!response.ok) {
                throw new Error(`Failed to load document manifest: ${response.status} ${response.statusText}`);
            }
            
            const manifest = await response.json();
            
            // Validate manifest structure
            this.validateManifest(manifest);
            
            console.log(`Document manifest loaded successfully. Version: ${manifest.version}`);
            return manifest;
            
        } catch (error) {
            console.error('Error loading document manifest:', error);
            throw new Error(`Document manifest loading failed: ${error.message}`);
        }
    }
    
    /**
     * Validates the manifest structure.
     * @param {Object} manifest - Manifest to validate
     */
    validateManifest(manifest) {
        if (!manifest || typeof manifest !== 'object') {
            throw new Error('Invalid manifest: not an object');
        }
        
        if (!manifest.scenarios || typeof manifest.scenarios !== 'object') {
            throw new Error('Invalid manifest: missing scenarios object');
        }
        
        if (!manifest.version) {
            throw new Error('Invalid manifest: missing version');
        }
        
        // Validate each scenario
        Object.entries(manifest.scenarios).forEach(([caseRef, scenario]) => {
            this.validateScenario(caseRef, scenario);
        });
    }
    
    /**
     * Validates a scenario structure.
     * @param {string} caseRef - Case reference ID
     * @param {Object} scenario - Scenario to validate
     */
    validateScenario(caseRef, scenario) {
        if (!scenario.title || !scenario.caseReference || !scenario.documents) {
            throw new Error(`Invalid scenario ${caseRef}: missing required fields`);
        }
        
        if (!Array.isArray(scenario.documents)) {
            throw new Error(`Invalid scenario ${caseRef}: documents must be an array`);
        }
        
        // Validate each document
        scenario.documents.forEach((doc, index) => {
            this.validateDocument(caseRef, index, doc);
        });
    }
    
    /**
     * Validates a document structure.
     * @param {string} caseRef - Case reference
     * @param {number} index - Document index
     * @param {Object} document - Document to validate
     */
    validateDocument(caseRef, index, document) {
        const required = ['fileName', 'exhibitLetter', 'documentType', 'publicContent', 'metadata'];
        
        required.forEach(field => {
            if (!document[field]) {
                throw new Error(`Invalid document ${caseRef}[${index}]: missing ${field}`);
            }
        });
        
        if (!document.metadata.dates || !Array.isArray(document.metadata.dates)) {
            throw new Error(`Invalid document ${caseRef}[${index}]: metadata.dates must be an array`);
        }
        
        if (!document.metadata.parties || !Array.isArray(document.metadata.parties)) {
            throw new Error(`Invalid document ${caseRef}[${index}]: metadata.parties must be an array`);
        }
        
        if (!document.metadata.keyTopics || !Array.isArray(document.metadata.keyTopics)) {
            throw new Error(`Invalid document ${caseRef}[${index}]: metadata.keyTopics must be an array`);
        }
    }
    
    /**
     * Gets documents for a specific case reference.
     * @param {string} caseReference - Case reference ID
     * @returns {Promise<Array>} Array of processed document objects
     */
    async getDocumentsForCase(caseReference) {
        const manifest = await this.loadManifest();
        const scenario = manifest.scenarios[caseReference];
        
        if (!scenario) {
            console.warn(`No documents found for case: ${caseReference}`);
            return [];
        }
        
        console.log(`Loading ${scenario.documents.length} documents for case: ${caseReference}`);
        
        // Process each document to combine public and secret content
        return scenario.documents.map(doc => this.processDocument(doc, caseReference));
    }
    
    /**
     * Processes a document by combining public content with decoded secrets.
     * @param {Object} documentData - Raw document from manifest
     * @param {string} caseReference - Case reference for context
     * @returns {Object} Processed document ready for use
     */
    processDocument(documentData, caseReference) {
        // Decode secret data if present
        let secretInfo = {};
        if (documentData.secretData) {
            try {
                const decodedSecret = atob(documentData.secretData);
                secretInfo = JSON.parse(decodedSecret);
            } catch (error) {
                console.warn(`Failed to decode secret data for ${documentData.fileName}:`, error);
            }
        }
        
        // Combine public content with any secret content
        const fullContent = this.combineContent(documentData.publicContent, secretInfo);
        
        // Enhanced metadata including secret information
        const enhancedMetadata = {
            ...documentData.metadata,
            fileName: documentData.fileName,
            documentType: documentData.documentType,
            isPreBuilt: true,
            caseReference: caseReference,
            // Add secret metadata if available
            ...(secretInfo.relevance && { secretRelevance: secretInfo.relevance }),
            ...(secretInfo.criticalInfo && { criticalInfo: secretInfo.criticalInfo }),
            ...(secretInfo.inconsistencies && { inconsistencies: secretInfo.inconsistencies })
        };
        
        // Create document object compatible with existing document service
        return {
            id: `manifest_${caseReference}_${documentData.exhibitLetter}`,
            fileName: documentData.fileName,
            exhibitLetter: documentData.exhibitLetter,
            textContent: fullContent,
            tokenCount: this.estimateTokenCount(fullContent),
            summary: fullContent.length > 2000 ? this.createSummary(fullContent) : null,
            metadata: enhancedMetadata,
            uploadDate: new Date().toISOString(),
            isActive: false
        };
    }
    
    /**
     * Combines public content with secret information to create full document.
     * @param {string} publicContent - Publicly visible content
     * @param {Object} secretInfo - Decoded secret information
     * @returns {string} Combined full document content
     */
    combineContent(publicContent, secretInfo) {
        let fullContent = publicContent;
        
        // Replace [REDACTED] or similar placeholders with secret info
        if (secretInfo.guestName) {
            fullContent = fullContent.replace(/\[REDACTED FOR PRIVACY\]/g, secretInfo.guestName);
            fullContent = fullContent.replace(/Guest: \[REDACTED\]/g, `Guest: ${secretInfo.guestName}`);
        }
        
        if (secretInfo.fullPhoneNumber) {
            fullContent = fullContent.replace(/\(713\) 555-\[REDACTED\]/g, secretInfo.fullPhoneNumber);
            fullContent = fullContent.replace(/Redacted number registered to \[CONFIDENTIAL\]/g, 
                `Note: ${secretInfo.fullPhoneNumber} registered to ${secretInfo.registeredTo}`);
        }
        
        // Add additional entries if present
        if (secretInfo.additionalEntries && Array.isArray(secretInfo.additionalEntries)) {
            fullContent += '\n\n' + secretInfo.additionalEntries.join('\n\n');
        }
        
        // Add officer notes if present
        if (secretInfo.officerNotes) {
            fullContent += '\n\nOFFICER NOTES (CONFIDENTIAL):\n' + secretInfo.officerNotes;
        }
        
        // Add disposition details
        if (secretInfo.dispositionDetail) {
            fullContent += '\n\nDETAILED DISPOSITION:\n' + secretInfo.dispositionDetail;
        }
        
        return fullContent;
    }
    
    /**
     * Estimates token count for text content.
     * @param {string} text - Text to count tokens for
     * @returns {number} Estimated token count
     */
    estimateTokenCount(text) {
        // Rough estimation: ~0.75 tokens per word
        const wordCount = text.trim().split(/\s+/).length;
        return Math.ceil(wordCount * 0.75);
    }
    
    /**
     * Creates a summary for long documents.
     * @param {string} content - Full document content
     * @returns {string} Document summary
     */
    createSummary(content) {
        const lines = content.split('\n').filter(line => line.trim().length > 0);
        if (lines.length <= 5) return content;
        
        // Take first 2 and last 2 lines with indicator
        return lines.slice(0, 2).join('\n') + 
               '\n\n[... content abbreviated ...]\n\n' + 
               lines.slice(-2).join('\n');
    }
    
    /**
     * Gets available scenarios.
     * @returns {Promise<Array>} Array of scenario information
     */
    async getAvailableScenarios() {
        const manifest = await this.loadManifest();
        
        return Object.entries(manifest.scenarios).map(([caseRef, scenario]) => ({
            caseReference: caseRef,
            title: scenario.title,
            description: scenario.description,
            documentCount: scenario.documents.length
        }));
    }
    
    /**
     * Gets the content creation guide from the manifest.
     * @returns {Promise<Object>} Content creation guide
     */
    async getContentCreationGuide() {
        const manifest = await this.loadManifest();
        return manifest.contentCreationGuide || {};
    }
    
    /**
     * Clears the manifest cache (useful for development/testing).
     */
    clearCache() {
        this.manifestCache = null;
        this.loadPromise = null;
        console.log('Document manifest cache cleared');
    }
    
    /**
     * Gets statistics about the manifest.
     * @returns {Promise<Object>} Manifest statistics
     */
    async getManifestStatistics() {
        const manifest = await this.loadManifest();
        
        let totalDocuments = 0;
        let totalTokens = 0;
        const documentTypes = {};
        
        Object.values(manifest.scenarios).forEach(scenario => {
            totalDocuments += scenario.documents.length;
            
            scenario.documents.forEach(doc => {
                const content = this.combineContent(doc.publicContent, 
                    doc.secretData ? JSON.parse(atob(doc.secretData)) : {});
                totalTokens += this.estimateTokenCount(content);
                
                const type = doc.documentType;
                documentTypes[type] = (documentTypes[type] || 0) + 1;
            });
        });
        
        return {
            version: manifest.version,
            scenarioCount: Object.keys(manifest.scenarios).length,
            totalDocuments,
            estimatedTotalTokens: totalTokens,
            documentTypes,
            averageDocumentsPerScenario: Math.round(totalDocuments / Object.keys(manifest.scenarios).length)
        };
    }
}

// Export singleton instance
export const documentManifestLoader = new DocumentManifestLoader();