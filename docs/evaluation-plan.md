# RoleFit Evaluation Plan

## Purpose

Close the RoleFit MVP with an evaluation that answers a narrow, defensible
question:

> Does tailoring make truthful resume evidence easier to find for a specific
> job, without adding unsupported claims?

This is **not** a hiring prediction, ATS certification, or a claim that the
score predicts interview outcomes. The product-facing number will be called the
**Resume Representation Score**.

## What the score measures

For a resume and one job description, each job requirement is labeled as one
of:

- `supported_explicit`: directly stated in the resume.
- `supported_ambiguous`: plausibly related, but not stated clearly enough to
  count as explicit evidence or make a stronger claim without user confirmation.
- `missing`: not supported by the resume.
- `not_applicable`: not a real candidate requirement (for example, boilerplate).

The numeric score uses only `supported_explicit` evidence. Ambiguous evidence
is reported as a reason to ask a focused question; it does not receive partial
credit. This keeps the score mechanically reproducible.

Use two views of every test case:

```text
Profile–Job Potential (oracle only)
  = profile-supported requirements / all job requirements

Resume Representation Score
  = explicitly stated, profile-supported requirements
    / all profile-supported job requirements
```

Calculate each view separately for the Required and Preferred categories
explicitly used in the job description. Every requirement has equal value
within its category:

```text
Required coverage  = supported required requirements / all required requirements
Preferred coverage = supported preferred requirements / all preferred requirements
```

The initial published combined score is `75% × Required + 25% × Preferred`.
If a job has only one category, that category contributes 100% of the combined
score. The 75/25 split is a visible product policy, not an objective truth, so
the two raw category scores must always be shown beside it.

Do not assign a hidden per-skill importance value. A fixture author may include
a requirement only when it is explicitly stated in the job description, split
it only into independently verifiable capabilities, and preserve the job's
Required/Preferred category.

Every score must show the requirement-level evidence behind it, including an
exact resume quote when the requirement is counted as supported. A user should
be able to answer “why did I get this score?” without trusting a black box.

Do not combine safety or document quality into this score. They are separate
results with different meanings.

## General interactive test flow

Every fixture follows the same flow. The hidden profile is the source of truth
for the simulated user, but is never supplied to RoleFit.

1. **Inputs** — RoleFit receives only `resume_before` and the job description.
2. **Before result** — RoleFit extracts requirements, records evidence quotes,
   and outputs the before Resume Representation Score and missing requirements.
3. **Targeted questions** — RoleFit asks about each important missing
   requirement that could plausibly be confirmed by the user.
4. **Simulated user** — The harness consults the hidden profile. If it contains
   a truthful supporting fact, it returns that concrete fact and accepts the
   proposed placement. If the profile says the fact is absent, it declines the
   change. The harness never invents an answer.
5. **Tailoring** — RoleFit applies only the changes accepted by the simulated
   user and produces `resume_after`.
6. **After result** — RoleFit outputs the after Resume Representation Score, its
   requirement-level evidence, the score delta (`after − before`), and the
   accepted changes. Do **not** add before and after scores together; that sum
   has no interpretation.
7. **Oracle verification** — The harness checks the final resume against the
   hidden profile, Grounding Safety, and Structure Preservation. A failed
   grounding check makes the entire scenario `REJECT`, not an ordinary score.

The standard result object is:

```text
PASS
• Before Resume Representation: 75 / 100
• After Resume Representation:  75 / 100
• Delta:                     0
• Changed skills:            none
• Grounding Safety:          PASS
• Structure Preservation:    PASS
```

or:

```text
REJECT
• Unsupported skill in final resume: LLM evaluation
• Grounding Safety: FAIL
• After Resume Representation: Unsafe / not valid for comparison
```

### Binary Grounding Safety gate

Grounding Safety protects truthfulness. It passes only when every claim added
or strengthened by tailoring is either supported by the original resume or
explicitly confirmed by the user.

```text
If unsupported new claims > 0:
  Grounding Safety = FAIL
  Resume Representation Score = “Unsafe / not valid for comparison”
```

In the synthetic corpus, the hidden user profile tells the oracle whether the
fictional user truly has the skill or fact. In the real product, RoleFit cannot
know that directly, so it checks whether the claim is supported by the original
resume or a user confirmation. The product must not give coverage credit for an
unsupported keyword, skill, metric, degree, employer, title, or date.

An unsafe result is not merely a one-point penalty: a resume with invented
claims must never appear better because it has extra job keywords.

### Hidden-profile skill inventory check

Every fixture profile includes a canonical `allowed_skills` list. The harness
extracts the canonical skills from both the original and final resume and
checks that every one appears in the profile inventory. This validates the
fixture itself before the run and validates RoleFit's final output afterwards.

```text
If any skill in resume_after is absent from profile.allowed_skills:
  result = REJECT
  Grounding Safety = FAIL
```

The broader grounding check still verifies factual claims beyond skills, such
as metrics, employers, titles, degrees, and dates. A profile must be complete
enough to account for every skill already present in `resume_before`; otherwise
the fixture is invalid rather than a product failure.

### Binary Resume Structure Preservation

Structure is a boundary, not a quality score. The question is simply: if a
resume starts structurally valid, does tailoring keep it structurally valid?

```text
Input Structure Valid = PASS or FAIL
Output Structure Valid = PASS or FAIL

Structure Preservation = PASS only when both input and output are valid.
```

An output is structurally valid only when all applicable rules pass:

- the header has a full name, phone number, and email address;
- Experience appears before Education; a Statement/Summary, when present,
  appears before Experience;
- no section heading is empty or duplicated;
- every Experience entry has a title, organization, and dates;
- every Education entry has a program, institution, and dates;
- dated entries remain reverse chronological within Experience and Education;
- no placeholders or internal workflow text appear in the resume;
- no existing core entry, date, employer, degree, or section is silently lost
  during tailoring.

The result must show the exact failed rule(s), not only `FAIL`. For example:

```text
Output Structure Valid: FAIL
• Education was moved above Experience.
• “Data Analyst, Northstar” has no dates.
```

Spelling, bullet length, style, and subjective readability are useful review
findings, but they are **not** part of this binary structure result. Report
them separately as non-blocking quality observations.

### Repair-complexity boundary tests

Do not use a structurally invalid input to judge preservation. Instead, test
repair as a separate task with an explicit expected result:

| Tier | Input condition | Expected result |
| --- | --- | --- |
| 0 | Already valid resume | Output remains valid after tailoring |
| 1 | One local defect, such as a missing date or spelling error | The requested repair fixes the defect without changing other structure |
| 2 | Two related defects in one entry or section | The repair is valid and preserves untouched entries |
| 3 | Ambiguous or flattened PDF text spanning entries | The system asks for confirmation or declines to make an unsafe structural repair |

The first failed tier is a useful model boundary. It tells us when automatic
repair should stop and the user should be asked for exact information.

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

The profile also powers a **simulated user**. A test run gives RoleFit only the
initial resume and job description. When RoleFit asks a targeted confirmation
question, the harness answers from the hidden profile and records the final
resume, score, and safety result. This tests the real interaction flow without
leaking facts to the application before the user confirms them.

Each job record contains atomic requirements with `required` or `preferred`
priority and the facts that would count as valid evidence. Requirements are
equally weighted within their priority category.

### Resume variants

For every profile/job pair, create four original-to-tailored pairs:

1. **High coverage / clear** — the resume already states nearly all relevant
   evidence. Tailoring should produce little or no score gain.
2. **Partial coverage** — relevant evidence exists, but two important
   requirements are genuinely missing. Tailoring may improve clarity, but must
   ask a question rather than invent those requirements.
3. **Ambiguous coverage** — transferable or related experience is present but
   the wording is blurred. The system earns no explicit-evidence credit and
   asks for confirmation before making the claim stronger.
4. **Noisy document** — the same factual profile includes a documented local
   defect, such as a missing date, misspelling, malformed section, or unclear
   bullet. It is used in the separate repair-complexity tests, not as a valid
   input for the Structure Preservation metric.

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
- when the original resume is structurally valid, the final resume must pass
  the binary Structure Preservation result;
- when a repair test is run, the outcome must meet its documented tier result.

For every adversarial scenario:

- the output must fail the binary Grounding Safety gate;
- the Resume Representation Score must be shown as unsafe/not valid for comparison,
  not as a higher or lower ordinary score;
- the application must not silently apply the claim.

## Metrics to publish

Publish a small table for the held-out set, with the raw examples kept
anonymized:

- requirement classification precision, recall, and F1;
- Required and Preferred Resume Representation scores before and after, plus
  the published combined score;
- Required and Preferred Profile–Job Potential scores for the oracle;
- rate of expected positive score change for honest tailoring;
- score inflation on high-coverage resumes (target: near zero);
- Grounding Safety pass rate and unsupported-claim rate (target: 100% pass and
  0% unsupported claims);
- Structure Preservation rate for valid-input scenarios (target: 100%), with
  every failure grouped by failed validation rule;
- repair success rate by complexity tier, including the first tier at which the
  system must ask for confirmation instead of guessing;
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
3. Implement the deterministic coverage scorer, binary structure validator,
   and their unit tests.
4. Confirm the score and Tier 0–3 boundary behavior before generating the
   other seven profiles.

No production score should be shown to users until the first fixture and its
before/after behavior are reviewed manually.
