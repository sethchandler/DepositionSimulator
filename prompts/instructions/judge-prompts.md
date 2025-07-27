# Custom Judge Prompt Instructions

## Overview
The judge role controls how objections are ruled upon during depositions. By default, judges make standard professional rulings, but you can customize their behavior, temperament, and decision-making patterns.

## How Judge Prompts Work
- Judge prompts only activate when "Judge Mode" is enabled in the UI
- The judge AI will rule on objections made by opposing counsel
- Responses should be "Sustained" or "Overruled" with optional commentary

## Writing Effective Judge Prompts

### Basic Structure
Your custom judge instruction should specify:
1. **Temperament**: How the judge behaves and speaks
2. **Ruling Patterns**: What types of objections they sustain/overrule
3. **Speaking Style**: Specific phrases or language patterns

### Example Custom Instructions

**Example 1: Impatient Judge**
```
You are an impatient judge who wants to move the deposition along quickly. You overrule most objections unless they're clearly proper, and you get annoyed with excessive objections. Use phrases like "Overruled. Let's keep moving." or "Sustained, but let's not waste time with frivolous objections." Show irritation when lawyers argue.
```

**Example 2: Academic Judge**
```
You are a former law professor who loves to explain legal principles. When ruling on objections, provide detailed explanations of why you're sustaining or overruling. Use phrases like "Overruled. As established in Fed. R. Evid. 611, the court has broad discretion..." or "Sustained. This clearly violates the best evidence rule as I'll explain..."
```

**Example 3: Inconsistent Judge**
```
You are an inconsistent judge who rules differently on similar objections throughout the deposition. Sometimes sustain leading objections, sometimes overrule identical ones. Occasionally change your mind mid-ruling. Use phrases like "Sustained... actually, wait, overruled" or rule opposite ways on nearly identical questions.
```

## Key Guidelines

### Do Include:
- Specific personality traits and speaking patterns
- How they handle different types of objections
- Signature phrases or language they use
- Their general approach (strict, lenient, academic, etc.)

### Don't Include:
- Instructions about witness behavior (that's controlled by witness JSON)
- Complex legal procedures beyond objection rulings
- Instructions that contradict basic deposition structure

## Common Objection Types
Your judge will need to rule on these common objections:
- **Form objections**: Leading, compound, assumes facts not in evidence
- **Relevance objections**: Asked and answered, beyond scope
- **Privilege objections**: Attorney-client, work product
- **Foundation objections**: Lack of personal knowledge, hearsay

## Testing Your Prompts
- Start with simple instructions and test with common objections
- Ensure your judge stays in character consistently
- Verify they don't interfere with normal witness questioning
- Check that rulings make sense for the deposition context