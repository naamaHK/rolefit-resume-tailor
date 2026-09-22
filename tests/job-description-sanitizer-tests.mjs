import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

async function loadPlaywright() {
  try {
    return await import("playwright");
  } catch {
    return import(pathToFileURL(path.join(
      homedir(),
      ".cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.js"
    )).href);
  }
}

const playwrightModule = await loadPlaywright();
const playwright = playwrightModule.chromium ? playwrightModule : playwrightModule.default;
const executablePath = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const browser = await playwright.chromium.launch({
  headless: true,
  ...(existsSync(executablePath) ? { executablePath } : {})
});
const page = await browser.newPage();

try {
  await page.addInitScript(() => { window.__ROLEFIT_TEST__ = true; });
  await page.goto(pathToFileURL(path.resolve("index.html")).href);

  const result = await page.evaluate(() => {
    const jobText = `Data Scientist
RAG pipelines
Docker
View profile
Search by Keyword
Search by Location
Search by Postal Code
Show More Options
Clear
Select how often (in days) to receive an alert
23487 - Data Scientist
Date: 18 Aug 2026
Terms & Conditions
Modern Slavery Act
Gender Pay Gap Report`;
    const cleaned = window.__roleFitTest.sanitizeJobDescriptionForAnalysis(jobText);
    const cards = window.__roleFitTest.buildMissingExperienceCardsFromRequirements({
      job_analysis: {
        required_skills: [
          "RAG pipelines",
          "Docker",
          "View profile",
          "Search by Keyword",
          "Data Scientist",
          "Terms & Conditions",
          "Modern Slavery Act"
        ]
      }
    }, "", cleaned);
    return { cleaned, labels: cards.map((card) => card.missingTerm) };
  });

  assert.match(result.cleaned, /RAG pipelines[\s\S]*Docker/, "actual job requirements should be preserved");
  assert.doesNotMatch(result.cleaned, /View profile|Search by|Terms & Conditions|Date:|Modern Slavery/i, "job-site chrome must be stripped before analysis");
  assert.deepEqual(result.labels, ["RAG pipelines", "Docker"], "only concrete job requirements may become Missing Experience cards");

  const noisyCompanyPage = await page.evaluate(() => {
    const jobText = `Machine Learning Engineer
Experience:
PyTorch
Vision/NLP experience
Scikit-Learn
MLOps
Scalability
About the job
What you'll do
What you bring
Technical skills:
Core attributes
Communication
About MyHeritage
Benefits at MyHeritage
Hybrid work model
On-site gym and pilates classes
Dog-friendly office
Fully funded supplemental health`;
    const cleaned = window.__roleFitTest.sanitizeJobDescriptionForAnalysis(jobText);
    const cards = window.__roleFitTest.buildMissingExperienceCardsFromRequirements({
      job_analysis: {
        required_skills: [
          "Experience:",
          "pytorch",
          "Vision/NLP experience",
          "Scikit-Learn",
          "MLOps",
          "Scalability",
          "About the job",
          "What you'll do",
          "What you bring",
          "Technical skills:",
          "Core attributes",
          "Communication",
          "About MyHeritage",
          "Benefits at MyHeritage",
          "Hybrid work model",
          "On-site gym and pilates classes",
          "Dog-friendly office",
          "Fully funded supplemental health"
        ]
      }
    }, "", cleaned);
    return { cleaned, labels: cards.map((card) => card.missingTerm) };
  });

  assert.match(noisyCompanyPage.cleaned, /PyTorch[\s\S]*Vision\/NLP experience[\s\S]*Communication/, "real role requirements should survive page cleanup");
  assert.doesNotMatch(
    noisyCompanyPage.cleaned,
    /Experience:|About the job|What you'll do|What you bring|Technical skills:|Core attributes|About MyHeritage|Benefits at MyHeritage|Hybrid work model|gym|Dog-friendly|supplemental health/i,
    "headings, company information, benefits, and office perks must be removed before analysis"
  );
  assert.deepEqual(
    noisyCompanyPage.labels,
    ["PyTorch", "Computer Vision", "NLP", "Scikit-learn", "MLOps", "Scalability", "Communication", "Machine Learning"],
    "Missing Experience should contain only specific candidate requirements from a noisy job page"
  );

  const duplicateVariants = await page.evaluate(() => {
    const requirements = [
      "Spark",
      "Large Language Models (LLMs)",
      "model evaluation",
      "Classification and anomaly detection",
      "LLMs",
      "Classification",
      "Anomaly Detection"
    ];
    const cards = window.__roleFitTest.buildMissingExperienceCardsFromRequirements({
      job_analysis: { required_skills: requirements }
    }, "", requirements.join("\n"));
    return cards.map((card) => card.missingTerm);
  });

  assert.deepEqual(
    duplicateVariants,
    ["Spark", "LLM", "Model Evaluation", "Classification", "Anomaly Detection"],
    "aliases and compound requirements must be split and deduplicated before Missing Experience cards are built"
  );

  const semanticSkillVariants = await page.evaluate(() => {
    const requirements = ["Developing AI agents", "AI Agents", "Predictive Models"];
    const resume = `ALEX MORGAN

SKILLS & TECHNOLOGIES
Machine Learning & Statistics: Statistical Analysis, Predictive Modeling`;
    const analysis = {
      job_analysis: { required_skills: requirements }
    };
    const cards = window.__roleFitTest.buildMissingExperienceCardsFromRequirements(
      analysis,
      resume,
      requirements.join("\n")
    );
    const coverage = window.__roleFitTest.buildRoleCoverageState(
      analysis,
      resume,
      resume,
      requirements.join("\n")
    );
    return {
      labels: cards.map((card) => card.missingTerm),
      covered: coverage.covered.map((item) => item.display),
      missing: coverage.missing.map((item) => item.display)
    };
  });

  assert.deepEqual(
    semanticSkillVariants.labels,
    ["AI Agents"],
    "AI-agent wording variants must create one question, while Predictive Modeling already in the resume must not create one"
  );
  assert.deepEqual(semanticSkillVariants.covered, ["Predictive Modeling"]);
  assert.deepEqual(semanticSkillVariants.missing, ["AI Agents"]);
  console.log("Job description sanitizer tests passed");
} finally {
  await browser.close();
}
