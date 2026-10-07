# RoleFit Resume Tailor

An evidence-grounded resume tailoring assistant.

The product promise is simple:

> Emphasize what is already true.

Given a resume and a target job description, the assistant analyzes the role, maps the resume evidence to the job requirements, proposes targeted changes, and requires the user to accept, edit, or reject every change before creating the final tailored resume.

## Live Demo

[![RoleFit live walkthrough](docs/demo/rolefit-demo.gif)](https://raw.githubusercontent.com/naamaHK/rolefit-resume-tailor/main/docs/demo/rolefit-demo.webm)

[Watch the full live walkthrough](https://raw.githubusercontent.com/naamaHK/rolefit-resume-tailor/main/docs/demo/rolefit-demo.webm).

The captioned demo uses a fictional Revenue Operations resume and the real RoleFit interface with live Gemini 3.8 Flash analysis, AI rephrasing, and candidate-approved changes.

## Language And Stack

This first version uses:

- HTML
- CSS
- Plain JavaScript
- Markdown prompt/rubric files

I chose this stack for the MVP because it runs locally with no install step and makes the product behavior easy to test. Once the prompt flow feels right, the natural next step is a TypeScript app, likely React or Next.js, with an LLM backend.

## Project Structure

```text
rolefit-resume-tailor/
  index.html
  server.mjs
  server/
    workflow/
  src/
    resume/
  evaluation/
    fixtures/
    results/
  tests/
  docs/
  prompts/
```

This is the only active RoleFit project folder. The former standalone
`RoleFit_resume` checkout is preserved locally at `.legacy/RoleFit_resume`,
including its Git history, and is ignored by the public repository. Do not run
the server from that archived checkout. The local web server serves only the
HTML, JavaScript, CSS, and PDF.js files needed by the app; it does not expose
evaluation profiles, prompts, archives, or Git files as static assets.

## Run Locally

For the non-AI prototype, you can open this file in a browser:

```text
rolefit-resume-tailor/index.html
```

For PDF upload and AI analysis, run the local server from this folder:

```bash
cd rolefit-resume-tailor
node server.mjs
```

Then open:

```text
http://127.0.0.1:8765/index.html
```

To test on your phone, keep the phone and the computer running the server on the same Wi-Fi and use the network URL printed by the server, for example:

```text
http://192.168.x.x:8765/index.html
```

Do not use `127.0.0.1` on the phone. On a phone, `127.0.0.1` means the phone itself, not the computer running the server.

## Test Locally

Run the fast logic and server tests:

```bash
node tests/experience-parser-tests.mjs
node tests/document-parser-tests.mjs
node tests/text-editor-tests.mjs
node tests/preview-highlighter-tests.mjs
node tests/deletion-preview-tests.mjs
node tests/evaluation-oracle-tests.mjs
node tests/live-flow-runner-tests.mjs
node tests/live-flow-runner-integration-tests.mjs
node tests/role-requirements-tests.mjs
node tests/regression-tests.mjs
node tests/placement-flow-tests.mjs
node tests/server-json-tests.mjs
node tests/static-assets-tests.mjs
node tests/workflow-model-retry-tests.mjs
node tests/workflow-tests.mjs
node tests/workflow-browser-tests.mjs
```

Run the mobile layout smoke test:

```bash
node tests/mobile-layout-tests.mjs
```

The mobile test uses Playwright when available. In the Codex runtime it can use the bundled Playwright package and local Chrome.

The incremental frontend modularization plan is documented in
`docs/architecture.md`.

## OpenRouter Setup

The AI button calls OpenRouter from the local Node server. Do not put your OpenRouter key in browser JavaScript.

1. Create an OpenRouter API key at:

```text
https://openrouter.ai/keys
```

2. Start the server with the key:

```bash
cd rolefit-resume-tailor
OPENROUTER_API_KEY="your_key_here" node server.mjs
```

By default, RoleFit tries Gemini first and Muse as its fallback:

```bash
OPENROUTER_API_KEY="your_key_here" OPENROUTER_MODEL="google/gemini-3.8-flash,meta/muse-spark-1.3" node server.mjs
```

The configured order is:

- `google/gemini-3.8-flash`
- `meta/muse-spark-1.3`

To override the model order, provide a comma-separated `OPENROUTER_MODEL` value:

```bash
OPENROUTER_API_KEY="your_key_here" OPENROUTER_MODEL="meta/muse-spark-1.3,google/gemini-3.8-flash" node server.mjs
```

## Guided Tailoring

Click **Guided tailoring** with a resume and target job to try the bounded
agentic workflow. It checks evidence, can calculate overlapping experience,
asks up to 10 questions including follow-ups, and verifies proposed wording
before sending it to the existing approval interface. Basic and preferred
qualifications are both considered; unresolved gaps remain visible.

Restart the Node server after updating. See [the guided workflow guide](docs/guided-workflow.md)
for module boundaries, limits, session downloads, and test commands. The original
AI suggestion flow remains available for comparison.

## Live Evaluation Flow

The evaluation runner drives the actual RoleFit web page and its configured
OpenRouter model. It gives the page only the fixture's initial resume and
ordinary job description; the hidden profile is used only after RoleFit asks a
question. The runner records the final resume and then applies the independent
oracle scorer.

For a model comparison, start RoleFit in evaluation mode with exactly one
model. Evaluation mode fixes the analysis temperature at `0` and refuses a
multi-model fallback configuration:

```bash
OPENROUTER_API_KEY="your_key_here" ROLEFIT_EVALUATION_MODE=1 OPENROUTER_MODEL="google/gemini-3.8-flash" node server.mjs
```

With the OpenRouter-backed server already running, run one fixture:

```bash
node evaluation/live-flow-runner.mjs evaluation/fixtures/001-product-data-analyst-simulation.json --expected-model google/gemini-3.8-flash --output tmp/001-live-result.json
```

Run every fixture sequentially (the intended command once the corpus grows to
50–100 cases):

```bash
ROLEFIT_EVALUATION_EXPECTED_MODEL="google/gemini-3.8-flash" node evaluation/run-live-suite.mjs evaluation/fixtures/benchmark tmp/gemini-benchmark-summary.json
```

These are real model calls. They are intentionally sequential so every run has
a clear model output, simulated-user decision, final resume, and oracle result.
The fast deterministic fixture tests remain separate and do not call a model.
Completed live-run records are available in `evaluation/results/`.

Stop and restart the server with `OPENROUTER_MODEL="meta/muse-spark-1.3"`, then
run the same fixtures with `ROLEFIT_EVALUATION_EXPECTED_MODEL` set to Muse for
a separate comparison. Every result records the complete analysis response,
requested and returned model, provider, latency, model attempts, and any token
or cost fields returned by OpenRouter.

## MVP Flow

1. Paste a resume.
   You can also upload a PDF or text file. Review the extracted text before analysis.
2. Paste a job description.
3. Click `Analyze`.
   Use `Analyze` for the local heuristic prototype, or `Analyze with AI` for OpenRouter.
4. Review suggested changes.
5. Accept, edit, or reject each change.
   When the app asks about experience missing from the resume, write your real experience in the confirm-experience box. The helping questions are there to guide what to include. You can click `AI Rephrase` to turn your rough note into one resume-style bullet, then approve it manually.
6. Generate the final resume text from approved changes.
7. Choose an export style:
   - `ATS-friendly` for job portals and parsers.
   - `Designed` for a two-column visual resume inspired by the original layout.
8. Click `Export PDF` to open a polished printable resume, then use `Save As PDF`.

If the app asks about missing experience, such as LLM experience, it will not add a bare "yes" to the resume. The user must write a concrete truthful bullet first. Accepted user-confirmed bullets are added under `USER-CONFIRMED ADDITIONS` in the draft.

## Current Limitations

This version uses lightweight local heuristics so the interaction can be tested without an API key. The real AI behavior is specified in the prompt files under `prompts/`.

Next implementation step:

- Connect the prompt pipeline to an LLM API.
- Require JSON output that matches the change-card schema.
- Add a final verifier that checks unsupported claims before export.
