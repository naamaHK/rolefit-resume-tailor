import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import net from "node:net";
import { homedir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

async function loadPlaywright() {
  try {
    return await import("playwright");
  } catch {
    const bundledPath = path.join(
      homedir(),
      ".cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.js"
    );
    if (existsSync(bundledPath)) return import(pathToFileURL(bundledPath).href);
  }
  throw new Error("Playwright is required for end-to-end workflow tests.");
}

function getSystemChromiumExecutable() {
  const candidates = [
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
    "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser"
  ];
  return candidates.find((candidate) => existsSync(candidate)) || "";
}

async function reservePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      server.close((error) => error ? reject(error) : resolve(address.port));
    });
  });
}

async function startRoleFitServer(port) {
  const child = spawn(process.execPath, ["server.mjs"], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      HOST: "127.0.0.1",
      PORT: String(port),
      OPENROUTER_API_KEY: "end-to-end-test-key"
    },
    stdio: ["ignore", "pipe", "pipe"]
  });

  await new Promise((resolve, reject) => {
    let output = "";
    const timeout = setTimeout(() => reject(new Error(`RoleFit server did not start.\n${output}`)), 10_000);
    const read = (chunk) => {
      output += chunk.toString();
      if (!output.includes("RoleFit Resume Tailor running locally")) return;
      clearTimeout(timeout);
      resolve();
    };
    child.stdout.on("data", read);
    child.stderr.on("data", read);
    child.once("exit", (code) => {
      clearTimeout(timeout);
      reject(new Error(`RoleFit server exited before startup with code ${code}.\n${output}`));
    });
  });

  return child;
}

async function stopProcess(child) {
  if (!child || child.exitCode !== null) return;
  child.kill("SIGTERM");
  await Promise.race([
    new Promise((resolve) => child.once("exit", resolve)),
    new Promise((resolve) => setTimeout(resolve, 2_000))
  ]);
  if (child.exitCode === null) child.kill("SIGKILL");
}

const resume = `ALEX MORGAN
050-555-0198 | alex.morgan@example.com | linkedin.com/in/alex-morgan

PROFESSIONAL SUMMARY
Research engineer with seven years of experience building machine-learning systems.

EXPERIENCE
Senior Research Engineer 2017 - 2024
Northstar Research
- Built and deployed large-scale recommendation systems.
- Partnered with product and engineering teams on experimentation.

EDUCATION
M.Sc. in Computer Science 2013 - 2016
Example Institute

SKILLS & TECHNOLOGIES
- Programming & Tools: Python, Java, SQL
- Big Data & Systems: Hadoop, MapReduce, Hive
- Machine Learning & Statistics: Recommender Systems, A/B Testing, Statistical Analysis
- Applied AI: LLM APIs, Prompt Engineering`;

const jobDescription = `Senior Machine Learning Engineer
What you'll do
Build production ML systems.
What you bring
Machine Learning
Model Evaluation
Spark
Developing AI agents
AI Agents
Predictive Models
Benefits at Example
Hybrid work model
Dog-friendly office`;

const modelResponse = {
  model: "test/e2e-model",
  job_analysis: {
    target_title: "Senior Machine Learning Engineer",
    seniority: "Senior",
    required_skills: ["Machine Learning", "Model Evaluation", "Spark", "Developing AI agents", "AI Agents", "Predictive Models"],
    preferred_skills: [],
    responsibilities: ["Build production ML systems."],
    keywords: ["Machine Learning", "Model Evaluation", "Spark"],
    hidden_priorities: []
  },
  resume_analysis: {
    strongest_relevant_evidence: ["Built and deployed large-scale recommendation systems."],
    weak_or_missing_signals: ["Model Evaluation", "Spark", "AI Agents", "Predictive Models"],
    irrelevant_or_lower_priority_content: [],
    risk_flags: []
  },
  tailoring_strategy: {
    emphasize: ["production ML systems"],
    deemphasize: [],
    do_not_claim_without_confirmation: ["Model Evaluation", "Spark", "AI Agents"]
  },
  change_cards: [
    {
      id: "e2e-summary-rewrite",
      type: "rewrite",
      section: "Professional Summary",
      original_text: "Research engineer with seven years of experience building machine-learning systems.",
      suggested_text: "Senior research engineer with seven years of experience building and deploying machine-learning systems.",
      why_it_helps: "Makes the supported seniority and production focus explicit.",
      evidence: "Senior Research Engineer 2017 - 2024; Built and deployed large-scale recommendation systems.",
      risk_level: "low",
      support_level: "resume_supported"
    },
    {
      id: "e2e-skills-rewrite",
      type: "rewrite",
      section: "Skills & Technologies",
      original_text: "- Programming & Tools: Python, Java, SQL\n- Big Data & Systems: Hadoop, MapReduce, Hive\n- Machine Learning & Statistics: Recommender Systems, A/B Testing, Statistical Analysis\n- Applied AI: LLM APIs, Prompt Engineering",
      suggested_text: "Programming & Tools: Python, Java, SQL Big Data & Systems: Hadoop, MapReduce, Hive Machine Learning & Statistics: Recommender Systems, A/B Testing, Statistical Analysis, Predictive Modeling Applied AI: LLM APIs, Prompt Engineering",
      why_it_helps: "Adds a supported equivalent of the requested predictive-model skill.",
      evidence: "Built and deployed large-scale recommendation systems.",
      risk_level: "low",
      support_level: "resume_supported"
    }
  ],
  user_questions: [],
  final_checks: {
    keywords_covered: ["Machine Learning"],
    keywords_missing: ["Model Evaluation", "Spark", "AI Agents", "Predictive Models"],
    unsupported_claims: [],
    risk_flags: []
  }
};

const playwrightModule = await loadPlaywright();
const playwright = playwrightModule.chromium ? playwrightModule : playwrightModule.default;
const port = await reservePort();
const server = await startRoleFitServer(port);
const systemExecutable = getSystemChromiumExecutable();
const browser = await playwright.chromium.launch({
  headless: true,
  ...(systemExecutable ? { executablePath: systemExecutable } : {})
});
const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
let analyzeRequest;

try {
  await page.addInitScript(() => {
    window.__ROLEFIT_TEST__ = true;
    window.__roleFitPrintCalls = 0;
    window.print = () => { window.__roleFitPrintCalls += 1; };
  });
  await page.route("**/api/analyze", async (route) => {
    analyzeRequest = route.request().postDataJSON();
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(modelResponse)
    });
  });
  await page.goto(`http://127.0.0.1:${port}/index.html`);

  await page.locator("#resumeInput").fill(resume);
  await page.locator("#jobInput").fill(jobDescription);
  await page.locator("#analyzeAiBtn").click();
  await assert.doesNotReject(() => page.locator("#aiStatus").waitFor({ state: "visible", timeout: 10_000 }));
  await page.waitForFunction(() => document.querySelector("#aiStatus")?.textContent.includes("AI analysis complete"));

  assert.ok(analyzeRequest, "the visible AI action should call the analysis API");
  assert.equal(analyzeRequest.resume, resume);
  assert.match(analyzeRequest.jobDescription, /Machine Learning[\s\S]*Model Evaluation[\s\S]*Spark/);
  assert.doesNotMatch(analyzeRequest.jobDescription, /What you'll do|What you bring|Benefits at Example|Hybrid work model|Dog-friendly office/i);

  const coveredText = await page.locator(".role-coverage-block.covered").innerText();
  const missingText = await page.locator(".role-coverage-block.missing").innerText();
  assert.match(coveredText, /Machine Learning/);
  assert.match(missingText, /Model Evaluation/);
  assert.match(missingText, /Spark/);
  assert.match(missingText, /AI Agents/i);
  assert.match(missingText, /Predictive Modeling/i);

  await page.locator("#suggestionsPassBtn").click();
  const summaryCard = page.locator("#changeCards [data-change-id='e2e-summary-rewrite']");
  await summaryCard.locator("[data-action='preview']").click();
  assert.match(await page.locator("#pdfPreview").innerText(), /Senior research engineer with seven years/);
  const summaryPreviewHtml = await page.locator("#pdfPreview").innerHTML();
  assert.match(summaryPreviewHtml, /<mark class="resume-preview-highlight">Senior<\/mark>/);
  assert.match(summaryPreviewHtml, /<mark class="resume-preview-highlight">and deploying<\/mark>/);
  await summaryCard.locator("[data-action='accept']").click();

  const skillsCard = page.locator("#changeCards [data-change-id='e2e-skills-rewrite']");
  await skillsCard.locator("[data-action='preview']").click();
  assert.match(await page.locator("#pdfPreview").innerText(), /Predictive Modeling/);
  await skillsCard.locator("[data-action='accept']").click();

  let finalResume = await page.locator("#finalResume").inputValue();
  assert.match(finalResume, /Senior research engineer with seven years of experience building and deploying machine-learning systems\./);
  assert.doesNotMatch(finalResume, /Research engineer with seven years of experience building machine-learning systems\./);
  assert.match(finalResume, /Programming & Tools: Python, Java, SQL\nBig Data & Systems: Hadoop, MapReduce, Hive\nMachine Learning & Statistics: Recommender Systems, A\/B Testing, Statistical Analysis, Predictive Modeling\nApplied AI: LLM APIs, Prompt Engineering/);

  await page.locator("#missingExperiencePassBtn").click();
  const missingLabels = (await page.locator("#missingExperiencePanel .missing-experience-label-button").allTextContents())
    .map((label) => label.replace(/^\s*\d+\s*/, "").trim());
  assert.deepEqual(
    missingLabels,
    ["Model Evaluation", "Spark", "AI Agents"],
    "equivalent requirements should be covered or collapsed before the missing-experience flow opens"
  );
  await page.locator("#missingExperiencePanel .missing-experience-label-button", { hasText: "Model Evaluation" }).click();
  const activePanel = page.locator("#activeCommentPanel");
  await activePanel.locator(".placement-checkbox[value='skills']").check();
  assert.equal(await activePanel.locator(".skill-subsection-select").inputValue(), "Machine Learning & Statistics");
  assert.equal(await activePanel.locator("[data-draft-field='skillDraftText']").inputValue(), "Model Evaluation");
  await activePanel.locator("[data-preview-placement='skills']").click();
  assert.match(await page.locator("#pdfPreview").innerText(), /Machine Learning & Statistics: Recommender Systems, A\/B Testing, Statistical Analysis, Predictive Modeling, Model Evaluation/);
  assert.match(await page.locator("#pdfPreview").innerHTML(), /resume-preview-highlight[\s\S]*Model Evaluation/);
  await activePanel.locator("[data-accept-placement='skills']").click();

  await page.locator("#missingExperiencePanel .missing-experience-label-button", { hasText: "Spark" }).click();
  await activePanel.locator(".placement-checkbox[value='omit']").check();
  await activePanel.locator("[data-action='accept']").click();

  await page.locator("#missingExperiencePanel .missing-experience-label-button", { hasText: "AI Agents" }).click();
  await activePanel.locator(".placement-checkbox[value='omit']").check();
  await activePanel.locator("[data-action='accept']").click();

  finalResume = await page.locator("#finalResume").inputValue();
  assert.match(finalResume, /Machine Learning & Statistics: Recommender Systems, A\/B Testing, Statistical Analysis, Predictive Modeling, Model Evaluation/);
  assert.match(finalResume, /Programming & Tools: Python, Java, SQL\nBig Data & Systems: Hadoop, MapReduce, Hive\nMachine Learning & Statistics:[^\n]+\nApplied AI: LLM APIs, Prompt Engineering/);
  assert.doesNotMatch(finalResume, /\bSpark\b/);
  assert.doesNotMatch(finalResume, /\bAI Agents?\b/i);
  assert.equal((finalResume.match(/^SKILLS(?: & TECHNOLOGIES)?$/gim) || []).length, 1, "the flow must not duplicate the Skills section");

  const summaryIndex = finalResume.indexOf("PROFESSIONAL SUMMARY");
  const experienceIndex = finalResume.indexOf("EXPERIENCE");
  const educationIndex = finalResume.indexOf("EDUCATION");
  const skillsIndex = finalResume.indexOf("SKILLS & TECHNOLOGIES");
  assert.ok(summaryIndex > 0 && summaryIndex < experienceIndex, "Summary should remain between the header and Experience");
  assert.ok(experienceIndex < educationIndex, "Experience should remain before Education");
  assert.ok(educationIndex < skillsIndex, "Skills should remain after the required core sections");

  await page.locator("#exportPdfBtn").click();
  await page.waitForFunction(() => window.__roleFitPrintCalls === 1);
  assert.match(await page.locator("#pdfPreview").innerText(), /MODEL EVALUATION/i);
  assert.doesNotMatch(await page.locator("#pdfPreview").innerText(), /What you'll do|Benefits at Example|Dog-friendly office/i);

  console.log("End-to-end RoleFit workflow tests passed");
} finally {
  await browser.close();
  await stopProcess(server);
}
