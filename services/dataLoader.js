// services/dataLoader.js

/**
 * Dynamic data loader for the new JSON file structure
 * Replaces hard-coded base64 scenarios with clean file-based loading
 */
export class DataLoader {
    
    constructor() {
        this.witnessCache = new Map();
        this.scenarioCache = new Map();
        this.documentCache = new Map();
    }
    
    /**
     * Generic method to load JSON files with caching
     * @param {string} type - Data type (witnesses, scenarios, documents)
     * @param {string} filename - Filename to load
     * @param {Map} cache - Cache to use for this type
     * @returns {Promise<Object>} Loaded data
     */
    async loadJsonFile(type, filename, cache) {
        if (cache.has(filename)) {
            return cache.get(filename);
        }
        
        try {
            const response = await fetch(`/data/${type}/${filename}`);
            if (!response.ok) {
                throw new Error(`Failed to load ${type} file: ${filename}`);
            }
            
            const data = await response.json();
            cache.set(filename, data);
            return data;
        } catch (error) {
            console.error(`Error loading ${type}:`, error);
            throw error;
        }
    }
    
    /**
     * Load a witness from the new JSON structure
     * @param {string} witnessFile - Filename like 'eyewitness-john-sterling.json'
     * @returns {Promise<Object>} Witness data
     */
    async loadWitness(witnessFile) {
        return this.loadJsonFile('witnesses', witnessFile, this.witnessCache);
    }
    
    /**
     * Load a scenario definition
     * @param {string} scenarioFile - Filename like 'homicide-eyewitness.json'
     * @returns {Promise<Object>} Scenario data
     */
    async loadScenario(scenarioFile) {
        return this.loadJsonFile('scenarios', scenarioFile, this.scenarioCache);
    }
    
    /**
     * Load documents for a scenario
     * @param {string} documentsFile - Filename like 'homicide-eyewitness-docs.json'
     * @returns {Promise<Object>} Documents data
     */
    async loadDocuments(documentsFile) {
        return this.loadJsonFile('documents', documentsFile, this.documentCache);
    }
    
    /**
     * Load complete scenario with witness and documents
     * @param {string} scenarioId - ID like 'homicide-eyewitness'
     * @returns {Promise<Object>} Complete scenario data
     */
    async loadCompleteScenario(scenarioId) {
        try {
            // Load scenario definition
            const scenario = await this.loadScenario(`${scenarioId}.json`);
            
            // Load associated witness
            const witness = await this.loadWitness(scenario.witness.file);
            
            // Load associated documents
            const documents = await this.loadDocuments(scenario.documents.file);
            
            return {
                scenario,
                witness,
                documents
            };
        } catch (error) {
            console.error('Error loading complete scenario:', error);
            throw error;
        }
    }
    
    /**
     * Get list of available scenarios by scanning directory
     * @returns {Promise<Array>} Array of scenario info
     */
    async getAvailableScenarios() {
        // For now, return hard-coded list. Later we could scan directory
        return [
            {
                id: 'homicide-eyewitness',
                title: 'Homicide Case - Eyewitness with Secret Affair',
                description: 'John Sterling witnesses stabbing but hides affair'
            }
        ];
    }
    
    /**
     * Convert witness data to format expected by existing code
     * @param {Object} witnessData - New format witness data
     * @returns {Object} Legacy format for compatibility
     */
    convertWitnessToLegacyFormat(witnessData) {
        return {
            name: witnessData.personalDetails.fullName,
            witnessProfile: {
                witnessId: witnessData.witnessProfile.witnessId,
                caseReference: witnessData.witnessProfile.caseReference
            },
            witnessBackground: {
                personalDetails: witnessData.personalDetails,
                professionalLife: witnessData.professionalLife,
                personalLifeAndRelationships: witnessData.personalLifeAndRelationships
            },
            witnessMotivations: witnessData.witnessMotivations,
            fullWitnessInformation: {
                officialStatementSummary: witnessData.officialStatement.summary,
                narrativeOfEvents: witnessData.actualEvents,
                descriptionOfPerpetrator: witnessData.perpetratorDescription,
                inconsistenciesAndEvasions: witnessData.vulnerabilities
            }
        };
    }
    
    /**
     * Convert documents to format expected by document service
     * @param {Object} documentsData - New format documents
     * @returns {Array} Array of documents for document service
     */
    convertDocumentsToServiceFormat(documentsData) {
        return documentsData.documents.map(doc => ({
            id: `new_format_${doc.exhibitLetter}`,
            fileName: doc.fileName,
            exhibitLetter: doc.exhibitLetter,
            textContent: this.combineDocumentContent(doc),
            tokenCount: Math.ceil(doc.publicContent.split(/\s+/).length * 0.75),
            summary: doc.publicContent.length > 2000 ? this.createSummary(doc.publicContent) : null,
            metadata: {
                ...doc.metadata,
                documentType: doc.documentType,
                isPreBuilt: true,
                caseReference: documentsData.caseReference,
                secretInfo: doc.secretContent
            },
            uploadDate: new Date().toISOString(),
            isActive: false
        }));
    }
    
    /**
     * Combine public content with secrets for full document view
     * @param {Object} doc - Document with publicContent and secretContent
     * @returns {string} Combined content
     */
    combineDocumentContent(doc) {
        let content = doc.publicContent;
        
        if (doc.secretContent && typeof doc.secretContent === 'object') {
            // Safely replace placeholders with validated secret content
            const replacements = [
                {
                    pattern: /\[REDACTED FOR PRIVACY\]/g,
                    value: doc.secretContent.guestName
                },
                {
                    pattern: /\(713\) 555-\[REDACTED\]/g,
                    value: doc.secretContent.fullPhoneNumber
                },
                {
                    pattern: /\[CONFIDENTIAL\]/g,
                    value: doc.secretContent.registeredTo
                }
            ];
            
            replacements.forEach(({ pattern, value }) => {
                if (value && typeof value === 'string' && value.length < 100) {
                    // Sanitize value to prevent injection
                    const sanitizedValue = value.replace(/[<>]/g, '');
                    content = content.replace(pattern, sanitizedValue);
                }
            });
        }
        
        return content;
    }
    
    /**
     * Create summary for long documents
     * @param {string} content - Document content
     * @returns {string} Summary
     */
    createSummary(content) {
        const lines = content.split('\n').filter(line => line.trim().length > 0);
        if (lines.length <= 5) return content;
        
        return lines.slice(0, 2).join('\n') + 
               '\n\n[... content abbreviated ...]\n\n' + 
               lines.slice(-2).join('\n');
    }
}

// Export singleton instance
export const dataLoader = new DataLoader();