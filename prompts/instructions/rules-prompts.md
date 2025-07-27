# Custom Rules Prompt Instructions

## Overview
The rules system controls what legal standards apply during depositions. By default, depositions follow Federal Rules of Civil Procedure with broad discovery rights, but you can customize this to simulate different legal contexts.

## How Rules Prompts Work
- Rules instructions affect both judge and opposing counsel behavior
- They determine what objections should be sustained or overruled
- They set the overall standard for what questions are allowed

## Writing Effective Rules Prompts

### Basic Structure
Your custom rules instruction should specify:
1. **Legal Standard**: What rules or standards govern the deposition
2. **Scope of Discovery**: How broad or narrow questioning can be
3. **Evidence Standards**: Whether traditional evidence rules apply
4. **Special Procedures**: Any unique rules or stipulations

### Example Custom Instructions

**Example 1: Criminal Case Rules**
```
This deposition is in a criminal case where the defendant is represented by counsel. Apply stricter relevance standards than civil discovery. Hearsay objections should be sustained unless they fall under recognized exceptions. Questions about the defendant's character or prior bad acts should be limited. Privilege protections are heightened, including 5th Amendment concerns.
```

**Example 2: International Arbitration**
```
This deposition follows international arbitration procedures with minimal formal rules. Evidence standards are relaxed, hearsay is generally admissible, and discovery is limited to what's directly relevant to the dispute. Privilege rules may differ from U.S. standards. Focus on efficiency and getting information quickly rather than formal procedure.
```

**Example 3: Strict Evidence Rules by Stipulation**
```
The parties have stipulated that this deposition will follow Federal Rules of Evidence as if this were trial testimony. Hearsay objections should be sustained unless a specific exception applies. Leading questions are improper except for background. Foundation must be laid for all exhibits and opinions. Character evidence rules apply strictly.
```

**Example 4: Corporate Internal Investigation**
```
This is an internal corporate investigation deposition with modified procedures. Standard attorney-client privilege applies, but corporate attorney-client privilege follows the control group test. Work product protections are limited. Questions about corporate decision-making processes are broadly allowed for fact-finding purposes.
```

## Key Legal Standards You Can Modify

### Discovery Scope
- **Broad (Federal Civil)**: "reasonably calculated to lead to admissible evidence"
- **Narrow (Evidence Standard)**: "relevant and likely to be admissible at trial"
- **Fishing Expeditions**: Whether broad exploratory questioning is allowed

### Evidence Rules
- **Hearsay**: Whether hearsay objections are sustained or discovery rules apply
- **Foundation**: Whether proper foundation must be laid during deposition
- **Character Evidence**: Whether character evidence rules apply

### Privilege Rules
- **Attorney-Client**: Standard privilege vs. heightened protections
- **Work Product**: Broad protection vs. limited discovery protection  
- **5th Amendment**: Whether criminal privilege concerns apply

### Procedural Rules
- **Time Limits**: Whether there are strict time constraints
- **Question Format**: How strict form requirements are
- **Judicial Intervention**: How actively the judge manages the deposition

## Guidelines for Custom Rules

### Do Include:
- Specific legal standards or rule sets that apply
- How these rules differ from standard civil discovery
- What objections should be sustained under these rules
- Any special procedures or limitations

### Don't Include:
- Rules that would eliminate basic deposition structure
- Instructions that conflict with fundamental legal ethics
- Overly complex procedures that would confuse the AI

### Consider Including:
- Citation to specific rules or standards
- Examples of what types of questions would be improper
- How judges should rule on common objections under these rules
- Whether burden of proof or persuasion differs

## Testing Your Rules
- Test with common objection scenarios (hearsay, relevance, form)
- Ensure the rules create a coherent legal framework
- Verify that judges and counsel behave consistently under the rules
- Check that the rules don't break basic deposition functionality