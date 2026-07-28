# Prompt Pipeline

The MVP can begin with one master prompt, but the production version should use a pipeline because it is easier to debug and evaluate.

## Stage 1: Analyze Job Description

Extract:

- target title
- seniority
- required skills
- preferred skills
- responsibilities
- domain keywords
- repeated terms
- hidden priorities
- ATS keywords

## Stage 2: Extract Resume Evidence

Extract only claims supported by the resume:

- roles
- employers
- dates
- projects
- skills
- metrics
- publications
- patents
- tools
- leadership signals
- production/deployment signals
- domain experience

Every evidence item should include source text.

## Stage 3: Match And Gap Analysis

Compare job requirements to resume evidence:

- strong matches
- partial matches
- missing signals
- relevant but unsupported signals
- irrelevant content to de-emphasize
- risk flags

## Stage 4: Tailoring Strategy

Decide:

- what to emphasize
- what to de-emphasize
- what to ask the user
- which sections should move
- which bullets should be rewritten
- which keywords can be added safely

## Stage 5: Generate Change Cards

Generate individual change cards. Each card should be independently reviewable and should not depend on hidden edits.

## Stage 6: Apply Accepted Changes

Only accepted or user-edited changes are applied to the final resume.

## Stage 7: Final Verification

Check:

- unsupported claims
- exaggerated skills
- changed dates/titles/employers
- missing high-priority keywords
- keyword stuffing
- vague bullets
- weak summary
- structure issues
