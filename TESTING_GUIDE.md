# Deposition Trainer - New Features Testing Guide

## Overview
This guide will help you test the new transcript formatting, enhanced judge dialogue, mid-deposition personality changes, and AI-powered custom instruction parsing.

## Test Setup
1. Start your local server: `python3 -m http.server 8000`
2. Navigate to `http://localhost:8000`
3. Load any pre-built scenario (recommend "Homicide Case: The Eyewitness with a Secret")
4. Set up your API provider and key

---

## Test 1: Transcript Formatting

### Purpose
Verify that AI responses with multiple speakers are properly formatted with speaker labels.

### Steps
1. **Enable Judge Mode** - Check the "A Judge is present" checkbox
2. Ask these specific test questions:

**Test Question 1 (Leading):**
```
You were speeding, weren't you?
```
**Expected Result:**
```
Counsel: Objection, leading.
Judge: [Judge response addressing you]
[Witness response or instruction to rephrase]
```

**Test Question 2 (Compound):**
```
What did you see, what did you think, and where did you go after that?
```
**Expected Result:**
```
Counsel: Objection, compound.
Judge: [Judge response about the compound nature]
[Further dialogue]
```

**Test Question 3 (Privilege):**
```
What did your attorney tell you about this case?
```
**Expected Result:**
```
Counsel: Objection, attorney-client privilege.
Judge: [Judge asking for your response to privilege claim]
```

### Success Criteria
- ✅ Each speaker should be clearly labeled (Counsel:, Judge:)
- ✅ Line breaks should separate different speakers
- ✅ Unlabeled text should be assumed to be the witness

---

## Test 2: Enhanced Judge Dialogue

### Purpose
Verify that the judge addresses YOU (the deposing attorney) when handling objections, not opposing counsel.

### Steps
Using the same questions from Test 1, specifically look for:

**Judge addressing YOU about objections:**
- ❌ Wrong: "Counsel, can you clarify your objection?"
- ✅ Right: "Counsel has objected that your question is leading. Please rephrase or explain why it's proper."

**Judge surmising objection basis:**
- ✅ "I surmise counsel is objecting that the question is compound..."
- ✅ "Counsel has asserted doctor-patient privilege. I'd like to hear your thoughts on that."

### Success Criteria
- ✅ Judge speaks to YOU about how to handle objections
- ✅ Judge engages in realistic pre-ruling dialogue
- ✅ Judge shows appropriate judicial temperament

---

## Test 3: Mid-Deposition Personality Changes

### Purpose
Verify that changing opposing counsel personality mid-conversation works without resetting the chat.

### Steps
1. Start a conversation with **Professional Counsel** preset
2. Ask 2-3 questions and get responses
3. **During the conversation**, go to Advanced Settings
4. Change Opposing Counsel preset to **Aggressive Counsel**
5. Ask another question

### Expected Results
- ✅ Previous conversation history remains intact
- ✅ Next response uses aggressive counsel behavior
- ✅ No error messages or chat reset

### Test Variations
- Change from Aggressive → Inattentive
- Change custom text in the Custom Instructions field
- Change judge presets mid-conversation

---

## Test 4: AI-Powered Custom Instruction Parsing

### Purpose
Verify that uploaded text files are intelligently parsed and applied to appropriate roles.

### Test Files Provided
- `test_files/judge_impatient.txt` - Should affect judge behavior only
- `test_files/counsel_aggressive.txt` - Should affect counsel behavior only  
- `test_files/mixed_instructions.txt` - Should affect multiple roles

### Steps
1. Go to Advanced Settings → Import/Export
2. Upload `judge_impatient.txt`
3. Verify it populates the **Judge Custom Instructions** field
4. Enable Judge Mode and test with objections
5. Judge should be impatient and sarcastic

**Test the mixed file:**
1. Upload `mixed_instructions.txt`
2. Should populate multiple custom instruction fields
3. Test behavior matches the text descriptions

### Success Criteria
- ✅ AI correctly identifies which roles are mentioned
- ✅ Appropriate custom instruction fields are populated
- ✅ Behavior in conversation matches uploaded descriptions
- ✅ JSON files still work (backward compatibility)

---

## Test 5: Complex Objection Scenarios

### Purpose
Test sophisticated objection handling with realistic judicial engagement.

### Advanced Test Questions

**Relevance Objection:**
```
What's your favorite color?
```
**Expected:** Counsel objects to relevance, judge engages you about relevance

**Assumes Facts Not in Evidence:**
```
After you crashed into the plaintiff's car, what happened next?
```
**Expected:** Counsel objects to assuming facts, judge asks you to rephrase

**Privilege Variations:**
```
What did you tell your doctor about your injuries?
```
```
What did you discuss with your spouse about this incident?
```
**Expected:** Different privilege objections, judge engagement varies

---

## Troubleshooting

### If Tests Fail

**Transcript formatting not working:**
- Check browser console for JavaScript errors
- Verify the response parser is being called

**Judge addressing wrong person:**
- Check if custom judge instructions override defaults
- Verify prompt is reaching the AI correctly

**Mid-deposition changes not working:**
- Confirm changes are saving to state
- Check that `resetChat()` was removed from handlers

**File upload not parsing correctly:**
- Test with both simple and complex text files
- Check browser console for parsing errors
- Verify API calls are working for the parsing function

### Success Verification
After all tests pass, you should have a much more sophisticated and realistic deposition simulation that maintains proper transcript formatting and engaging judicial dialogue while allowing flexible customization.

---

## Performance Notes
- Each uploaded text file makes one additional API call for parsing
- Transcript formatting happens client-side (no additional cost)
- Judge dialogue enhancements work within existing single API call per response