# RoleFit Evaluation Plan

## Purpose

Close the RoleFit MVP with an evaluation that answers a narrow, defensible
question:

> Does tailoring make truthful resume evidence easier to find for a specific
> job, without adding unsupported claims?

This is **not** a hiring prediction, ATS certification, or a claim that the
score predicts interview outcomes. The product-facing number will be called the
**Evidence Coverage Score**.

## What the score measures

For a resume and one job description, each job requirement is labeled as one
of:

- `supported_explicit`: directly stated in the resume.
- `supported_ambiguous`: plausibly supported, but not stated clearly enough to
  make a confident claim without user confirmation.
- `missing`: not supported by the resume.
- `not_applicable`: not a real candidate requirement (for example, boilerplate).

The only numerical match score is calculated from the requirements that are in
scope:

```text
Evidence Coverage Score = 100 × Σ(requirement weight × evidence value)
                                   / Σ(requirement weight)
```

Use `3 × importance` for a required requirement and `1 × importance` for a
preferred requirement, where importance is an annotated integer from 1 to 3.
Use evidence values of `1.0` for direct, explicit evidence; `0.5` for related
but ambiguous evidence; and `0.0` for missing evidence. The weights and values
are versioned with every fixture so they can be reviewed and calibrated rather
than treated as a hidden model decision.

Every score must show the requirement-level evidence behind it, including an
exact resume quote when the requirement is counted as supported. A user should
be able to answer “why did I get this score?” without trusting a black box.

Do not combine safety or document quality into this score. They are separate
results with different meanings.

### Binary Grounding Safety gate

Grounding Safety protects truthfulness. It passes only when every claim added
or strengthened by tailoring is either supported by the original resume or
explicitly confirmed by the user.

```text
If unsupported new claims > 0:
  Grounding Safety = FAIL
  Evidence Coverage Score = “Unsafe / not valid for comparison”
```

In the synthetic corpus, the hidden user profile tells the oracle whether the
fictional user truly has the skill or fact. In the real product, RoleFit cannot
know that directly, so it checks whether the claim is supported by the original
resume or a user confirmation. The product must not give coverage credit for an
unsupported keyword, skill, metric, degree, employer, title, or date.

An unsafe result is not merely a one-point penalty: a resume with invented
claims must never appear better because it has extra job keywords.

### Resume Structure & Quality Check

This check measures whether editing preserved a clear, professional document.
It does not claim to measure a recruiter's subjective opinion of the writing.
It is a transparent penalty rubric:

```text
Resume Structure & Quality Check = max(0, 100 − Σ(defect penalties))
```

| Defect | Penalty |
| --- | ---: |
| Core section missing or in the wrong order | 25 |
| Experience or Education entry missing title/program, organization, or date | 8 each |
| Empty or duplicate section | 7 each |
| Missing date on a dated entry | 5 each |
| Placeholder or internal workflow text | 10 |
| Inconsistent bullet formatting | 3 |
| Obvious spelling error | 1 each, capped at 5 |
| Overlong bullet (more than 35 words) | 2 each, capped at 6 |

The result must show each detected issue, not only a number. For example:

```text
85 / 100 — 3 issues found
• Add dates to “Data Analyst, Northstar”.
• Remove an empty Certifications heading.
• Correct “experince” to “experience”.
```

## Test corpus: 40 scenarios

Start with a deliberately small, reviewable corpus rather than a large
synthetic benchmark with unclear labels.

### Profiles and jobs

Create eight anonymized, synthetic user profiles. Each profile has a factual
source-of-truth record and one matching job description. Use a spread of
relevant roles, for example:

- data analyst
- data scientist
- applied ML engineer
- research engineer
- backend engineer
- product analyst
- analytics engineer
- technical program manager

Each profile record contains only facts that the fictional user may truthfully
claim: roles, employers, dates, projects, tools, education, results, and
explicitly absent skills. It is the oracle for grounding checks; it must not be
shown to the application under test.

Each job record contains atomic requirements with `required` or `preferred`
priority, a weight, and the facts that would count as valid evidence.

### Resume variants

For every profile/job pair, create four original-to-tailored pairs:

1. **High coverage / clear** — the resume already states nearly all relevant
   evidence. Tailoring should produce little or no score gain.
2. **Partial coverage** — relevant evidence exists, but two important
   requirements are genuinely missing. Tailoring may improve clarity, but must
   ask a question rather than invent those requirements.
3. **Ambiguous coverage** — transferable or related experience is present but
   the wording is blurred. The system should earn limited coverage and ask for
   confirmation before making the claim stronger.
4. **Noisy document** — the same factual profile includes realistic quality
   defects such as a missing date, misspelling, malformed section, or unclear
   bullet. The structure and spelling checks should detect the defect without
   corrupting the resume.

This creates **32 before/after scoring pairs** (8 profiles × 4 variants).
Add **8 adversarial safety scenarios**, one per profile, where an otherwise
polished tailored resume contains an invented skill, metric, degree, date, or
employer. These are validation-only cases: the score must not improve because
of the invention, and the safety gate must fail the result.

Total initial corpus: **40 scenarios**. This is large enough to reveal repeated
failure modes but small enough for careful manual review.

### Development and held-out split

- Development: 24 scoring pairs from six profiles.
- Held out: 8 scoring pairs from two profiles.
- Safety: 8 adversarial scenarios, kept held out from tuning.

Do not change scoring rules after inspecting held-out results. If a rule needs
to change, add a new development scenario first and record the reason.

## Before/after success criteria

For every honest pair:

- the tailored resume may increase explicitness and requirement coverage only
  when it surfaces facts already present in the profile;
- a high-coverage original must not receive a material artificial boost;
- missing requirements must remain missing or become a targeted user question;
- accepted edits must preserve the header, Experience, Education, dates, and
  section order;
- the final resume must contain no placeholder or internal workflow section.

For every adversarial scenario:

- the output must fail the binary Grounding Safety gate;
- the Evidence Coverage Score must be shown as unsafe/not valid for comparison,
  not as a higher or lower ordinary score;
- the application must not silently apply the claim.

## Metrics to publish

Publish a small table for the held-out set, with the raw examples kept
anonymized:

- requirement classification precision, recall, and F1;
- evidence coverage score before and after;
- rate of expected positive score change for honest tailoring;
- score inflation on high-coverage resumes (target: near zero);
- Grounding Safety pass rate and unsupported-claim rate (target: 100% pass and
  0% unsupported claims);
- Resume Structure & Quality Check before and after, plus required structure
  preservation rate (target: 100%);
- parser and workflow pass rate.

The score-change result is meaningful only alongside the binary safety gate and
the structure-and-quality result. A larger score alone is not success.

## Preventing evaluation bias

Keep the evaluation **in this repository**, because it must run with the
product and remain reproducible. Keep it independent by design:

- store fixtures and expected labels under an `evaluation/` directory;
- do not import RoleFit's matching or suggestion functions into the oracle
  scorer;
- keep the profile fact record separate from the resume text fed to RoleFit;
- use the held-out split and do not tune to it;
- version fixtures, expected results, scorer configuration, and model names.

A separate repository would make the work harder to reproduce, but would not
by itself remove bias. Independent labels, a held-out split, and transparent
baselines do.

## Scoring implementation plan

Use two independent views of the same pair.

1. **Oracle scorer (primary evaluation)**
   - Uses the hand-authored profile facts and requirement labels.
   - Deterministically validates that a score increase is grounded.
   - Is the source of truth for safety and structural assertions.

2. **Blind match scorer (product-facing experiment)**
   - Sees only the resume and job description, never the hidden profile facts.
   - Returns per-requirement status, evidence excerpts, and the Evidence
     Coverage Score.
   - Is compared against the oracle scorer rather than treated as truth.

Include two simple baselines for the blind scorer:

- keyword/skill overlap;
- fuzzy skill matching.

This demonstrates that RoleFit is doing more than counting keywords.

## Model experiment and cost control

Do not upgrade the production model before the evaluation exists.

Phase 1 should use the current economical model with deterministic settings:

- temperature 0;
- strict JSON schema;
- requirement-level evidence quotes;
- one run per development and held-out example.

Measure agreement with the oracle and parsing reliability first. Then run a
stronger model only on the held-out cases and on disagreements. This creates a
useful quality/cost comparison without paying for a stronger model on every
fixture.

Run the economical model three times on 12 selected cases to measure score
stability. If the result varies materially, report that variance; do not hide
it by averaging away unstable outputs.

The small model is sufficient for the first experiment. The point is to learn
whether better prompting, structured output, and validation close the gap—not
to spend money before knowing where the failures are.

## Demo and publication deliverables

When the evaluation passes, add:

- a README evaluation section with method, split, metric definitions, results,
  limitations, and the exact model configuration;
- two or three anonymized screenshots plus a 60–90 second demo video;
- one demo case that shows a truthful score increase;
- one demo case that shows an unsupported requirement becoming a question,
  rather than a fabricated resume claim;
- a tagged `v0.1.0` release.

## Tomorrow's first implementation session

1. Define the JSON schema for profiles, job requirements, resume variants, and
   expected outputs.
2. Write one complete profile/job with all four honest variants and one
   adversarial variant.
3. Implement the deterministic oracle scorer and its unit test.
4. Confirm the metric behavior before generating the other seven profiles.

No production score should be shown to users until the first fixture and its
before/after behavior are reviewed manually.
