# Custom Prompt Examples and Tips

## Overview
The Deposition Simulator allows you to customize the behavior of judges, opposing counsel, and legal rules to create different deposition scenarios. This guide provides practical examples and tips for writing effective custom prompts.

## Complete Scenario Examples

### Scenario 1: "Hostile Courtroom"
Perfect for practicing under pressure or preparing for difficult proceedings.

**Judge**: Hostile Judge preset
**Opposing Counsel**: Aggressive Counsel preset  
**Rules**: Federal Rules of Evidence
**Result**: Frequent objections, harsh judicial comments, strict evidence standards

### Scenario 2: "Rookie Mistakes"
Great for understanding what happens when procedures go wrong.

**Judge**: Inattentive Judge preset
**Opposing Counsel**: Inexperienced Counsel preset
**Rules**: Standard Civil Procedure
**Result**: Missed objections, incorrect rulings, procedural confusion

### Scenario 3: "Corporate Boardroom Investigation"
**Judge**: Standard Judge
**Opposing Counsel**: Custom prompt:
```
You are experienced corporate counsel in an internal investigation. Be very protective of corporate attorney-client privilege and work product. Object frequently to questions about internal legal advice, board deliberations, and attorney work product. Use phrases like "Objection, that calls for privileged attorney work product" or "That question seeks information protected by corporate attorney-client privilege."
```
**Rules**: Custom prompt:
```
This is a corporate internal investigation with heightened privilege protections. Corporate attorney-client privilege applies broadly to communications with in-house and outside counsel. Work product doctrine protects all attorney mental impressions and legal strategies. Questions about board decision-making processes require proper foundation.
```

### Scenario 4: "Criminal Case Deposition"
**Judge**: Strict Judge preset
**Opposing Counsel**: Custom prompt:
```
You are criminal defense counsel protective of your client's 5th Amendment rights. Object to questions that could be incriminating, seek information about criminal liability, or go beyond the narrow scope allowed in criminal discovery. Use phrases like "Objection, that question calls for incriminating information" or "Objection, beyond the scope of criminal discovery."
```
**Rules**: Custom prompt:
```
This criminal case deposition follows stricter rules than civil discovery. Questions must be directly relevant to charges filed. Hearsay objections should be sustained. Character evidence is limited. 5th Amendment concerns about self-incrimination apply even in deposition setting.
```

## Writing Tips by Role

### Judge Prompts
**Effective Elements:**
- Specific personality traits (impatient, academic, gruff)
- Signature phrases they use repeatedly
- How they handle different objection types
- Their general philosophy (strict vs. lenient)

**Common Mistakes:**
- Making judges too complex or inconsistent
- Forgetting they only rule on objections, don't ask questions
- Instructions that would break basic legal procedure

### Opposing Counsel Prompts
**Effective Elements:**
- Clear objection patterns (over-object vs. under-object)
- Specific language and tone for objections
- Competence level (experienced vs. rookie mistakes)
- How protective they are of their client

**Critical Requirements:**
- MUST always protect attorney-client privilege
- Should maintain basic professional behavior
- Instructions should feel like realistic lawyer behavior

### Rules Prompts
**Effective Elements:**
- Clear standard being applied (evidence rules vs. discovery rules)
- Specific examples of what changes under these rules
- How common objections should be handled differently
- Context for why these special rules apply

**Guidelines:**
- Keep rules coherent and internally consistent
- Don't create rules that would break deposition structure
- Consider real legal contexts where such rules might apply

## Advanced Customization Ideas

### Create Specialized Legal Contexts
- **Administrative Hearings**: More relaxed evidence standards
- **International Proceedings**: Different privilege rules
- **Family Court**: Heightened protection for sensitive information
- **Patent Depositions**: Technical foundation requirements

### Simulate Different Jurisdictions
- **Conservative Jurisdiction**: Strict evidence rules, formal procedures
- **Liberal Jurisdiction**: Broad discovery, relaxed objection standards
- **Business Court**: Efficiency-focused, commercial law emphasis

### Educational Scenarios
- **Law School Training**: Overly formal procedures for learning
- **Bar Exam Prep**: Strict rule compliance, technical objections
- **Continuing Education**: Common mistakes and corrections

## Testing and Refinement

### Test Your Prompts
1. Start with simple questions to verify basic behavior
2. Test edge cases (privilege, hearsay, complex objections)
3. Ensure all roles work together coherently
4. Verify the simulation remains realistic and educational

### Iterative Improvement
- Start with one role at a time
- Test preset combinations before adding custom prompts
- Save successful prompt combinations for reuse
- Document what works well for sharing with others

### Quality Indicators
**Good Custom Prompts:**
- Create realistic legal scenarios
- Maintain educational value
- Work consistently throughout a deposition
- Feel like authentic legal professionals

**Problem Signs:**
- AI behavior becomes incoherent or unrealistic
- Rules conflict with each other
- System breaks down during complex questioning
- Results are no longer educationally valuable