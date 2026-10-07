import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { resolve, extname } from "node:path";
import { pathToFileURL } from "node:url";
import { createWorkflowRoutes } from "../server/workflow-routes.mjs";

// Real page + HTTP workflow + tools + review UI. Only the provider responses are
// scripted: this tests wiring/guardrails, not the quality of a live LLM.
const resume = `Maya Cohen
050-555-0100 | maya@example.com

SUMMARY
Software engineer building database applications.

EXPERIENCE
Software Engineer 2022-01 - 2025-12
Company B
- Built applications with PostgreSQL.
Software Engineer 2020-01 - 2023-12
Company A
- Built internal services.

EDUCATION
B.Sc. Computer Information Systems 2016 - 2020
Example University

SKILLS
PostgreSQL`;
const job = "Basic Qualifications: SQL; Docker; 7 years of relevant experience. Preferred Qualifications: Kubernetes.";
const evidence = (sourceId, quote) => [{ sourceId, quote }];
const after = "Built PostgreSQL applications and containerized them with Docker for local development.";
const proposal = text => ({ type: "propose_edit", requirementId: "r2", originalText: "Built applications with PostgreSQL.", suggestedText: text, section: "Experience", evidence: [
  ...evidence("resume", "Built applications with PostgreSQL."), ...evidence("q3", "I containerized applications with Docker for local development.")
] });
const steps = [
  { requirements: [
    { text: "SQL", jobQuote: "SQL", category: "basic" },
    { text: "Docker", jobQuote: "Docker", category: "basic" },
    { text: "Kubernetes", jobQuote: "Kubernetes", category: "preferred" },
    { text: "7 years of relevant experience", jobQuote: "7 years of relevant experience", category: "basic" }
  ] },
  { actions: [
    { type: "record_evidence", requirementId: "r1", evidence: evidence("resume", "Built applications with PostgreSQL."), reason: "Equivalent SQL evidence" },
    { type: "calculate_experience", requirementId: "r4", intervals: [
      { start: "2020-01", end: "2023-12", evidence: evidence("resume", "Software Engineer 2020-01 - 2023-12\nCompany A") },
      { start: "2022-01", end: "2025-12", evidence: evidence("resume", "Software Engineer 2022-01 - 2025-12\nCompany B") }
    ] },
    { type: "ask", requirementId: "r2", question: "What experience do you have with Docker?", requestedFacts: ["Docker experience"] },
    { type: "ask", requirementId: "r3", question: "Have you used Kubernetes?", requestedFacts: ["Kubernetes experience"] }
  ] },
  { supported: true, issues: [] }, { supported: true, issues: [] },
  input => {
    assert.equal(input.requirements.find(r => r.id === "r4").calculation.fullYears, 6);
    assert.equal(input.questions.find(q => q.id === "q2").disposition, "denied");
    return { actions: [
      { type: "leave_unresolved", requirementId: "r4", reason: "The dates establish six years, below the required seven." },
      { type: "ask", requirementId: "r2", question: "What did you personally do with Docker?", requestedFacts: ["personal Docker contribution"] }
    ] };
  },
  { actions: [proposal("Led production Docker deployments for PostgreSQL applications.")] },
  { supported: false, issues: ["The answer only describes local development, not production leadership."] },
  { actions: [proposal(after)] },
  { supported: true, issues: [] }
];
const model = async (_instructions, input) => {
  assert.ok(steps.length, "Unexpected provider call");
  const next = steps.shift();
  return { data: typeof next === "function" ? next(input) : next, metadata: { response_model: "scripted-test-provider" } };
};
let lastState;
const sendJson = (res, status, data) => {
  if (data.id) lastState = structuredClone(data);
  res.writeHead(status, { "Content-Type": "application/json" }); res.end(JSON.stringify(data));
};
const handle = createWorkflowRoutes({ model, sendJson, readJsonRequest: async req => {
  let body = ""; for await (const part of req) body += part; return JSON.parse(body);
} });
const root = resolve(".");
const server = createServer(async (req, res) => {
  if (await handle(req, res)) return;
  const file = resolve(root, `.${new URL(req.url, "http://local").pathname}`);
  if (!file.startsWith(`${root}/`)) { res.writeHead(404); res.end(); return; }
  try {
    const content = await readFile(file);
    res.writeHead(200, { "Content-Type": ({ ".html": "text/html", ".js": "text/javascript", ".css": "text/css" })[extname(file)] || "text/plain" }); res.end(content);
  } catch { res.writeHead(404); res.end(); }
});
let browser;
try {
  let playwright;
  try { playwright = await import("playwright"); } catch {
    playwright = await import(pathToFileURL(resolve(homedir(), ".cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.js")));
  }
  playwright = playwright.chromium ? playwright : playwright.default;
  await new Promise((done, fail) => { server.once("error", fail); server.listen(0, "127.0.0.1", done); });
  const chrome = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
  browser = await playwright.chromium.launch({ headless: true, ...(existsSync(chrome) ? { executablePath: chrome } : {}) });
  const page = await browser.newPage({ viewport: { width: 1100, height: 850 } });
  const errors = []; page.on("pageerror", error => errors.push(error.message));
  await page.goto(`http://127.0.0.1:${server.address().port}/index.html`);
  await page.locator("#resumeInput").fill(resume); await page.locator("#jobInput").fill(job);
  await page.locator("#startWorkflowBtn").click();
  await page.locator('[data-workflow-question="q1"] textarea').waitFor();
  assert.equal(await page.locator("[data-workflow-question]").count(), 2);
  assert.equal(await page.locator("#finalResume").inputValue(), "", "no automatic resume changes");
  await page.locator('[data-workflow-question="q1"] textarea').fill("Some exposure.");
  await page.locator('[data-workflow-question="q2"] select').selectOption("denied");
  await page.getByRole("button", { name: "Send answers", exact: true }).click();
  await page.locator('[data-workflow-question="q3"] textarea').waitFor();
  assert.equal(await page.locator("[data-workflow-question]").count(), 1);
  await page.locator('[data-workflow-question="q3"] textarea').fill("I containerized applications with Docker for local development.");
  await page.getByRole("button", { name: "Send answers", exact: true }).click();
  await page.waitForFunction(() => { const button = document.querySelector("[data-workflow-review]"); return button && !button.disabled; });
  assert.equal(lastState.questions.length, 3);
  assert.equal(lastState.requirements.find(r => r.id === "r3").status, "denied");
  assert.equal(lastState.requirements.find(r => r.id === "r4").status, "not_clarified");
  assert.equal(lastState.proposals.length, 1); assert.equal(lastState.proposals[0].suggestedText, after);
  assert.equal(await page.locator("#finalResume").inputValue(), "");
  await page.getByRole("button", { name: "Review proposal", exact: true }).click();
  await page.locator('#activeCommentPanel [data-action="preview"]').click();
  assert.ok((await page.locator("#pdfPreview").innerText()).includes("Docker for local development"));
  await page.locator('#activeCommentPanel [data-action="accept"]').click();
  assert.ok((await page.locator("#finalResume").inputValue()).includes(after));
  assert.doesNotMatch(await page.locator("#finalResume").inputValue(), /Kubernetes|Led production/);
  const downloadPromise = page.waitForEvent("download"); await page.locator("[data-workflow-download]").click();
  assert.match((await downloadPromise).suggestedFilename(), /^rolefit-guided-/);
  await page.setViewportSize({ width: 360, height: 780 });
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), "guided results should fit on mobile");
  assert.deepEqual(errors, []);
  assert.equal(steps.length, 0);
  console.log("Guided browser test passed: semantic evidence, overlap tool, denial, adaptive follow-up, revision, preview, approval, download, mobile.");
} finally {
  if (browser) await browser.close();
  await new Promise(done => server.close(done));
}
