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
     * Load a witness from the new JSON structure
     * @param {string} witnessFile - Filename like 'eyewitness-john-sterling.json'
     * @returns {Promise<Object>} Witness data
     */
    async loadWitness(witnessFile) {
        if (this.witnessCache.has(witnessFile)) {
            return this.witnessCache.get(witnessFile);
        }
        
        try {
            const response = await fetch(`/data/witnesses/${witnessFile}`);
            if (!response.ok) {
                throw new Error(`Failed to load witness file: ${witnessFile}`);
            }
            
            const witnessData = await response.json();
            this.witnessCache.set(witnessFile, witnessData);
            return witnessData;
        } catch (error) {
            console.error('Error loading witness:', error);
            throw error;
        }
    }
    
    /**
     * Load a scenario definition
     * @param {string} scenarioFile - Filename like 'homicide-eyewitness.json'
     * @returns {Promise<Object>} Scenario data
     */
    async loadScenario(scenarioFile) {
        if (this.scenarioCache.has(scenarioFile)) {
            return this.scenarioCache.get(scenarioFile);
        }
        
        try {
            const response = await fetch(`/data/scenarios/${scenarioFile}`);
            if (!response.ok) {
                throw new Error(`Failed to load scenario file: ${scenarioFile}`);
            }
            
            const scenarioData = await response.json();
            this.scenarioCache.set(scenarioFile, scenarioData);
            return scenarioData;
        } catch (error) {
            console.error('Error loading scenario:', error);
            throw error;
        }
    }
    
    /**
     * Load documents for a scenario
     * @param {string} documentsFile - Filename like 'homicide-eyewitness-docs.json'
     * @returns {Promise<Object>} Documents data
     */
    async loadDocuments(documentsFile) {
        if (this.documentCache.has(documentsFile)) {
            return this.documentCache.get(documentsFile);
        }
        
        try {
            const response = await fetch(`/data/documents/${documentsFile}`);
            if (!response.ok) {
                throw new Error(`Failed to load documents file: ${documentsFile}`);
            }
            
            const documentsData = await response.json();
            this.documentCache.set(documentsFile, documentsData);
            return documentsData;
        } catch (error) {
            console.error('Error loading documents:', error);
            throw error;
        }
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
        
        if (doc.secretContent) {
            // Replace placeholders with secret content
            if (doc.secretContent.guestName) {
                content = content.replace(/\[REDACTED FOR PRIVACY\]/g, doc.secretContent.guestName);
            }
            if (doc.secretContent.fullPhoneNumber) {
                content = content.replace(/\(713\) 555-\[REDACTED\]/g, doc.secretContent.fullPhoneNumber);
                content = content.replace(/\[CONFIDENTIAL\]/g, doc.secretContent.registeredTo);
            }
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