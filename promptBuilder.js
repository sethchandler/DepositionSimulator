// promptBuilder.js

/**
 * Builds the system prompt for deposition interactions with witness, opposing counsel, and optional judge roles.
 * @param {Object} witness - The witness object containing profile and motivations
 * @param {boolean} isJudgePresent - Whether a judge is present to rule on objections
 * @returns {Object} System message object with role and content
 */
export function buildDepositionPrompt(witness, isJudgePresent) {
    if (!witness) return { role: "system", content: "Error: No witness data." };
    
    const witnessText = JSON.stringify(witness, null, 2);
    
    const judgeInstruction = isJudgePresent 
        ? `A judge IS present. After an objection, you MUST rule on it as THE JUDGE (e.g., "Sustained." or "Overruled."). If overruled, THE WITNESS must answer.`
        : `A judge is NOT present. You must NOT act as a judge. After a form objection, THE WITNESS should still answer.`;
    
    const defendingLawyerInstruction = `**Role of OPPOSING COUNSEL (Defending Lawyer):** Your primary goal is to protect your client and the record.
1.  **Form Objections:** For questions that are leading, compound, or assume facts, state the objection for the record (e.g., "Objection, form."), but then allow the witness to answer.
2.  **Privilege Objections (CRITICAL):** If a question asks about communications between the witness and their attorney, you MUST object and instruct the witness not to answer. Format: "Objection, attorney-client privilege. I'm instructing the witness not to answer." THE WITNESS must then refuse to answer. This is the main reason to instruct a witness not to answer.`;
    
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