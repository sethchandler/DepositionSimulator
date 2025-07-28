# Legal Educator's Guide to Creating Deposition Documents

## Overview

This guide explains how legal educators can create realistic deposition scenarios with documents **without touching any code**. Documents are stored in a simple JSON format that separates public content (what students normally see) from secret information (what they need to discover).

## Quick Start

### 1. Edit the Document Manifest
Open `/scenarios/documentManifest.json` in any text editor and add your scenario to the `scenarios` section.

### 2. Document Structure Template
```json
{
  "fileName": "your_document.txt",
  "exhibitLetter": "A", 
  "documentType": "email",
  "publicContent": "What students can see normally...",
  "secretData": "base64EncodedSecrets",
  "metadata": {
    "dates": ["March 23, 2024"],
    "parties": ["Person A", "Person B"],
    "keyTopics": ["keyword1", "keyword2"],
    "legalRelevance": "Why this document matters"
  }
}
```

## Document Types

Choose from these standard document types:
- `email` - Email correspondence
- `contract` - Legal agreements, contracts
- `receipt` - Purchase receipts, bills
- `report` - Investigation reports, analyses
- `statement` - Witness statements, affidavits  
- `journal` - Personal diaries, logs
- `memo` - Internal memoranda
- `letter` - Formal correspondence
- `phone_records` - Call logs, communication records
- `complaint` - HR complaints, legal filings

## Creating Public Content

The `publicContent` field contains what students would normally see in discovery. Make it realistic with appropriate redactions:

### Good Public Content Example:
```
STARLIGHT MOTEL
1247 Old Highway 6, Houston, TX

Room 147 - Check-in Receipt
Date: March 23, 2024
Time: 11:47 PM

Guest: [REDACTED FOR PRIVACY]
Room Rate: $89.00 + tax
Total: $96.68
Payment: Cash

Manager: Rick Patterson
```

### Tips for Public Content:
- Use `[REDACTED]`, `[CONFIDENTIAL]`, or `[PRIVACY PROTECTED]` for hidden info
- Make redactions look natural and professional
- Include enough detail to be realistic
- Don't give away the "smoking gun" information

## Creating Secret Data

The `secretData` field contains Base64-encoded JSON with the hidden information that creates contradictions or impeachment opportunities.

### Step 1: Create Secret JSON
```json
{
  "guestName": "C. Williams",
  "relevance": "Could contradict witness claim about being alone",
  "criticalInfo": "Shows Sterling checked in with a woman during the time he claims to have been alone",
  "additionalEntries": [
    "Extra content line 1",
    "Extra content line 2"
  ]
}
```

### Step 2: Encode to Base64
Use any online Base64 encoder (like base64encode.org) to convert your JSON to Base64:

**Input JSON:**
```json
{"guestName": "C. Williams", "relevance": "Could contradict witness claim about being alone"}
```

**Output Base64:**
```
eyJndWVzdE5hbWUiOiJDLiBXaWxsaWFtcyIsInJlbGV2YW5jZSI6IkNvdWxkIGNvbnRyYWRpY3Qgd2l0bmVzcyBjbGFpbSBhYm91dCBiZWluZyBhbG9uZSJ9
```

### Common Secret Data Fields:
- `guestName` - Hidden name that will replace [REDACTED]
- `fullPhoneNumber` - Complete phone number to replace [REDACTED]
- `registeredTo` - Who a phone/account belongs to
- `relevance` - Why this hidden info matters legally
- `criticalInfo` - Key facts for impeachment
- `inconsistencies` - Array of contradictions this reveals
- `additionalEntries` - Extra content not in public version
- `officerNotes` - Confidential police notes
- `dispositionDetail` - Additional case disposition info

## Metadata Creation

The `metadata` object helps the system automatically detect when documents are relevant:

```json
"metadata": {
  "dates": ["March 23, 2024", "March 24, 2024"],
  "parties": ["John Sterling", "C. Williams", "Rick Patterson"],
  "keyTopics": ["hotel", "motel", "receipt", "cash", "affair"],
  "legalRelevance": "Impeachment evidence regarding witness timeline"
}
```

### Metadata Tips:
- **Dates**: Include all dates mentioned in the document
- **Parties**: List all people mentioned (use actual names, not initials)
- **Key Topics**: Important words that students might ask about
- **Legal Relevance**: Brief explanation of why this document matters

## Complete Example

Here's a complete document entry for an employment case:

```json
{
  "fileName": "whistleblower_email.txt",
  "exhibitLetter": "B",
  "documentType": "email",
  "publicContent": "From: Rebecca Stephens\nTo: Legal Department\nSubject: Concerns About Q1 Reports\nDate: May 15, 2024\n\nI've discovered some irregularities in our Q1 sales reports that I believe require immediate attention. The figures don't match our internal records.\n\nI've documented my findings and would like to discuss this matter confidentially.\n\nRegards,\nRebecca\n\n[ATTACHMENT DETAILS REDACTED]",
  "secretData": "eyJhdHRhY2htZW50IjoiRGV0YWlsZWQgc3ByZWFkc2hlZXQgc2hvd2luZyAkMi4zTSBpbiBmYWJyaWNhdGVkIHNhbGVzIGFuZCBmYWxzZSBpbnZvaWNlcyIsImZpbmFuY2lhbEltcGFjdCI6IkZyYXVkIGFtb3VudCBleGNlZWRzIGZlZGVyYWwgd2hpc3RsZWJsb3dlciBwcm90ZWN0aW9uIHRocmVzaG9sZCIsInJlbGV2YW5jZSI6IkVzdGFibGlzaGVzIGtub3dsZWRnZSBvZiBzcGVjaWZpYyBmcmF1ZCBhbW91bnQgYW5kIGZlZGVyYWwgaW1wbGljYXRpb25zIn0=",
  "metadata": {
    "dates": ["May 15, 2024"],
    "parties": ["Rebecca Stephens", "Legal Department"],
    "keyTopics": ["whistleblower", "irregularities", "Q1", "sales", "reports", "fraud"],
    "legalRelevance": "Establishes protected activity under federal whistleblower statutes"
  }
}
```

## Adding Your Scenario

### 1. Choose a Case Reference ID
Use format: `[Type]-[Initials]-[Year]-[Number]`
Examples:
- `Employment-WB-2024-089` (Employment Whistleblower case)
- `Personal-Injury-2024-156` (Personal Injury case)
- `Contract-Breach-2024-203` (Contract Breach case)

### 2. Add to Manifest
```json
"scenarios": {
  "Your-Case-Reference-2024-001": {
    "title": "Your Case Title",
    "caseReference": "Your-Case-Reference-2024-001",
    "description": "Brief description of the case and learning objectives",
    "documents": [
      // Your documents here...
    ]
  }
}
```

### 3. Sequential Exhibit Letters
Assign exhibit letters sequentially:
- First document: `"exhibitLetter": "A"`
- Second document: `"exhibitLetter": "B"`
- Third document: `"exhibitLetter": "C"`
- And so on...

## Educational Strategy

### Creating Effective Contradictions

The best educational documents create opportunities for students to catch witnesses in lies or inconsistencies:

1. **Timeline Contradictions**: Document shows different time than witness claims
2. **Presence Contradictions**: Receipt/records show witness somewhere they deny being
3. **Relationship Contradictions**: Communications reveal relationships witness conceals
4. **Financial Contradictions**: Records contradict claims about payments/money
5. **Knowledge Contradictions**: Documents show witness knew things they claim ignorance of

### Progressive Difficulty

Start with easier contradictions and build to more subtle ones:
- **Beginner**: Direct contradictions in obvious documents
- **Intermediate**: Multiple documents that together reveal contradictions  
- **Advanced**: Subtle inconsistencies requiring careful cross-examination

## Testing Your Documents

1. **Load the scenario** in the deposition simulator
2. **Check document display** - verify public content looks realistic
3. **View full documents** - confirm secret info appears correctly
4. **Test auto-detection** - ask questions that should trigger document context
5. **Verify contradictions** - ensure hidden info creates good impeachment opportunities

## Common Mistakes to Avoid

1. **Don't put smoking gun info in public content** - use redactions
2. **Don't make redactions obvious** - they should look natural
3. **Don't forget exhibit letters** - must be sequential within scenario
4. **Don't skip metadata** - it's crucial for auto-detection
5. **Don't make secret data too complex** - keep JSON simple and valid

## Getting Help

- **JSON Validation**: Use jsonlint.com to check your JSON syntax
- **Base64 Encoding**: Use base64encode.org for secret data
- **Questions**: Contact the development team for technical support

Remember: You're creating realistic legal scenarios that teach students real skills. Make your documents authentic, your contradictions meaningful, and your educational objectives clear!