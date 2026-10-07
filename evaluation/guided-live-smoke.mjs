import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { loadEvaluationFixture } from "./fixture-loader.mjs";

const fixturePath = path.resolve(process.argv[2] || "evaluation/fixtures/001-product-data-analyst-simulation.json");
const fixture = await loadEvaluationFixture(fixturePath);
if (fixture.id !== "001-product-data-analyst-simulation") {
  throw new Error("This first guided smoke runner has explicit answers only for fixture 001. Add a fixture-specific answer map before using another profile.");
}
const url = process.env.ROLEFIT_APP_URL || "http://127.0.0.1:8765/index.html";
const output = path.resolve(process.argv[3] || `evaluation/results/guided-${fixture.id}-live.json`);
const chrome = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
let playwright;
try { playwright = await import("playwright"); }
catch { playwright = await import(pathToFileURL(path.join(homedir(), ".cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.js")).href); }
playwright = playwright.chromium ? playwright : playwright.default;

// This first smoke simulation is deliberately a lookup table. It releases only
// facts from the hidden profile; it never asks an LLM to judge its own output.
function reply(requirement) {
  const label = requirement.text.toLowerCase();
  const oracle = fixture.oracle.requirements.find(item => {
    const term = item.label.toLowerCase();
    return label.includes(term) || term.includes(label);
  });
  if (oracle?.profile_supported === false) return { disposition: "denied", text: "" };
  const interaction = fixture.oracle.interactions.find(item => item.requirement_id === oracle?.id);
  if (interaction?.confirmed) return { disposition: "answered", text: interaction.simulated_user_answer };
  if (/\b3\+? years|years of .*data.analysis/i.test(label)) return {
    disposition: "answered", text: "I worked as a Data Analyst at CityCart from 2021–2023 and as a Product Data Analyst at Loop Commerce from 2023–Present."
  };
  if (/sql|python/i.test(label)) return {
    disposition: "answered", text: "At Loop Commerce, I use SQL and Python to analyze conversion, retention, and acquisition funnels."
  };
  if (/a\/b|experiment/i.test(label)) return {
    disposition: "answered", text: "At Loop Commerce, I design and analyze A/B tests for checkout and onboarding changes."
  };
  if (/communication|collaboration|product.*engineer/i.test(label)) return {
    disposition: "answered", text: "At Loop Commerce, I partner with product managers and engineers to define metrics and prioritize improvements."
  };
  return { disposition: "skipped", text: "" };
}

const browser = await playwright.chromium.launch({ headless: true, ...(existsSync(chrome) ? { executablePath: chrome } : {}) });
const page = await browser.newPage();
const pageErrors = [];
let state = null;
page.on("pageerror", error => pageErrors.push(error.message));
page.on("response", async response => {
  if (!/\/api\/workflow\/(?:start|advance)$/.test(response.url())) return;
  try {
    const body = await response.json();
    if (body.id) {
      state = body;
      console.log(`Workflow response: ${body.status}, revision ${body.revision}, ${body.modelCalls} model calls`);
    }
    else pageErrors.push(body.error || `Workflow HTTP ${response.status()}`);
  } catch (error) { pageErrors.push(error.message); }
});

async function waitForState(revision = -1) {
  const until = Date.now() + 240_000;
  while (Date.now() < until) {
    if (pageErrors.length) throw new Error(pageErrors.join("; "));
    if (state && state.revision > revision && ["waiting", "complete"].includes(state.status)) return state;
    await page.waitForTimeout(250);
  }
  throw new Error(`Timed out waiting for a guided workflow pause or completion (last revision ${state?.revision}, status ${state?.status}).`);
}

try {
  await page.goto(url);
  await page.locator("#resumeInput").fill(fixture.rolefit_input.resume_before);
  await page.locator("#jobInput").fill(fixture.rolefit_input.job_description);
  await page.locator("#startWorkflowBtn").click();
  await waitForState();
  while (state.status === "waiting") {
    const pending = state.questions.filter(question => question.disposition === "pending");
    if (!pending.length) throw new Error("Waiting without questions");
    console.log(`Answering ${pending.length} question(s), ${state.questions.length}/${state.limits.questions} used`);
    for (const question of pending) {
      const requirement = state.requirements.find(item => item.id === question.requirementId);
      const answer = reply(requirement);
      const field = page.locator(`[data-workflow-question="${question.id}"]`);
      await field.locator("select").selectOption(answer.disposition);
      if (answer.disposition === "answered") await field.locator("textarea").fill(answer.text);
      console.log(`  ${question.id}: ${answer.disposition} — ${requirement.text}`);
    }
    const revision = state.revision;
    await page.getByRole("button", { name: "Send answers", exact: true }).click();
    await waitForState(revision);
  }
  const result = {
    fixture_id: fixture.id, url, run_at: new Date().toISOString(),
    status: state.status, outcome: state.error ? "ERROR" : "COMPLETE", error: state.error || null,
    stop_reason: state.stopReason, model_calls: state.modelCalls, model_runs: state.modelRuns,
    questions: state.questions.map(q => ({ id: q.id, requirement_id: q.requirementId, question: q.question, disposition: q.disposition, answer: q.answer })),
    requirements: state.requirements.map(r => ({ text: r.text, category: r.category, status: r.status, reason: r.reason })),
    proposals: state.proposals, page_errors: pageErrors,
    note: "A proposal is not an applied resume edit. Before/after scoring requires review and approval in the web UI."
  };
  await mkdir(path.dirname(output), { recursive: true });
  await writeFile(output, `${JSON.stringify(result, null, 2)}\n`);
  console.log(`Guided live result: ${output}`);
  console.log(`Completed: ${state.questions.length} questions, ${state.proposals.length} proposals, ${state.modelCalls} model calls`);
} catch (error) {
  const status = await page.locator("#aiStatus").textContent().catch(() => "");
  const diagnostic = { error: error.message, status, page_errors: pageErrors, last_state: state };
  await mkdir(path.dirname(output), { recursive: true });
  await writeFile(output, `${JSON.stringify(diagnostic, null, 2)}\n`);
  console.error(`Guided smoke failed; diagnostic saved to ${output}`);
  throw error;
} finally {
  await browser.close();
}
