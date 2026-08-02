import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
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
  throw new Error("Playwright is required for the evaluation app-flow test.");
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

const fixture = JSON.parse(await readFile(
  new URL("../evaluation/fixtures/001-product-data-analyst-simulation.json", import.meta.url),
  "utf8"
));
const tableauInteraction = fixture.oracle.interactions.find((interaction) => interaction.requirement_id === "tableau");
assert.ok(tableauInteraction, "The fixture must include a Tableau confirmation interaction.");
const aiResponse = {
  model: "evaluation-fixture-mock",
  job_analysis: {
    required_skills: ["Tableau"],
    preferred_skills: []
  },
  change_cards: [
    {
      id: "fixture-tableau",
      type: "ask_user",
      section: "Missing Evidence",
      related_job_requirement: "Tableau",
      question: tableauInteraction.expected_rolefit_question,
      why_it_matters: "The target role lists Tableau dashboards as a Basic Qualification, which is not explicitly stated in this resume.",
      evidence: "The resume shows product analysis and experimentation experience, but no Tableau dashboard evidence."
    }
  ],
  user_questions: [],
  final_checks: {
    keywords_covered: [],
    keywords_missing: ["Tableau"]
  }
};

const playwrightModule = await loadPlaywright();
const playwright = playwrightModule.chromium ? playwrightModule : playwrightModule.default;
const systemExecutable = getSystemChromiumExecutable();
let browser;

try {
  browser = await playwright.chromium.launch({
    headless: true,
    ...(systemExecutable ? { executablePath: systemExecutable } : {})
  });
} catch (systemBrowserError) {
  try {
    browser = await playwright.chromium.launch({ headless: true });
  } catch (bundledBrowserError) {
    console.log("Evaluation app-flow test skipped: no usable Playwright browser is available in this environment.");
    process.exit(0);
  }
}
const page = await browser.newPage();

try {
  await page.addInitScript((mockResponse) => {
    window.__ROLEFIT_TEST__ = true;
    window.fetch = async (url) => {
      if (url !== "/api/analyze") throw new Error(`Unexpected request: ${url}`);
      return new Response(JSON.stringify(mockResponse), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    };
  }, aiResponse);

  await page.goto(pathToFileURL(path.resolve("index.html")).href);
  await page.locator("#resumeInput").fill(fixture.rolefit_input.resume_before);
  await page.locator("#jobInput").fill(fixture.rolefit_input.job_description);
  await page.getByRole("button", { name: "Get Suggestions with AI" }).click();

  const tableauCard = page.locator('[data-change-id="fixture-tableau"]');
  await tableauCard.waitFor();
  assert.match(
    await tableauCard.innerText(),
    /Have you built or maintained Tableau dashboards/i,
    "the actual app should display the targeted Tableau question"
  );

  const experiencePlacement = tableauCard.locator('.placement-checkbox[value="experience"]');
  await experiencePlacement.check();

  const updatedCard = page.locator('[data-change-id="fixture-tableau"]');
  const experienceAction = updatedCard.locator(".experience-action-select");
  await experienceAction.waitFor();
  await experienceAction.selectOption("new");

  const finalCard = page.locator('[data-change-id="fixture-tableau"]');
  const evidenceInput = finalCard.locator('[data-draft-field="experienceDraftText"]');
  await evidenceInput.waitFor();
  await evidenceInput.fill(tableauInteraction.resume_change.replace(/^-\s*/, ""));

  const addToExperience = finalCard.locator('[data-action="accept-placement"][data-accept-placement="experience"]');
  await addToExperience.click();

  const finalResume = await page.locator("#finalResume").evaluate((element) => element.value);
  assert.match(finalResume, /Built and maintained Tableau dashboards for weekly conversion, retention, and experiment reporting/i);
  assert.ok(
    finalResume.indexOf("Built and maintained Tableau dashboards") < finalResume.indexOf("Data Analyst | CityCart"),
    "the confirmed bullet should be added to the selected Product Data Analyst role"
  );
  assert.doesNotMatch(finalResume, /USER-CONFIRMED ADDITIONS|\bTBD\b|ask user/i);

  console.log("Evaluation app-flow test passed");
} finally {
  await browser.close();
}
