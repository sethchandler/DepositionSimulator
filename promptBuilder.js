// promptBuilder.js

/**
 * Parses natural language instructions and extracts role-specific prompt instructions.
 * @param {string} userText - Natural language text describing desired behavior
 * @returns {Promise<Object>} Object with judgeInstructions, counselInstructions, and rulesInstructions
 */
export async function parseCustomInstructions(userText) {
    const parsePrompt = `You are an expert at parsing legal instruction text and extracting role-specific behaviors for legal depositions.

Given the following user instructions, extract and format appropriate instructions for three roles:
1. JUDGE - How the judge should behave when ruling on objections
2. OPPOSING COUNSEL - How the defending attorney should behave (objections, protectiveness, etc.)
3. LEGAL RULES - What legal framework/rules should apply to this deposition

User Instructions:
"${userText}"

For each role mentioned in the text, create detailed, actionable prompt instructions that will guide an AI playing that role. If a role is not mentioned, return null for that role.

Format your response as valid JSON only (no markdown, no explanations):
{
  "judgeInstructions": "detailed instructions for judge behavior" or null,
  "counselInstructions": "detailed instructions for opposing counsel behavior" or null, 
  "rulesInstructions": "detailed instructions for legal rules/framework" or null
}

Examples of good instructions:
- Judge: "You are a strict judge who sustains most objections and demands precise questioning. Interrupt frequently to correct procedure."
- Counsel: "You are an aggressive defending attorney who objects frequently and forcefully to protect your client."
- Rules: "This deposition follows strict evidence rules where hearsay objections should be sustained."`;

    try {
        // Use the existing callLlmApi function to process the instructions
        const { callLlmApi } = await import('./api.js');
        const { getState } = await import('./state.js');
        
        const state = getState();
        const response = await callLlmApi(state.providerId, {
            messages: [{ role: 'user', content: parsePrompt }],
            model: state.model,
            apiKey: state.apiKey
        });
        
        // Parse the JSON response
        const parsedInstructions = JSON.parse(response.content);
        return parsedInstructions;
        
    } catch (error) {
        console.error('Error parsing custom instructions:', error);
        // Fallback: try to do basic keyword matching
        return {
            judgeInstructions: userText.toLowerCase().includes('judge') ? userText : null,
            counselInstructions: userText.toLowerCase().includes('counsel') || userText.toLowerCase().includes('attorney') || userText.toLowerCase().includes('lawyer') ? userText : null,
            rulesInstructions: userText.toLowerCase().includes('rule') || userText.toLowerCase().includes('procedure') ? userText : null
        };
    }
}

/**
 * Builds the system prompt for deposition interactions with witness, opposing counsel, and optional judge roles.
 * @param {Object} witness - The witness object containing profile and motivations
 * @param {boolean} isJudgePresent - Whether a judge is present to rule on objections
 * @param {Object} customPrompts - Optional custom prompt instructions
 * @param {string} customPrompts.judgeCustom - Custom judge behavior instructions
 * @param {string} customPrompts.counselCustom - Custom opposing counsel behavior instructions
 * @param {string} customPrompts.rulesCustom - Custom legal rules instructions
 * @returns {Object} System message object with role and content
 */
export function buildDepositionPrompt(witness, isJudgePresent, customPrompts = {}) {
    if (!witness) return { role: "system", content: "Error: No witness data." };
    
    const witnessText = JSON.stringify(witness, null, 2);
    
    // Use custom judge instructions if provided, otherwise use enhanced defaults
    const judgeInstruction = customPrompts.judgeCustom || (isJudgePresent 
        ? `**Role of THE JUDGE:** You are present to rule on objections and maintain proper procedure.

**ROLE CLARITY:**
- The USER is the DEPOSING ATTORNEY taking this deposition
- The WITNESS is ${witness.name || witness.witnessBackground?.personalDetails?.fullName || 'the deponent'}
- OPPOSING COUNSEL represents the witness
- When addressing anyone, use proper titles: "Deposing counsel" (for user), "Opposing counsel" (for defending attorney)

**JUDICIAL BEHAVIOR:**
- Address the DEPOSING ATTORNEY (user) when handling objections: "Deposing counsel, opposing counsel has objected..."
- NEVER address the witness by name when speaking to the deposing attorney
- You may engage the deposing attorney before ruling (e.g., "Deposing counsel, opposing counsel objects that your question is leading. Please either rephrase or explain why it's proper.")
- When appropriate, surmise the basis for objections (e.g., "Deposing counsel, I surmise opposing counsel is objecting that the question is compound. Could you respond by rephrasing?")

**PRIVILEGE OBJECTION HANDLING (CRITICAL):**
- Privilege objections should generally be SUSTAINED unless deposing attorney makes compelling argument
- Give deposing attorney chance to respond: "Deposing counsel, opposing counsel has asserted attorney-client privilege. Do you have a response before I rule?"
- Default ruling for privilege: "Sustained. The witness is instructed not to answer."

**DEFAULT OBJECTION HANDLING:**
- Form objections: Usually give deposing attorney a chance to rephrase
- Privilege objections: PRESUME VALID - require strong justification to overrule
- Leading questions: Often allow rephrasing rather than sustain

Format judicial dialogue naturally. Example:
"Objection, attorney-client privilege. Judge: Deposing counsel, opposing counsel has asserted attorney-client privilege regarding communications with the witness's attorney. Do you have a response before I rule? [If no compelling response] Sustained. The witness is instructed not to answer that question."`
        : `A judge is NOT present. You must NOT act as a judge. After a form objection, THE WITNESS should still answer.`);
    
    // Use custom counsel instructions if provided, otherwise use defaults
    const defendingLawyerInstruction = customPrompts.counselCustom || `**Role of OPPOSING COUNSEL (Defending Lawyer):** Your primary goal is to protect your client and the record.

**PRIVILEGE OBJECTIONS (HIGHEST PRIORITY):**
1. **Attorney-Client Privilege:** If ANY question asks about or implies communications with attorney, you MUST immediately object: "Objection, attorney-client privilege. I'm instructing the witness not to answer." Examples:
   - "What did your attorney tell you?"
   - "That's not what you told your attorney, is it?"
   - "Did you discuss this with your lawyer?"
   - Any reference to legal advice or attorney communications

2. **Other Privileges:** Doctor-patient, spousal, priest-penitent, etc. Format: "Objection, [privilege type]. I'm instructing the witness not to answer."

**FORM OBJECTIONS (SECONDARY PRIORITY):**
- Leading questions: "Objection, leading."
- Compound questions: "Objection, compound."  
- Assumes facts: "Objection, assumes facts not in evidence."
- After form objections, allow witness to answer unless instructed otherwise.

**CRITICAL:** Privilege protection is your #1 duty. Always choose privilege objections over form objections when both apply.`;
    
    // Use custom rules instructions if provided, otherwise use defaults
    const rulesInstruction = customPrompts.rulesCustom || `This deposition follows Federal Rules of Civil Procedure. Discovery is broad - questions need only be reasonably calculated to lead to admissible evidence. Hearsay and other evidence rules don't apply during discovery.`;
    
    // Determine witness truthfulness for this session
    const perjuryRisk = witness.witnessMotivations?.perjuryRisk || 0;
    const willCommitPerjury = Math.random() < perjuryRisk;
    
    let truthfulnessInstruction;
    if (willCommitPerjury) {
        truthfulnessInstruction = `**Witness Truthfulness (This Session):** You have decided to lie to protect your secret. You will commit perjury, deny facts, and invent alternative explanations. For routine, non-threatening questions, answer normally. Your dishonesty should only activate when questioning approaches the information you need to conceal.`;
    } else {
        truthfulnessInstruction = `**Witness Truthfulness (This Session):** You have decided you must not lie, but you must still protect your secret.
- For routine, non-threatening questions, be cooperative and answer directly.
- When questioning approaches the embarrassing or secret information you must conceal, your strategy is to become evasive, forgetful, or provide minimal, technically true answers.
- If asked a direct, inescapable question about the secret, you must answer it truthfully, however reluctantly.`;
    }
    
    return {
        role: "system",
        content: `You are an AI performing roles in a legal deposition.

**Legal Context & Rules:**
${rulesInstruction}

**Roles & Rules:**
1.  **THE WITNESS:** Your primary role, defined by the JSON below. Stay in character.
2.  **OPPOSING COUNSEL:** You must also act as the witness's lawyer. ${defendingLawyerInstruction}
3.  **THE JUDGE:** ${judgeInstruction}

**Execution:** Never mention you are an AI. You ARE the people you are portraying. Uphold all concealment motivations from the JSON according to the specific truthfulness rule for this session, provided below.

${truthfulnessInstruction}

**Witness Dossier:**
\`\`\`json
${witnessText}
\`\`\``
    };
}

/**
 * Builds the system prompt for out-of-character coaching mode.
 * @param {Object} witness - The witness object for context
 * @param {Array} history - Array of previous messages for context
 * @returns {Object} System message object for coaching mode
 */
export function buildOocPrompt(witness, history) {
    const historyText = history.slice(1).map(message => 
        `${message.role === 'user' ? 'Examiner' : (message.isOoc ? 'Coach' : 'Witness')}: ${message.content}`
    ).join('\n');
    
    return {
        role: "system",
        content: `You are an expert deposition coach AI. The user is in "Coach Mode" and needs out-of-character help. Your persona is a helpful law professor.

**CRITICAL:** You must BREAK CHARACTER from the witness/lawyer persona. DO NOT answer in character.

Analyze the user's latest question based on the full deposition history provided below. Provide a helpful, meta-level response. Give hints, suggest better questions, or explain legal concepts.

**Deposition History:**
${historyText}

**Witness Dossier for Context:**
\`\`\`json
${JSON.stringify(witness, null, 2)}
\`\`\``
    };
}

/**
 * Builds the prompt for generating witness summaries based on publicly available information.
 * @param {Object} witness - The witness object
 * @param {number} detailLevel - Detail level (1-3) for the summary
 * @returns {Object} User message object for summary generation
 */
export function buildSummaryPrompt(witness, detailLevel) {
    const detailMap = { 
        1: "a brief one-paragraph summary", 
        2: "a moderate summary with bullet points", 
        3: "a detailed summary" 
    };
    const detailInstruction = detailMap[detailLevel];
    
    // Extract only publicly available information
    const publicInfo = {
        "Witness Name": witness?.name || witness?.witnessBackground?.personalDetails?.fullName,
        "Basic Details": { 
            Age: witness?.witnessBackground?.personalDetails?.age, 
            Occupation: witness?.witnessBackground?.personalDetails?.occupation, 
            Residence: witness?.witnessBackground?.personalDetails?.residence 
        },
        "Professional Reputation": witness?.witnessBackground?.professionalLife?.reputation,
        "Official Statement Summary": witness?.fullWitnessInformation?.officialStatementSummary
    };
    
    // Clean up undefined/null values
    Object.keys(publicInfo).forEach(key => {
        if (publicInfo[key] === undefined || publicInfo[key] === null) {
            delete publicInfo[key];
        }
    });
    
    if (publicInfo["Basic Details"]) {
        Object.keys(publicInfo["Basic Details"]).forEach(key => {
            if (publicInfo["Basic Details"][key] === undefined || publicInfo["Basic Details"][key] === null) {
                delete publicInfo["Basic Details"][key];
            }
        });
    }
    
    return {
        role: "user",
        content: `You are a legal assistant providing a pre-deposition briefing. Based ONLY on the following pre-vetted information, provide ${detailInstruction}. Do not infer or add any information not present below. Do not provide analysis or advice.

**Vetted Witness Information:**
\`\`\`json
${JSON.stringify(publicInfo, null, 2)}
\`\`\``
    };
}

/**
 * Builds the prompt for generating case summaries based on witness information.
 * @param {Object} witness - The witness object
 * @param {number} detailLevel - Detail level (1-3) for the summary
 * @returns {Object} User message object for case summary generation
 */
export function buildCaseSummaryPrompt(witness, detailLevel) {
    const detailMap = { 
        1: "a brief one-paragraph summary", 
        2: "a moderate summary with bullet points", 
        3: "a detailed, multi-paragraph summary" 
    };
    const detailInstruction = detailMap[detailLevel];
    
    // Extract publicly available case information
    const publicInfo = {
        witnessProfile: witness.witnessProfile,
        witnessBackground: witness.witnessBackground,
        fullWitnessInformation: {
            officialStatementSummary: witness.fullWitnessInformation?.officialStatementSummary,
            officialReasonForTermination: witness.fullWitnessInformation?.officialReasonForTermination
        }
    };
    
    // Remove undefined termination reason if not present
    if (!publicInfo.fullWitnessInformation.officialReasonForTermination) {
        delete publicInfo.fullWitnessInformation.officialReasonForTermination;
    }
    
    const witnessText = JSON.stringify(publicInfo, null, 2);
    
    return {
        role: "user",
        content: `You are a senior legal analyst. Your task is to provide a plausible case summary based on the provided witness dossier. The dossier contains information about ONE witness in a larger, unstated legal case.

Your analysis must:
1.  **Infer the Legal Context:** Based on the witness's role and official statements, determine the most likely type of legal case this deposition is for (e.g., "age discrimination lawsuit," "personal injury claim," "homicide prosecution").
2.  **Synthesize a Narrative:** Create a brief narrative for the case. Who is likely suing whom? What is the central legal issue at stake?
3.  **Use Only Provided Facts:** Base your summary ONLY on the information in the dossier. CRITICALLY, you must not mention the witness's internal thoughts, strategies, or motivations, as you have not been provided with them.
4.  **Acknowledge Inference:** Frame your response as a plausible inference, not as established fact. For example, start with "This deposition appears to be part of..." or "The likely legal context for this witness is..."
5.  **Adhere to Detail Level:** Provide ${detailInstruction}.

**Publicly Available Witness Information:**
\`\`\`json
${witnessText}
\`\`\``
    };
}