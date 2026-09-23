# RoleFit Resume Tailor

An evidence-grounded resume tailoring assistant.

The product promise is simple:

> Emphasize what is already true.

Given a resume and a target job description, the assistant analyzes the role, maps the resume evidence to the job requirements, proposes targeted changes, and requires the user to accept, edit, or reject every change before creating the final tailored resume.

## Language And Stack

This first version uses:

- HTML
- CSS
- Plain JavaScript
- Markdown prompt/rubric files

I chose this stack for the MVP because it runs locally with no install step and makes the product behavior easy to test. Once the prompt flow feels right, the natural next step is a TypeScript app, likely React or Next.js, with an LLM backend.

## Project Structure

```text
RoleFit_resume/
  index.html
  src/
    resume/
      document-parser.js
      experience-parser.js
      preview-highlighter.js
      text-editor.js
    app.js
    styles.css
  docs/
    architecture.md
    product_design.md
    resume_tailoring_rubric.md
  prompts/
    master_prompt.md
    prompt_pipeline.md
  data/
    sample_resume.txt
    sample_job_description.txt
```

## Run Locally

For the non-AI prototype, you can open this file in a browser:

```text
RoleFit_resume/index.html
```

For PDF upload and AI analysis, run the local server from this folder:

```bash
cd RoleFit_resume
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
cd RoleFit_resume
OPENROUTER_API_KEY="your_key_here" node server.mjs
```

3. Optional: choose a different model:

```bash
OPENROUTER_API_KEY="your_key_here" OPENROUTER_MODEL="google/gemini-2.5-flash-lite" node server.mjs
```

The default model is `google/gemini-2.5-flash-lite`.

To try the free NVIDIA model:

```bash
OPENROUTER_API_KEY="your_key_here" OPENROUTER_MODEL="nvidia/nemotron-3-ultra-550b-a55b:free" node server.mjs
```

## Live Evaluation Flow

The evaluation runner drives the actual RoleFit web page and its configured
OpenRouter model. It gives the page only the fixture's initial resume and
ordinary job description; the hidden profile is used only after RoleFit asks a
question. The runner records the final resume and then applies the independent
oracle scorer.

With the OpenRouter-backed server already running, run one fixture:

```bash
node evaluation/live-flow-runner.mjs evaluation/fixtures/001-product-data-analyst-simulation.json --output tmp/001-live-result.json
```

Run every fixture sequentially (the intended command once the corpus grows to
50–100 cases):

```bash
node evaluation/run-live-suite.mjs evaluation/fixtures tmp/live-evaluation-summary.json
```

These are real model calls. They are intentionally sequential so every run has
a clear model output, simulated-user decision, final resume, and oracle result.
The fast deterministic fixture tests remain separate and do not call a model.
Completed live-run records are available in `evaluation/results/`.

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
