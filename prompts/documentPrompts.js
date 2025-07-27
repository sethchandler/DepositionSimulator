// prompts/documentPrompts.js

/**
 * Document-specific prompt enhancements for realistic deposition document handling.
 */

/**
 * Enhanced opposing counsel instructions when documents are present in the deposition.
 * @param {Array<Object>} documents - Array of uploaded documents
 * @returns {string} Enhanced counsel instructions
 */
export function getDocumentAwareCounselInstructions(documents) {
    if (!documents || documents.length === 0) return '';
    
    const exhibitList = documents.map(doc => `Exhibit ${doc.exhibitLetter} (${doc.metadata.documentType})`).join(', ');
    
    return `

**DOCUMENT OBJECTION HANDLING (Documents present: ${exhibitList}):**

**FOUNDATION OBJECTIONS (CRITICAL):**
1. **Document Identification:** If deposing counsel asks about a document without proper foundation, object: "Objection, lacks foundation. Has the witness identified this document?"
2. **Authentication:** For any document reference, ensure proper authentication: "Objection, the document has not been authenticated."
3. **Best Evidence Rule:** If counsel asks about document contents without producing the document: "Objection, best evidence rule. The document itself should be produced."

**DOCUMENT FOUNDATION REQUIREMENTS:**
- Witness must identify the document before questions about its contents
- Document must be authenticated before admissibility 
- Original or certified copy should be produced when questioning about specific contents
- Witness must establish personal knowledge of the document's creation/receipt

**COMMON FOUNDATION OBJECTIONS:**
- "Objection, lacks foundation. The witness hasn't identified this document."
- "Objection, the document hasn't been shown to the witness."
- "Objection, no foundation has been laid for the authenticity of this document."
- "Objection, the witness hasn't established personal knowledge of this document."

**PROCEDURAL OBJECTIONS:**
- If exhibit not marked: "Objection, the document should be marked as an exhibit before questioning."
- If questioning about contents without showing: "Objection, the witness should be shown the document before being asked about its contents."

**PRIVILEGE REVIEW:** Carefully review any documents for potential privilege issues (attorney-client, work product, etc.) and object appropriately.`;
}

/**
 * Enhanced judge instructions when documents are present in the deposition.
 * @param {Array<Object>} documents - Array of uploaded documents
 * @returns {string} Enhanced judge instructions
 */
export function getDocumentAwareJudgeInstructions(documents) {
    if (!documents || documents.length === 0) return '';
    
    const exhibitList = documents.map(doc => `Exhibit ${doc.exhibitLetter} (${doc.metadata.documentType})`).join(', ');
    
    return `

**DOCUMENT HANDLING PROCEDURES (Documents present: ${exhibitList}):**

**FOUNDATION REQUIREMENTS:**
Before allowing questions about document contents, ensure proper foundation:
1. **Document Identification:** "Has the witness identified this document?"
2. **Authentication:** "Has the document been authenticated?"
3. **Personal Knowledge:** "Does the witness have personal knowledge of this document?"

**EXHIBIT MARKING PROTOCOL:**
- Documents should be marked as exhibits before detailed questioning
- Use format: "The [document type] is marked as Deposition Exhibit [Letter]"
- Track exhibit assignments consistently throughout deposition

**COMMON RULINGS:**
- Foundation objections: Generally sustained until proper foundation laid
- Authentication: "Deposing counsel, please establish authentication before proceeding"
- Best evidence: "Please produce the document before questioning about its specific contents"

**FOUNDATION DIALOGUE EXAMPLES:**
- "Deposing counsel, before questioning about the document's contents, please have the witness identify it."
- "The objection is sustained. Please lay proper foundation for document authentication."
- "I'll allow limited foundational questions, but establish the witness's familiarity with this document first."

**PRIVILEGE CONSIDERATIONS:**
- Review documents for potential privilege issues
- Allow opposing counsel reasonable time to review unfamiliar documents for privilege
- Rule on privilege objections with document context in mind`;
}

/**
 * Enhanced witness instructions when documents are present.
 * @param {Array<Object>} documents - Array of uploaded documents
 * @returns {string} Enhanced witness instructions
 */
export function getDocumentAwareWitnessInstructions(documents) {
    if (!documents || documents.length === 0) return '';
    
    return `

**DOCUMENT RESPONSE GUIDELINES:**

**DOCUMENT IDENTIFICATION:**
- When shown a document, identify it specifically: "Yes, this is an email I sent on July 13, 2019"
- Be honest about familiarity: "I don't recognize this document" or "I may have seen this before but I'm not certain"
- Describe what you see: "This appears to be a contract, but I haven't reviewed it carefully"

**DOCUMENT CONTENT QUESTIONS:**
- Only answer about contents you can actually see or remember
- Reference specific parts: "Looking at the second paragraph..." or "Based on what I wrote here..."
- Distinguish between document contents and your memory: "The email says X, but I remember Y"

**AUTHENTICATION RESPONSES:**
- Answer honestly about document origins: "Yes, I wrote this email" or "This looks like my signature, but I'd need to examine it more closely"
- Acknowledge uncertainty: "This appears to be my handwriting, but I can't be completely certain"
- Don't guess about document creation: "I don't remember creating this specific document"

**EXHIBIT AWARENESS:**
When documents are marked as exhibits, acknowledge appropriately: "Looking at what's been marked as Exhibit A..." or "Referring to Exhibit B..."`;
}

/**
 * Get document foundation prompt for context injection.
 * @param {string} documentContent - Full document content
 * @param {Object} documentMetadata - Document metadata
 * @returns {string} Foundation prompt
 */
export function getDocumentFoundationPrompt(documentContent, documentMetadata) {
    return `

**DOCUMENT AVAILABLE FOR REFERENCE:**
${documentContent}

**DOCUMENT FOUNDATION STATUS:**
- This document has been uploaded for potential use in this deposition
- Proper foundation must be established before detailed questioning about its contents
- The witness should identify and authenticate the document before content-specific questions
- Follow realistic deposition procedures for document handling

**EXHIBIT TRACKING:**
- This document is assigned as Deposition Exhibit ${documentMetadata.exhibitLetter}
- Reference it consistently as "Exhibit ${documentMetadata.exhibitLetter}" once marked
- Maintain exhibit continuity throughout the deposition`;
}

/**
 * Get prompts for realistic document objection scenarios.
 * @returns {Object} Object containing various objection scenarios
 */
export function getDocumentObjectionScenarios() {
    return {
        lackOfFoundation: {
            trigger: "Question about document contents without proper foundation",
            objection: "Objection, lacks foundation. Has the witness identified this document?",
            judgeResponse: "Sustained. Deposing counsel, please have the witness identify the document before questioning about its contents."
        },
        
        authentication: {
            trigger: "Using document without establishing authenticity",
            objection: "Objection, the document has not been authenticated.",
            judgeResponse: "Deposing counsel, please establish the authenticity of this document before proceeding."
        },
        
        bestEvidence: {
            trigger: "Asking about document contents without producing document",
            objection: "Objection, best evidence rule. The document itself should be produced.",
            judgeResponse: "Sustained. Please produce the document if you're going to question about its specific contents."
        },
        
        notShownToWitness: {
            trigger: "Questioning about document not shown to witness",
            objection: "Objection, the document hasn't been shown to the witness.",
            judgeResponse: "Sustained. Please show the document to the witness before questioning about it."
        },
        
        unmarkedExhibit: {
            trigger: "Detailed questioning about document not marked as exhibit",
            objection: "Objection, the document should be marked as an exhibit before detailed questioning.",
            judgeResponse: "I'll allow foundational questions, but please mark the document as an exhibit for detailed inquiry."
        }
    };
}

/**
 * Generate context-aware document prompts based on user input.
 * @param {string} userInput - User's question
 * @param {Array<Object>} referencedDocuments - Documents referenced in the question
 * @returns {string} Enhanced prompt instructions
 */
export function generateDocumentContextPrompt(userInput, referencedDocuments) {
    if (!referencedDocuments || referencedDocuments.length === 0) return '';
    
    const doc = referencedDocuments[0]; // Use first referenced document
    
    // Analyze the type of question being asked
    const questionType = analyzeDocumentQuestion(userInput);
    
    let prompt = `\n**DOCUMENT CONTEXT ACTIVE:**\n`;
    prompt += `The deposing attorney is referencing Exhibit ${doc.exhibitLetter} (${doc.metadata.documentType}): ${doc.fileName}\n\n`;
    
    switch (questionType) {
        case 'identification':
            prompt += `**IDENTIFICATION PHASE:** The attorney is asking the witness to identify this document. The witness should look at it and respond honestly about their familiarity with it.\n`;
            break;
            
        case 'authentication':
            prompt += `**AUTHENTICATION PHASE:** The attorney is establishing the authenticity of this document. The witness should respond about their role in creating/receiving it.\n`;
            break;
            
        case 'content':
            prompt += `**CONTENT QUESTIONING:** The attorney is asking about the substance of this document. Ensure proper foundation has been laid before allowing detailed content questions.\n`;
            break;
            
        case 'impeachment':
            prompt += `**POTENTIAL IMPEACHMENT:** The attorney may be trying to impeach the witness with this document. The witness should carefully compare their testimony with what the document actually says.\n`;
            break;
            
        default:
            prompt += `**DOCUMENT REFERENCE:** The attorney has referenced this document. Follow proper deposition procedures for document handling.\n`;
    }
    
    return prompt;
}

/**
 * Analyze the type of document-related question being asked.
 * @param {string} userInput - User's question
 * @returns {string} Question type
 */
function analyzeDocumentQuestion(userInput) {
    const lowerInput = userInput.toLowerCase();
    
    if (lowerInput.includes('familiar with') || lowerInput.includes('seen this') || lowerInput.includes('recognize')) {
        return 'identification';
    }
    
    if (lowerInput.includes('did you write') || lowerInput.includes('did you send') || lowerInput.includes('your signature')) {
        return 'authentication';
    }
    
    if (lowerInput.includes('what does it say') || lowerInput.includes('according to') || lowerInput.includes('states that')) {
        return 'content';
    }
    
    if (lowerInput.includes("that's not what") || lowerInput.includes('different from') || lowerInput.includes('inconsistent')) {
        return 'impeachment';
    }
    
    return 'general';
}