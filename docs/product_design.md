# Product Design

## Working Name

RoleFit Resume Tailor

## One-Sentence Description

An evidence-grounded resume tailoring assistant that compares a resume to a target job description and suggests user-approved changes that make the resume more relevant without inventing experience.

## Core Promise

Emphasize what is already true.

## Primary User

A job seeker who has real experience but needs help adapting the resume for a specific role. The user may have relevant experience that is missing from the resume, but the assistant must ask before adding it.

## Inputs

- Original resume text
- Target job description
- Target role title, optional
- User preferences, optional:
  - one-page or two-page resume
  - technical, leadership, or balanced tone
  - include projects or not
  - include career gap explanation or not
  - skills the user can confidently discuss in interviews
  - skills the user does not want to claim

## Outputs

- Job requirement summary
- Resume evidence map
- Match and gap analysis
- Suggested changes as individual change cards
- User questions for relevant but unsupported experience
- Final tailored resume built only from accepted changes
- Final truthfulness and quality checks

## Main Workflow

1. User provides resume and job description.
2. System extracts job requirements.
3. System extracts evidence from the resume.
4. System compares job requirements with resume evidence.
5. System creates a tailoring strategy.
6. System proposes changes one by one.
7. User accepts, edits, or rejects every change.
8. System applies accepted changes.
9. System verifies that final claims are supported by resume evidence or user confirmation.

## Change Card Schema

Each suggested change should include:

- `id`
- `type`: rewrite, add_keyword, reorder_section, remove_or_deemphasize, ask_user, add_user_confirmed
- `section`
- `original_text`
- `suggested_text`
- `why_it_helps`
- `evidence`
- `risk_level`: low, medium, high
- `support_level`: resume_supported, user_confirmation_needed, unsupported
- `status`: pending, accepted, edited, rejected

## Evidence Levels

### Resume-Supported

The claim is clearly supported by the original resume. The assistant may suggest a rewrite, but the user must still approve it.

### User-Confirmed

The claim is not in the resume, but the user explicitly confirms it. The assistant may add it and mark it as user-provided.

### Unsupported

The claim is neither in the resume nor confirmed by the user. The assistant must not add it.

## User Approval Rule

The assistant never silently rewrites the resume. Every change must be accepted, edited, or rejected.

## User Question Rule

Ask the user only when a missing item is important for the target role and plausibly relevant to the candidate.

Bad:

```text
Do you have any other skills?
```

Good:

```text
The job asks for LLM evaluation. Your resume mentions model evaluation and A/B testing, but not LLM-specific evaluation. Have you evaluated LLM outputs or prompts in a structured way?
```

## Portfolio Angle

The project should emphasize:

- structured extraction
- evidence-grounded generation
- human-in-the-loop editing
- hallucination prevention
- role-specific resume optimization
- final verification
