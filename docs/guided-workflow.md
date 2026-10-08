# Guided tailoring

Guided tailoring is a bounded, human-in-the-loop workflow. The model chooses
whether to cite evidence, calculate experience, ask a focused question, propose
an edit, or leave a qualification unresolved. It observes tool results and user
answers before choosing its next action. Resume changes still require approval.

## Use it

1. Restart `node server.mjs` with your usual OpenRouter configuration after
   updating the server code. Refresh the browser.
2. Enter a resume and target job description, then click **Guided tailoring**.
3. Answer the questions, choose **I don't have this**, or **Skip**. Submit the
   batch. A relevant answer may lead to one focused follow-up.
4. Click **Review proposal** for a verified suggestion. Use the existing preview,
   placement, and acceptance controls to apply it. Nothing is auto-applied.
5. Use **Download session results** to save the input, qualifications, questions,
   answers, proposals, verification events, tool results, and model usage.

The original **Get Suggestions with AI** flow remains available for comparison.
Guided tailoring's 10-question limit applies to its question panel; the separate
manual Resume Check and baseline flow retain their existing behavior.

## Enforced limits

- At most 10 questions in a guided session, including follow-ups and skips.
- At most 5 pending questions per batch; an initial batch can be smaller.
- One initial question plus at most one follow-up for a qualification.
- One requested fact per question. The schema rejects multi-fact arrays and
  multiple question marks; the prompt requires atomic questions. Semantic
  bundling still needs evaluation, since punctuation checks cannot establish it.
- No repeat questions for denied, skipped, covered, or proposed qualifications.
- One revision attempt after an edit fails verification.
- At most 80 action attempts and 40 model calls, including verification.
- One fresh JSON generation is retried if a model response is malformed; the
  retry counts toward the 40-call budget. Provider failures are not retried.
- Repeated actions without new answers are rejected; two rounds with no valid
  actions stop the workflow. **Finish with current evidence** lets the user stop
  early. Unresolved qualifications are shown as **Not clarified**.

The server enforces these bounds. API clients cannot increase the question
limit beyond 10. `questionLimit` can reduce it for an experiment. The model
decides which useful gaps to investigate, considering both basic and preferred
qualifications, and may finish before spending the full budget.

## Evidence and verification

Every extracted qualification must cite an exact job quote. Supporting evidence
must quote the original resume or an actual answer. The job description,
generated suggestions, and model explanations cannot become candidate evidence.
Requirement IDs and question IDs link answers and proposals to their sources.
"Covered" now requires evidence in the original resume. A user answer may
establish a missing skill, but it cannot silently mark the resume complete;
the model must propose a verified, user-approved edit to represent that skill.

Coverage, date interval relevance, and proposed edits receive a separate model
verification call. Invalid verifier output fails closed. Ordinary code validates
source quotes, replacement anchors, numeric facts, action limits, and dates.
The date tool merges overlapping intervals and reports unique calendar months.
It rejects year-only dates rather than assuming exact months. The current month
is counted for “present”; month totals are not exact day-level tenure.

Verified means consistent with supplied evidence, not independently true in the
world. A model verifier can still err. Manually edited wording is not covered by
the prior verification. Coverage recognition, unsupported claims, unnecessary
questions, and structure preservation must still be measured independently.

## Module boundaries

| Module | Responsibility |
| --- | --- |
| `server/model-client.mjs` | Structured model adapter; injected existing provider transport |
| `server/workflow-routes.mjs` | Start/resume/read sessions; busy and stale-request protection |
| `server/workflow/state.mjs` | Immutable source snapshot, answers, limits, and event records |
| `server/workflow/controller.mjs` | Coordinate decisions, tool execution, pauses, and stopping |
| `server/workflow/decision.mjs` | Load prompts, build model context, record per-call usage |
| `server/workflow/tools.mjs` | Validate and dispatch the small set of allowed actions |
| `server/workflow/experience-duration.mjs` | Pure calendar interval calculation |
| `server/workflow/verifier.mjs` | Evidence/claim checks and proposal validation |
| `src/resume/workflow-client.js` | Browser requests and session lifecycle |
| `src/resume/workflow-view.js` | Questions, qualification statuses, and result presentation |
| `src/resume/workflow-review.js` | Convert verified proposals to existing pending review cards |

No extra framework or database is required. Sessions are memory-only, bounded
to 50 concurrent sessions, expire after an hour of inactivity, and are lost on
server restart. An unpredictable session ID identifies each session. The provider
transport remains shared with the existing server; only the new workflow logic
is extracted in this change, avoiding a simultaneous rewrite of that transport.

## Verification and evaluation

```bash
node tests/workflow-tests.mjs
node tests/workflow-browser-tests.mjs
node tests/guided-proposal-check-tests.mjs
```

The logic suite covers question/follow-up limits, atomic answer submission,
stale submissions, skips and denials, source validation, overlapping dates,
bounded revision, provider failures, and session expiration.

The browser suite drives the actual page, local HTTP routes, calculation tool,
question panel, preview, approval, and download in Chrome. Provider responses
are scripted. It exercises differently worded SQL evidence, overlapping jobs,
an unsupported Kubernetes qualification, a Docker follow-up, and correction of
an exaggerated rewrite. This verifies execution, not live-model quality.

For live evaluation, restart the real server with one fixed model and use the
same inputs for the baseline and guided modes. Keep the hidden user profile in
the harness only. Record representation change, grounding, structure,
unnecessary questions, question count, call count, latency, and cost separately.
The existing baseline runner is not yet a guided-workflow benchmark runner;
downloaded guided sessions provide the trace for initial manual comparisons.

For a first real-model smoke run with the synthetic Noa fixture, start the
server with your OpenRouter key, then run:

```bash
node evaluation/guided-live-smoke.mjs
```

This drives Chrome against the actual web page and answers only from the
fixture's hidden profile. Its result is saved under `evaluation/results/`.
The smoke run marks the flow incomplete if a profile-supported missing skill
does not receive a proposal, or if it proposes an unsupported skill. It checks
question flow and proposals, not an after score: a proposed edit is not an
applied resume until the user reviews and
accepts it in the UI. This is not yet the 50-case guided benchmark runner.
