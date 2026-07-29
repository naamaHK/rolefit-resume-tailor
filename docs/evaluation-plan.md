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

The score is calculated from the requirements that are in scope:

```text
Evidence Coverage Score =
  70% × weighted supported coverage
+ 20% × evidence explicitness / traceability
+ 10% × resume quality checks
```

Required requirements receive more weight than preferred requirements. An
unsupported keyword or fabricated claim receives **no coverage credit**. It is
reported separately by the safety gate, rather than being hidden inside a high
score.

Every score must show the requirement-level evidence behind it. A user should
be able to answer “why did I get this score?” without trusting a black box.

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

- the score must not gain credit for the invented claim;
- the result must be flagged as unsafe;
- the application must not silently apply the claim.

## Metrics to publish

Publish a small table for the held-out set, with the raw examples kept
anonymized:

- requirement classification precision, recall, and F1;
- evidence coverage score before and after;
- rate of expected positive score change for honest tailoring;
- score inflation on high-coverage resumes (target: near zero);
- unsupported-claim rate (target: 0%);
- required structure preservation rate (target: 100%);
- parser and workflow pass rate.

The score-change result is meaningful only alongside the safety metrics. A
larger score alone is not success.

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
