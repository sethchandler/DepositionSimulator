# Legal Educator's Guide to Creating Deposition Cases

## Table of Contents
1. [Overview](#overview)
2. [File Structure You'll Create](#file-structure-youll-create)
3. [Step-by-Step Case Creation](#step-by-step-case-creation)
4. [File Integration & References](#file-integration--references)
5. [Document Design Principles](#document-design-principles)
6. [AI Assistant Instructions](#ai-assistant-instructions)
7. [Quality Control Checklist](#quality-control-checklist)
8. [Advanced Techniques](#advanced-techniques)

## Overview

The Deposition Simulator uses a **three-file architecture** that separates witness psychology, educational objectives, and documentary evidence. This allows you to create realistic legal scenarios without any coding knowledge.

### What You'll Create
- **1 Witness File** - Complete psychological profile and motivations
- **1 Scenario File** - Educational objectives and case overview  
- **1 Documents File** - Evidence library with public/secret separation

### Key Innovation: Public/Secret Architecture
Students see **realistic redacted documents** (like real discovery), while **secret information** contains the "smoking gun" details needed for impeachment. This creates authentic learning experiences where students must use documents strategically.

---

## File Structure You'll Create

```
data/
├── witnesses/
│   └── [case-name]-[witness-role].json     # Witness psychology & background
├── scenarios/  
│   └── [case-name]-[case-type].json        # Educational framework
└── documents/
    └── [case-name]-docs.json               # Evidence library
```

**Example for employment discrimination case:**
```
data/
├── witnesses/
│   └── hr-director-patricia-wong.json
├── scenarios/
│   └── age-discrimination-tech-company.json  
└── documents/
    └── age-discrimination-docs.json
```

---

## Step-by-Step Case Creation

### Step 1: Design Your Case Concept

**Choose Your Legal Area:**
- Employment law (discrimination, wrongful termination, harassment)
- Personal injury (negligence, product liability)  
- Contract disputes (breach, warranty, fraud)
- Criminal law (witness testimony, evidence authentication)
- Family law (custody, domestic violence)

**Define the Central Secret:**
What is the witness trying to hide? This drives everything.
- Affair that compromises credibility
- Financial motive for lying
- Past misconduct that affects bias
- Substance abuse affecting memory
- Conflict of interest

**Identify Learning Objectives:**
- What deposition skills should students practice?
- What evidence rules should they learn?
- What impeachment techniques should they master?

### Step 2: Create the Witness File

**File naming:** `[role]-[name].json` (e.g., `ceo-michael-torres.json`)

**Required structure:**
```json
{
  "witnessProfile": {
    "witnessId": "unique-identifier",
    "caseReference": "Case Name or Number"
  },
  "personalDetails": {
    "fullName": "Full Legal Name",
    "age": 45,
    "occupation": "Specific job title",
    "residence": "City, State"
  },
  "professionalLife": {
    "careerBackground": "Professional history",
    "reputation": "How colleagues view them"
  },
  "personalLifeAndRelationships": {
    "familyStatus": "Married, divorced, etc.",
    "personalityTraits": "Key characteristics"
  },
  "witnessMotivations": {
    "primaryMotivationToConceal": "What they're hiding and why",
    "strategyOfPartialDisclosure": "How they plan to handle questions",
    "perjuryRisk": 0.75
  },
  "officialStatement": {
    "summary": "Their public version of events"
  },
  "actualEvents": {
    "whatReallyHappened": "The true version with secrets included"
  },
  "vulnerabilities": {
    "keyWeaknesses": "Where they can be caught in lies or inconsistencies"
  }
}
```

**Perjury Risk Scale:**
- `0.2-0.4`: Honest but evasive (will not lie outright)
- `0.5-0.7`: Conflicted (will lie if cornered)  
- `0.8-1.0`: Deceptive (willing to lie to protect secrets)

### Step 3: Create the Scenario File

**File naming:** `[case-type]-[brief-description].json`

**Required structure:**
```json
{
  "id": "unique-scenario-id",
  "title": "Human-readable case title",
  "caseReference": "Must match witness file",
  "description": "Brief case overview",
  
  "witness": {
    "file": "filename-of-witness.json",
    "name": "Witness display name",
    "role": "Their role in the case"
  },
  
  "documents": {
    "file": "filename-of-docs.json",
    "description": "What the documents prove/disprove"
  },
  
  "educationalObjectives": [
    "Learn to use documentary evidence for impeachment",
    "Practice catching witnesses in timeline inconsistencies",
    "Master objection handling in depositions"
  ],
  
  "keyImpeachmentOpportunities": [
    "Email showing witness knew about safety issue",
    "Phone records contradicting claimed timeline",
    "Financial records revealing undisclosed motive"
  ]
}
```

### Step 4: Create the Documents File

**File naming:** `[case-name]-docs.json`

**Required structure:**
```json
{
  "caseReference": "Must match other files",
  "title": "Document collection title",
  "description": "What this evidence library contains",
  
  "documents": [
    {
      "fileName": "descriptive_filename.txt",
      "exhibitLetter": "A",
      "documentType": "email|contract|receipt|report|statement",
      "publicContent": "What students see with [REDACTED] placeholders",
      "secretContent": {
        "hiddenInfo": "What was redacted",
        "relevance": "Why this matters legally",
        "impeachmentValue": "How this contradicts witness testimony"
      },
      "metadata": {
        "dates": ["2024-03-15"],
        "parties": ["John Doe", "Jane Smith"],
        "keyTopics": ["safety", "negligence", "cover-up"],
        "legalRelevance": "Why this document matters in the case"
      }
    }
  ]
}
```

---

## File Integration & References

### Critical Reference Points

**1. Case Reference Consistency**
All three files must use identical `caseReference`:
```json
// In witness file:
"caseReference": "Johnson v. TechCorp Industries - Case No. 2024-CV-1234"

// In scenario file:  
"caseReference": "Johnson v. TechCorp Industries - Case No. 2024-CV-1234"

// In documents file:
"caseReference": "Johnson v. TechCorp Industries - Case No. 2024-CV-1234"
```

**2. File Name References**
Scenario file links to the other two:
```json
"witness": {
  "file": "cto-sarah-johnson.json"    // Must match actual filename
},
"documents": {
  "file": "techcorp-discrimination-docs.json"  // Must match actual filename
}
```

**3. Content Consistency**
- Dates in witness timeline must match document dates
- Names in witness background must match document parties
- Witness motivations must align with document secrets
- Document metadata keywords should trigger when witness discusses those topics

### System Integration

**Add to Application:**
1. **Update `config.js`** - Add your scenario to `SCENARIO_MAPPING`:
```javascript
export const SCENARIO_MAPPING = {
    0: 'homicide-eyewitness',
    1: 'domestic-violence-neighbor',
    // Add your new scenario:
    5: 'your-new-scenario-id'
};
```

2. **Update `index.html`** - Add option to scenario dropdown:
```html
<option value="5">Your Case Title</option>
```

---

## Document Design Principles

### Realistic Redaction Patterns

**Use Professional Language:**
```
CONFIDENTIAL - ATTORNEY WORK PRODUCT
TechCorp Industries Internal Memo
Date: March 15, 2024
From: [REDACTED FOR PRIVILEGE]
To: Engineering Team
Re: Safety Protocol Review

Following yesterday's incident, [CONTENT REDACTED PURSUANT TO ATTORNEY-CLIENT PRIVILEGE]. The board has requested immediate implementation of [REDACTED].
```

**Secret Content Reveals:**
```json
"secretContent": {
  "redactedSender": "Sarah Johnson, CTO",
  "redactedContent": "we need to cover up the fact that we knew about this safety flaw for months",
  "impeachmentValue": "Proves witness lied about not knowing about safety issues"
}
```

### Document Types That Work Well

**High-Impact Documents:**
- **Internal emails** - Show true motivations/knowledge
- **Phone/text records** - Prove communication and timing
- **Financial records** - Reveal undisclosed motives  
- **Medical records** - Contradict claimed injuries/conditions
- **Meeting minutes** - Prove attendance and statements made
- **Surveillance logs** - Contradict claimed whereabouts

**Exhibit Letter Strategy:**
- **Exhibit A** - Timeline/chronology document
- **Exhibit B** - "Smoking gun" impeachment evidence
- **Exhibit C** - Supporting/corroborating evidence
- **Exhibit D+** - Additional context documents

### Creating Compelling Contradictions

**Timeline Inconsistencies:**
```
Witness claims: "I left the office at 5 PM"
Document shows: Email sent from witness at 7:23 PM with location metadata
```

**Knowledge Denials:**
```
Witness claims: "I never knew about the safety issues"  
Document shows: Internal email where witness discusses "covering up safety flaw"
```

**Relationship Concealment:**
```
Witness claims: "I barely knew the plaintiff"
Document shows: Hotel receipts showing frequent travel together
```

---

## AI Assistant Instructions

### For Document Creation

**Prompt Template for AI:**

```
You are a legal document expert creating realistic impeachment evidence for a deposition training scenario. 

CASE CONTEXT:
- Legal Area: [employment discrimination/personal injury/etc.]
- Witness Role: [HR Director/CEO/Doctor/etc.]  
- Witness Secret: [what they're trying to hide]
- Case Timeline: [key dates and events]

WITNESS BACKGROUND:
[Paste witness profile sections here - personalDetails, motivations, actualEvents]

TASK: Create [3-5] realistic documents that:

1. **Look professionally authentic** with proper headers, formatting, legal language
2. **Contain strategic redactions** using [REDACTED FOR X] placeholders  
3. **Create clear contradictions** with the witness's official statement
4. **Support the educational objectives** of catching perjury and impeachment
5. **Are internally consistent** with each other and the timeline

DOCUMENT REQUIREMENTS:
- Use realistic business/legal language and formatting
- Include proper metadata (dates, parties, reference numbers)
- Create "smoking gun" evidence that definitively contradicts witness
- Design redactions that create suspense (students know something is hidden)
- Ensure dates, names, and events align perfectly with witness timeline

DOCUMENT TYPES NEEDED:
1. [Email chain/Internal memo/etc.] - Should reveal [specific contradiction]
2. [Phone records/Financial records/etc.] - Should prove [specific lie] 
3. [Meeting minutes/Surveillance log/etc.] - Should contradict [witness claim]

OUTPUT FORMAT: Provide each document as JSON with:
- Realistic publicContent with strategic [REDACTED] placeholders
- Complete secretContent object with hidden info and impeachment value
- Proper metadata with dates, parties, keywords for auto-detection

CONSISTENCY REQUIREMENTS:
- All dates must align with witness timeline
- All parties mentioned must be consistent across documents  
- Any financial amounts, times, locations must be consistent
- Document sequence should tell a coherent story
- Contradictions should be deliberate and compelling, not accidental
```

### For Quality Control

**Follow-up Prompt for Consistency Check:**

```
Review the documents you created and check for:

1. **Timeline Consistency**: Do all dates make logical sense in sequence?
2. **Character Consistency**: Are names, titles, relationships consistent across documents?
3. **Factual Consistency**: Do amounts, locations, times align between documents?
4. **Legal Realism**: Would these documents actually exist in discovery?
5. **Impeachment Power**: Does each document clearly contradict something the witness claims?
6. **Educational Value**: Will students learn important deposition skills from these contradictions?

Identify any inconsistencies and provide corrected versions.
```

---

## Quality Control Checklist

### Pre-Launch Testing

**File Integration:**
- [ ] All three files use identical `caseReference`
- [ ] Scenario file correctly references witness and documents filenames
- [ ] Files load without JSON syntax errors
- [ ] Witness appears in scenario dropdown

**Content Consistency:**
- [ ] Document dates align with witness timeline
- [ ] Names and relationships consistent across all files
- [ ] Witness motivations align with document secrets
- [ ] No accidental contradictions (only deliberate ones)

**Educational Effectiveness:**
- [ ] Clear learning objectives defined
- [ ] Multiple impeachment opportunities available
- [ ] Progressive difficulty (easy catches to subtle contradictions)
- [ ] Realistic legal scenario that could happen

**Technical Functionality:**
- [ ] Documents auto-inject during relevant conversation topics
- [ ] Keywords in metadata trigger properly
- [ ] Secret content provides meaningful impeachment value
- [ ] Exhibit letters are sequential and logical

### Student Testing

**Beta Test Your Case:**
1. Load the scenario in the simulator
2. Ask basic background questions - does witness respond realistically?
3. Test document references - do they inject at appropriate times?
4. Attempt each planned impeachment - does it work as intended?
5. Try unexpected question paths - does witness maintain consistency?

---

## Advanced Techniques

### Sophisticated Witness Psychology

**Graduated Truthfulness:**
```json
"witnessMotivations": {
  "primaryMotivationToConceal": "Extramarital affair that compromises credibility",
  "strategyOfPartialDisclosure": "Will admit to being at the location but lie about why",
  "perjuryRisk": 0.6,
  "escalationTriggers": [
    "Direct questions about relationship status",
    "Timeline questions that require admitting presence", 
    "Document confrontation about hotel receipts"
  ]
}
```

**Believable Backstories:**
- Give witnesses **realistic reasons** for their secrets
- Create **sympathetic motivations** (protecting family, avoiding embarrassment)
- Build in **partial truths** that make lies more believable
- Add **emotional triggers** that affect witness composure

### Multi-Document Story Arcs

**Progressive Revelation:**
- **Document A** - Raises questions about witness timeline
- **Document B** - Contradicts witness's claimed ignorance  
- **Document C** - Proves witness's financial motive
- **Document D** - Shows witness attempted cover-up

**Cross-Document Validation:**
```json
// Email mentions meeting
"At tomorrow's 2 PM safety meeting, we need to discuss the Johnson incident"

// Meeting minutes confirm attendance  
"Attendees: S. Johnson (CTO), M. Rodriguez (Legal), P. Chen (Safety)"

// Phone records show follow-up
"15:45 - Outgoing call to Legal Dept - Duration: 23 minutes"
```

### Advanced Document Types

**Electronic Metadata:**
```json
"fileName": "safety_report_final.docx",
"publicContent": "Document properties: Created 3/15/24, Modified [REDACTED]",
"secretContent": {
  "modificationDate": "3/20/24 - 3 days after lawsuit filed",
  "impeachmentValue": "Proves document was altered after legal action began"
}
```

**Financial Forensics:**
```json
"fileName": "expense_report_march.pdf", 
"publicContent": "Travel expenses: $[AMOUNT REDACTED] for business meeting",
"secretContent": {
  "actualAmount": "$2,847.50 for personal vacation with paramour",
  "impeachmentValue": "Proves witness used company funds for affair travel"
}
```

### Creating Realistic Legal Pressure

**Document Privileges:**
- Use realistic redaction reasons: `[REDACTED PURSUANT TO ATTORNEY-CLIENT PRIVILEGE]`
- Create tension about what might be hidden
- Make students work to overcome privilege objections

**Discovery Timing:**
- Reference production dates and discovery deadlines
- Create urgency around document preservation
- Show realistic litigation timeline pressures

---

## Example: Complete Case Creation

Let's walk through creating a complete employment discrimination case.

### Concept: Age Discrimination in Tech

**Setup:** 58-year-old software architect claims he was fired for age, not performance. HR Director claims it was purely performance-based, but she made ageist comments in private emails.

### Step 1: Witness File - `hr-director-lisa-chen.json`

```json
{
  "witnessProfile": {
    "witnessId": "HR-DISC-2024-001",
    "caseReference": "Martinez v. TechFlow Dynamics - Case No. 2024-CV-5678"
  },
  "personalDetails": {
    "fullName": "Lisa Marie Chen",
    "age": 42,
    "occupation": "Director of Human Resources, TechFlow Dynamics",
    "residence": "Austin, TX"
  },
  "professionalLife": {
    "careerBackground": "15 years in HR, last 6 at TechFlow. Known for being thorough but sometimes impulsive in communications",
    "reputation": "Efficient and direct, but colleagues note she can be blunt in private discussions"
  },
  "personalLifeAndRelationships": {
    "familyStatus": "Married with two teenage children",  
    "personalityTraits": "Type-A personality, ambitious, sometimes speaks before thinking"
  },
  "witnessMotivations": {
    "primaryMotivationToConceal": "Made explicit ageist remarks in emails to CEO about 'needing fresh blood' and 'older workers being set in their ways'",
    "strategyOfPartialDisclosure": "Will emphasize performance metrics and deny any age-based animus. If confronted with emails, will claim they were taken out of context",
    "perjuryRisk": 0.7
  },
  "officialStatement": {
    "summary": "Martinez was terminated solely for performance issues: missed deadlines, outdated technical skills, and poor collaboration with younger team members"
  },
  "actualEvents": {
    "realMotivation": "While Martinez did have some performance issues, the decision was heavily influenced by CEO's directive to 'refresh the team with younger talent' and Chen's own bias against older workers"
  },
  "vulnerabilities": {
    "emailEvidence": "Multiple emails discussing age-related concerns about Martinez and other older employees",
    "inconsistentApplication": "Younger employees with similar performance issues were given improvement plans, not termination"
  }
}
```

### Step 2: Scenario File - `age-discrimination-tech.json`

```json
{
  "id": "age-discrimination-tech",
  "title": "Employment Discrimination - Age Bias in Tech Company",
  "caseReference": "Martinez v. TechFlow Dynamics - Case No. 2024-CV-5678",
  "description": "58-year-old software architect claims age discrimination in termination. HR Director must defend performance-based decision while concealing ageist communications",
  
  "witness": {
    "file": "hr-director-lisa-chen.json",
    "name": "Lisa Marie Chen",  
    "role": "HR Director who made termination decision"
  },
  
  "documents": {
    "file": "age-discrimination-tech-docs.json",
    "description": "Internal emails and performance data that reveal age-based animus and inconsistent application of policies"
  },
  
  "educationalObjectives": [
    "Practice using documentary evidence to expose discriminatory animus",
    "Learn to identify and exploit inconsistencies in employment decisions", 
    "Master the burden-shifting framework in discrimination cases",
    "Develop skills in impeaching witnesses with their own communications"
  ],
  
  "keyImpeachmentOpportunities": [
    "Email stating need to 'refresh team with younger blood'",
    "Performance comparison showing younger employee with worse metrics kept on",
    "Timeline showing decision made shortly after Martinez's birthday celebration"
  ]
}
```

### Step 3: Documents File - `age-discrimination-tech-docs.json`

```json
{
  "caseReference": "Martinez v. TechFlow Dynamics - Case No. 2024-CV-5678",
  "title": "TechFlow Dynamics Employment Discrimination Evidence",
  "description": "Internal communications and performance data revealing age-based decision making",
  
  "documents": [
    {
      "fileName": "internal_email_team_refresh.txt",
      "exhibitLetter": "A",
      "documentType": "email",
      "publicContent": "FROM: Lisa Chen <lchen@techflow.com>\nTO: [RECIPIENT REDACTED]\nDATE: September 12, 2024\nSUBJECT: Q4 Team Planning\n\nHi [NAME REDACTED],\n\nAs we discussed, we need to make some changes to the architecture team. [CONTENT REDACTED FOR PERSONNEL PRIVACY]. I think this is a good opportunity to [STRATEGY REDACTED] and bring in some new perspectives.\n\nThe Martinez situation gives us the opening we need to [ACTION REDACTED].\n\nLet's discuss further in our 1:1 tomorrow.\n\nLisa",
      
      "secretContent": {
        "recipient": "CEO Michael Torres",
        "redactedContent": "Martinez is brilliant but he's stuck in the old ways of doing things. All our senior architects are getting long in the tooth",
        "redactedStrategy": "refresh the team with some younger blood",
        "redactedAction": "move forward with our generational transition plan",
        "impeachmentValue": "Proves age was a motivating factor in termination decision"
      },
      
      "metadata": {
        "dates": ["September 12, 2024"],
        "parties": ["Lisa Chen", "Michael Torres", "Martinez"],
        "keyTopics": ["age", "termination", "team", "refresh", "young"],
        "legalRelevance": "Direct evidence of age-based animus in decision making"
      }
    },
    
    {
      "fileName": "performance_comparison_report.txt", 
      "exhibitLetter": "B",
      "documentType": "report",
      "publicContent": "TECHFLOW DYNAMICS - CONFIDENTIAL\nPERFORMANCE REVIEW COMPARISON\nGenerated: October 1, 2024\n\nEMPLOYEE: Martinez, Roberto (Age: 58)\nQ2 2024 Performance: 3.2/5.0\nProjects Completed: 4/6\nDeadlines Missed: 2\nPeer Review Score: 3.4/5.0\nRECOMMENDATION: Immediate termination\n\n[COMPARISON EMPLOYEE DATA REDACTED FOR PRIVACY]\nQ2 2024 Performance: [SCORE REDACTED]\nProjects Completed: [REDACTED]\nDeadlines Missed: [REDACTED] \nPeer Review Score: [REDACTED]\nRECOMMENDATION: [ACTION REDACTED]",
      
      "secretContent": {
        "comparisonEmployee": "Johnson, Tyler (Age: 28)",
        "comparisonScore": "2.8/5.0",
        "comparisonProjects": "3/6", 
        "comparisonDeadlines": "3",
        "comparisonPeerScore": "2.9/5.0",
        "comparisonAction": "Performance improvement plan - 90 days",
        "impeachmentValue": "Shows younger employee with worse performance received improvement plan while older employee was terminated"
      },
      
      "metadata": {
        "dates": ["October 1, 2024"],  
        "parties": ["Roberto Martinez", "Tyler Johnson", "Lisa Chen"],
        "keyTopics": ["performance", "comparison", "termination", "improvement", "age"],
        "legalRelevance": "Proves disparate treatment based on age rather than performance"
      }
    }
  ]
}
```

This complete example shows how all three files work together to create a compelling educational scenario with realistic legal pressure and clear impeachment opportunities.

---

**File Location:** `/Users/Seth/dev/DepositionSimulator/EDUCATOR_GUIDE.md`

This guide provides everything legal educators need to create sophisticated deposition training scenarios. The AI assistant instructions are particularly important for ensuring document consistency and educational effectiveness.