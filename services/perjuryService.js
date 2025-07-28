// services/perjuryService.js

/**
 * Enhanced perjury sensitivity service for realistic witness behavior modeling.
 * This service evaluates witness truthfulness dynamically based on multiple factors.
 */
export class PerjuryService {
    
    constructor() {
        this.questionHistory = [];
        this.lieHistory = [];
        this.witnessStressLevel = 0;
        this.currentSession = {
            basePerjuryRisk: 0,
            witnessProfile: null,
            secretsExposed: 0,
            pressureLevel: 0
        };
    }
    
    /**
     * Initializes a new deposition session with witness profile.
     * @param {Object} witness - Witness object containing motivations and background
     */
    initializeSession(witness) {
        this.questionHistory = [];
        this.lieHistory = [];
        this.witnessStressLevel = 0;
        
        this.currentSession = {
            basePerjuryRisk: witness.witnessMotivations?.perjuryRisk || 0,
            witnessProfile: witness,
            secretsExposed: 0,
            pressureLevel: 0,
            consistencyTracker: new Map(),
            evasionCount: 0,
            directLieCount: 0
        };
        
        console.log(`Perjury Service initialized for witness with base risk: ${this.currentSession.basePerjuryRisk}`);
    }
    
    /**
     * Evaluates witness truthfulness for a specific question using multiple factors.
     * @param {string} userQuestion - The question being asked
     * @param {Array} messageHistory - Previous Q&A history
     * @param {Array} documentContexts - Any relevant documents in context
     * @returns {Object} Truthfulness analysis and behavior recommendation
     */
    evaluateQuestionThreat(userQuestion, messageHistory = [], documentContexts = []) {
        if (!this.currentSession.witnessProfile) {
            console.warn('PerjuryService: No witness profile initialized');
            return this.getDefaultBehavior();
        }
        
        const analysis = {
            questionType: this.categorizeQuestion(userQuestion),
            threatLevel: this.calculateThreatLevel(userQuestion, documentContexts),
            stressFactors: this.analyzeStressFactors(userQuestion, messageHistory),
            consistencyRisk: this.evaluateConsistencyRisk(userQuestion),
            recommendedBehavior: 'truthful',
            perjuryProbability: 0,
            evasionProbability: 0,
            explanation: ''
        };
        
        // Calculate dynamic perjury probability
        analysis.perjuryProbability = this.calculatePerjuryProbability(analysis);
        analysis.evasionProbability = this.calculateEvasionProbability(analysis);
        
        // Determine recommended behavior
        analysis.recommendedBehavior = this.determineBehavior(analysis);
        analysis.explanation = this.generateBehaviorExplanation(analysis);
        
        // Record this analysis for future consistency
        this.recordQuestionAnalysis(userQuestion, analysis);
        
        return analysis;
    }
    
    /**
     * Categorizes the type of question being asked.
     * @param {string} question - User question
     * @returns {string} Question category
     */
    categorizeQuestion(question) {
        const lowerQ = question.toLowerCase();
        
        // Direct confrontation about key facts
        if (lowerQ.includes('isn\'t it true') || lowerQ.includes('did you not') || 
            lowerQ.includes('you lied') || lowerQ.includes('that\'s not true')) {
            return 'confrontational';
        }
        
        // Timeline/whereabouts questions
        if (lowerQ.includes('where were you') || lowerQ.includes('what time') || 
            lowerQ.includes('when did') || lowerQ.includes('how long')) {
            return 'timeline';
        }
        
        // Relationship/personal questions
        if (lowerQ.includes('relationship') || lowerQ.includes('affair') || 
            lowerQ.includes('romantic') || lowerQ.includes('intimate')) {
            return 'personal';
        }
        
        // Document-specific questions
        if (lowerQ.includes('exhibit') || lowerQ.includes('document') || 
            lowerQ.includes('email') || lowerQ.includes('receipt')) {
            return 'documentary';
        }
        
        // Background/safe questions
        if (lowerQ.includes('your name') || lowerQ.includes('your job') || 
            lowerQ.includes('where do you work')) {
            return 'background';
        }
        
        return 'general';
    }
    
    /**
     * Calculates the threat level of a question to the witness's secrets.
     * @param {string} question - User question
     * @param {Array} documentContexts - Any relevant documents
     * @returns {number} Threat level (0-1)
     */
    calculateThreatLevel(question, documentContexts = []) {
        const witness = this.currentSession.witnessProfile;
        const motivations = witness.witnessMotivations || {};
        const secretInfo = motivations.primaryMotivationToConceal || '';
        
        let threatLevel = 0;
        const lowerQ = question.toLowerCase();
        const lowerSecret = secretInfo.toLowerCase();
        
        // Check if question directly relates to the secret
        const secretKeywords = this.extractSecretKeywords(secretInfo);
        secretKeywords.forEach(keyword => {
            if (lowerQ.includes(keyword)) {
                threatLevel += 0.3;
            }
        });
        
        // Check if documents contain compromising information
        if (documentContexts.length > 0) {
            documentContexts.forEach(docContent => {
                if (this.documentComplicatesStory(docContent, witness)) {
                    threatLevel += 0.4;
                }
            });
        }
        
        // Escalate based on question directness
        if (lowerQ.includes('truth') || lowerQ.includes('honest') || lowerQ.includes('lie')) {
            threatLevel += 0.2;
        }
        
        // Timeline questions are threatening if witness has timeline issues
        if (this.categorizeQuestion(question) === 'timeline' && 
            secretInfo.includes('time') || secretInfo.includes('when')) {
            threatLevel += 0.3;
        }
        
        return Math.min(threatLevel, 1.0);
    }
    
    /**
     * Analyzes current stress factors affecting the witness.
     * @param {string} question - Current question
     * @param {Array} messageHistory - Previous messages
     * @returns {Object} Stress analysis
     */
    analyzeStressFactors(question, messageHistory) {
        const recentMessages = messageHistory.slice(-6); // Last 3 Q&As
        
        let consecutivePressure = 0;
        let objectionCount = 0;
        let aggressiveTone = 0;
        
        recentMessages.forEach(msg => {
            if (msg.role === 'user') {
                const lowerContent = msg.content.toLowerCase();
                
                // Check for aggressive questioning patterns
                if (lowerContent.includes('isn\'t it true') || lowerContent.includes('you said') ||
                    lowerContent.includes('but earlier') || lowerContent.includes('contradicts')) {
                    consecutivePressure++;
                }
                
                // Check for aggressive tone indicators
                if (lowerContent.includes('!') || lowerContent.includes('clearly') ||
                    lowerContent.includes('obviously') || lowerContent.includes('admit')) {
                    aggressiveTone++;
                }
            } else if (msg.role === 'assistant') {
                // Check for objections in responses
                if (msg.content.toLowerCase().includes('objection')) {
                    objectionCount++;
                }
            }
        });
        
        // Update session stress level
        this.witnessStressLevel = Math.min(
            this.witnessStressLevel + (consecutivePressure * 0.2) + (aggressiveTone * 0.1),
            1.0
        );
        
        return {
            consecutivePressure,
            objectionCount,
            aggressiveTone,
            currentStressLevel: this.witnessStressLevel,
            isUnderPressure: consecutivePressure >= 2 || this.witnessStressLevel > 0.6
        };
    }
    
    /**
     * Evaluates the risk of creating inconsistencies.
     * @param {string} question - Current question
     * @returns {number} Consistency risk (0-1)
     */
    evaluateConsistencyRisk(question) {
        const questionKey = this.normalizeQuestionForConsistency(question);
        
        // Check if we've answered similar questions before
        if (this.currentSession.consistencyTracker.has(questionKey)) {
            const previousAnswer = this.currentSession.consistencyTracker.get(questionKey);
            
            // High risk if we lied before about this topic
            if (previousAnswer.wasLie) {
                return 0.8;
            }
            
            // Medium risk if we were evasive
            if (previousAnswer.wasEvasive) {
                return 0.5;
            }
        }
        
        // Check if this question could contradict document evidence
        return 0.1; // Base consistency risk
    }
    
    /**
     * Calculates the probability that the witness will commit perjury.
     * @param {Object} analysis - Question threat analysis
     * @returns {number} Perjury probability (0-1)
     */
    calculatePerjuryProbability(analysis) {
        let probability = this.currentSession.basePerjuryRisk;
        
        // Increase based on threat level
        probability += analysis.threatLevel * 0.4;
        
        // Increase based on stress
        if (analysis.stressFactors.isUnderPressure) {
            probability += 0.2;
        }
        
        // Increase if already lying (escalating commitment)
        if (this.currentSession.directLieCount > 0) {
            probability += this.currentSession.directLieCount * 0.15;
        }
        
        // Decrease if high consistency risk (avoid contradictions)
        if (analysis.consistencyRisk > 0.5) {
            probability -= 0.3;
        }
        
        // Question type modifiers
        switch (analysis.questionType) {
            case 'confrontational':
                probability += 0.3;
                break;
            case 'documentary':
                probability -= 0.2; // Harder to lie about documents
                break;
            case 'background':
                probability -= 0.4; // No reason to lie about basic facts
                break;
        }
        
        return Math.max(0, Math.min(probability, 0.95)); // Cap at 95%
    }
    
    /**
     * Calculates the probability of evasive behavior.
     * @param {Object} analysis - Question threat analysis
     * @returns {number} Evasion probability (0-1)
     */
    calculateEvasionProbability(analysis) {
        let probability = 0.3; // Base evasion probability
        
        // Increase based on threat level
        probability += analysis.threatLevel * 0.5;
        
        // Increase if perjury risk is moderate (evasion as alternative to lying)
        if (analysis.perjuryProbability > 0.3 && analysis.perjuryProbability < 0.7) {
            probability += 0.3;
        }
        
        // Increase based on consistency risk (evasion safer than contradicting)
        probability += analysis.consistencyRisk * 0.4;
        
        return Math.min(probability, 0.9);
    }
    
    /**
     * Determines the recommended witness behavior.
     * @param {Object} analysis - Complete threat analysis
     * @returns {string} Behavior recommendation
     */
    determineBehavior(analysis) {
        // Use random rolls against calculated probabilities
        const perjuryRoll = Math.random();
        const evasionRoll = Math.random();
        
        if (perjuryRoll < analysis.perjuryProbability) {
            this.currentSession.directLieCount++;
            return 'perjury';
        }
        
        if (evasionRoll < analysis.evasionProbability) {
            this.currentSession.evasionCount++;
            return 'evasive';
        }
        
        return 'truthful';
    }
    
    /**
     * Generates an explanation for the behavioral recommendation.
     * @param {Object} analysis - Complete analysis
     * @returns {string} Explanation text
     */
    generateBehaviorExplanation(analysis) {
        const behavior = analysis.recommendedBehavior;
        const witness = this.currentSession.witnessProfile;
        const motivations = witness.witnessMotivations || {};
        
        switch (behavior) {
            case 'perjury':
                return `LYING: High threat to secret (${(analysis.threatLevel * 100).toFixed(0)}%), witness chooses to lie to protect: ${motivations.primaryMotivationToConceal}`;
                
            case 'evasive':
                return `EVASIVE: Moderate threat, witness uses evasion rather than direct lies. Current stress: ${(analysis.stressFactors.currentStressLevel * 100).toFixed(0)}%`;
                
            case 'truthful':
                return `TRUTHFUL: Low threat or witness maintains honesty. Question type: ${analysis.questionType}`;
                
            default:
                return 'Standard truthful response';
        }
    }
    
    /**
     * Records question analysis for consistency tracking.
     * @param {string} question - Original question
     * @param {Object} analysis - Analysis results
     */
    recordQuestionAnalysis(question, analysis) {
        const questionKey = this.normalizeQuestionForConsistency(question);
        
        this.currentSession.consistencyTracker.set(questionKey, {
            wasLie: analysis.recommendedBehavior === 'perjury',
            wasEvasive: analysis.recommendedBehavior === 'evasive',
            threatLevel: analysis.threatLevel,
            timestamp: Date.now()
        });
        
        this.questionHistory.push({
            question,
            analysis,
            timestamp: Date.now()
        });
    }
    
    /**
     * Helper methods
     */
    
    extractSecretKeywords(secretText) {
        const commonWords = new Set(['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by']);
        return secretText.toLowerCase()
            .split(/\s+/)
            .filter(word => word.length > 3 && !commonWords.has(word))
            .slice(0, 10);
    }
    
    documentComplicatesStory(docContent, witness) {
        const secretKeywords = this.extractSecretKeywords(witness.witnessMotivations?.primaryMotivationToConceal || '');
        const lowerDoc = docContent.toLowerCase();
        
        return secretKeywords.some(keyword => lowerDoc.includes(keyword));
    }
    
    normalizeQuestionForConsistency(question) {
        return question.toLowerCase()
            .replace(/[^a-z\s]/g, '')
            .split(/\s+/)
            .filter(word => word.length > 3)
            .sort()
            .slice(0, 5)
            .join(' ');
    }
    
    getDefaultBehavior() {
        return {
            questionType: 'general',
            threatLevel: 0,
            stressFactors: { currentStressLevel: 0, isUnderPressure: false },
            consistencyRisk: 0,
            recommendedBehavior: 'truthful',
            perjuryProbability: 0,
            evasionProbability: 0.1,
            explanation: 'No witness profile loaded - default truthful behavior'
        };
    }
    
    /**
     * Gets current session statistics.
     * @returns {Object} Session statistics
     */
    getSessionStatistics() {
        return {
            totalQuestions: this.questionHistory.length,
            directLies: this.currentSession.directLieCount,
            evasiveAnswers: this.currentSession.evasionCount,
            currentStressLevel: this.witnessStressLevel,
            basePerjuryRisk: this.currentSession.basePerjuryRisk,
            averageThreatLevel: this.questionHistory.length > 0 ? 
                this.questionHistory.reduce((sum, q) => sum + q.analysis.threatLevel, 0) / this.questionHistory.length : 0
        };
    }
}

// Export singleton instance
export const perjuryService = new PerjuryService();