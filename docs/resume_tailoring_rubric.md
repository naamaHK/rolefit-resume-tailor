# Resume Tailoring Rubric

This rubric defines what the assistant should optimize for.

## Core Principles

1. Truth first.
   Do not invent employers, titles, dates, tools, metrics, skills, publications, patents, certifications, or responsibilities.

2. Relevance over generic polish.
   A tailored resume should make the most job-relevant existing evidence easier to see.

3. Evidence grounding.
   Every suggested change must be supported by the original resume or by explicit user confirmation.

4. Human control.
   The user accepts, edits, or rejects every change.

5. Concision.
   Prefer clear, dense bullets over long paragraphs.

6. Impact orientation.
   Prefer outcomes, scope, metrics, and business/user impact over responsibility-only wording.

7. Natural keyword coverage.
   Important job keywords should appear naturally where truthful. Avoid keyword stuffing.

8. Recruiter and ATS readability.
   The resume should be easy for a human to scan and easy for an ATS to parse.

9. Seniority signal.
   Show ownership, leadership, ambiguity handled, cross-functional work, production impact, and decision-making scope.

10. Risk awareness.
   Flag unsupported or exaggerated claims before they enter the resume.

## Required Structure

The first four sections are fixed and must not be reordered:

1. Header
   - Name
   - email
   - phone
   - LinkedIn
   - GitHub or portfolio when relevant
   - location optional

2. Professional Summary / Profile / Statement
   - 2-4 lines
   - tailored to the target role
   - includes seniority, domain, strongest technical areas, and impact
   - avoids vague "seeking to learn" language for experienced candidates

3. Professional Experience
   - reverse chronological
   - title, company, dates
   - bullets should emphasize impact, methods, scope, and relevance

4. Education
   - degree, institution, dates
   - always after experience

Optional sections may appear after Education:

5. Skills / Technical Skills
   - grouped when useful
   - should reflect skills the user can defend in an interview
   - should include job-relevant terms that are supported by evidence

6. Selected Projects
   - optional
   - useful for career transitions, recent upskilling, AI projects, or portfolio work
   - should include problem, method, result, and stack

7. Publications / Patents / Awards / Certifications / Links
   - optional
   - include when relevant or impressive
   - compress when they take space away from more relevant experience

8. Languages / Other
   - optional

## Ordering Rules

- Header, Professional Summary / Statement, Experience, and Education must always appear in that order.
- Do not suggest moving Skills before Experience.
- Do not suggest moving Publications or Patents before Education.
- Other/custom sections may appear only after Education.
- The main resume should fit on one page when possible; page two may contain only Publications, Patents, and Google Scholar / portfolio links.

## Bullet Quality

A strong bullet usually follows:

```text
Action + context + method + impact
```

Good:

```text
Improved a customer analytics workflow using experimentation and statistical analysis, increasing weekly activation by 12%.
```

Weak:

```text
Responsible for machine learning projects and data analysis.
```

## Rewrite Rules

Prefer:

- led
- designed
- built
- deployed
- evaluated
- optimized
- analyzed
- partnered
- translated
- improved
- reduced
- increased

Avoid overusing:

- helped
- worked on
- responsible for
- utilized
- participated in
- familiar with

## When To Ask The User

Ask a targeted follow-up question when:

- the job asks for a skill missing from the resume
- the resume suggests adjacent experience
- adding the skill could materially improve role fit
- the claim would be unsafe without confirmation

Do not ask broad unfocused questions.

## Final Verification Checklist

Before creating the final resume, verify:

- every changed claim is supported
- no unconfirmed skills were added
- metrics are unchanged unless user confirmed updates
- dates, employers, titles, degrees, publications, and patents are unchanged
- keywords are natural
- bullets are concise
- role-relevant content is easy to find
- the final resume does not overstate the candidate's experience
