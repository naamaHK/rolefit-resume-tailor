import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { scoreFixtureResult, validateFixtureInput } from "./oracle-scorer.mjs";

const DEFAULT_APP_URL = "http://127.0.0.1:8765/index.html";
const DEFAULT_TIMEOUT_MS = 210_000;

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
  throw new Error("Live evaluation requires Playwright. Install it or use the bundled Codex runtime.");
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

function normalized(value) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9+#]+/g, " ").trim();
}

export function interactionMatchTerms(fixture, interaction) {
  const requirement = fixture.oracle.requirements.find((item) => item.id === interaction.requirement_id);
  if (!requirement) throw new Error(`Unknown interaction requirement: ${interaction.requirement_id}`);
  return [...new Set([
    interaction.card_match,
    requirement.label,
    interaction.requirement_id.replaceAll("_", " ")
  ].map(normalized).filter((term) => term.length >= 3))];
}

async function findQuestionCard(page, fixture, interaction) {
  const terms = interactionMatchTerms(fixture, interaction);
  const cards = page.locator("#changeCards [data-change-id]");
  const count = await cards.count();

  for (let index = 0; index < count; index += 1) {
    const card = cards.nth(index);
    const cardText = normalized(await card.innerText());
    if (terms.some((term) => cardText.includes(term))) {
      const id = await card.getAttribute("data-change-id");
      if (id) return { id, text: await card.innerText() };
    }
  }

  throw new Error(`RoleFit did not ask the expected question for ${interaction.requirement_id}. Looked for: ${terms.join(", ")}.`);
}

function cardLocator(page, id) {
  return page.locator(`#changeCards [data-change-id="${id}"]`);
}

async function requireExactlyOne(locator, description) {
  assert.equal(await locator.count(), 1, description);
  return locator;
}

async function applyConfirmedInteraction(page, interaction, cardId) {
  const placement = interaction.placement || {};
  if ((placement.section || "experience") !== "experience") {
    throw new Error(`Live runner currently supports Experience placement only; ${interaction.requirement_id} requested ${placement.section}.`);
  }

  let card = cardLocator(page, cardId);
  const experienceCheckbox = card.locator('.placement-checkbox[value="experience"]');
  await requireExactlyOne(experienceCheckbox, `Expected one Experience placement checkbox for ${interaction.requirement_id}.`);
  await experienceCheckbox.check();

  card = cardLocator(page, cardId);
  const targetSelect = card.locator(".experience-entry-select");
  await requireExactlyOne(targetSelect, `Expected an experience target selector for ${interaction.requirement_id}.`);
  if (placement.target_label) await targetSelect.selectOption({ label: placement.target_label });

  card = cardLocator(page, cardId);
  const actionSelect = card.locator(".experience-action-select");
  await requireExactlyOne(actionSelect, `Expected an experience action selector for ${interaction.requirement_id}.`);
  await actionSelect.selectOption(placement.action || "new");

  card = cardLocator(page, cardId);
  const draft = card.locator('[data-draft-field="experienceDraftText"]');
  await requireExactlyOne(draft, `Expected an experience evidence field for ${interaction.requirement_id}.`);
  await draft.fill(String(interaction.resume_change || "").replace(/^[-*•]\s*/, ""));

  card = cardLocator(page, cardId);
  const accept = card.locator('[data-action="accept-placement"][data-accept-placement="experience"]');
  await requireExactlyOne(accept, `Expected one Add to Experience button for ${interaction.requirement_id}.`);
  await accept.click();
}

async function waitForAnalysis(page, timeoutMs) {
  const status = page.locator("#aiStatus");
  const button = page.locator("#analyzeAiBtn");
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const [message, enabled] = await Promise.all([status.innerText(), button.isEnabled()]);
    if (enabled && message.trim()) {
      if (/AI analysis complete/i.test(message)) return message;
      if (/timed out|could not call|failed|missing openrouter|invalid json|returned html/i.test(message)) {
        throw new Error(`The live RoleFit analysis failed: ${message}`);
      }
    }
    await page.waitForTimeout(500);
  }
  throw new Error(`Timed out after ${Math.round(timeoutMs / 1000)}s waiting for the live RoleFit analysis.`);
}

async function verifyAppIsReachable(appUrl) {
  let response;
  try {
    response = await fetch(appUrl, { method: "GET" });
  } catch {
    throw new Error(`RoleFit is not reachable at ${appUrl}. Start it with OPENROUTER_API_KEY=… node server.mjs first.`);
  }
  if (!response.ok) throw new Error(`RoleFit returned ${response.status} at ${appUrl}.`);
}

export async function runLiveFixture(fixturePath, options = {}) {
  const appUrl = options.appUrl || process.env.ROLEFIT_EVALUATION_URL || DEFAULT_APP_URL;
  const timeoutMs = Number(options.timeoutMs || process.env.ROLEFIT_EVALUATION_TIMEOUT_MS || DEFAULT_TIMEOUT_MS);
  const fixture = JSON.parse(await readFile(fixturePath, "utf8"));
  validateFixtureInput(fixture);
  if (!options.skipReachabilityCheck) await verifyAppIsReachable(appUrl);

  const playwrightModule = await loadPlaywright();
  const playwright = playwrightModule.chromium ? playwrightModule : playwrightModule.default;
  const executablePath = getSystemChromiumExecutable();
  const browser = await playwright.chromium.launch({
    headless: options.headless !== false,
    ...(executablePath ? { executablePath } : {})
  });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const events = [];

  try {
    if (options.mockAiResponse) {
      await page.addInitScript((mockResponse) => {
        window.__ROLEFIT_TEST__ = true;
        window.fetch = async (url) => {
          if (url !== "/api/analyze") throw new Error(`Unexpected request: ${url}`);
          return new Response(JSON.stringify(mockResponse), {
            status: 200,
            headers: { "Content-Type": "application/json" }
          });
        };
      }, options.mockAiResponse);
    }
    await page.goto(appUrl, { waitUntil: "domcontentloaded" });
    await page.locator("#resumeInput").fill(fixture.rolefit_input.resume_before);
    await page.locator("#jobInput").fill(fixture.rolefit_input.job_description);
    await page.locator("#analyzeAiBtn").click();
    const analysisStatus = await waitForAnalysis(page, timeoutMs);
    events.push({ type: "analysis_complete", status: analysisStatus });

    const missingExperienceTab = page.locator("#missingExperiencePassBtn");
    await requireExactlyOne(missingExperienceTab, "Expected one Missing Experience tab.");
    await missingExperienceTab.click();

    for (const interaction of fixture.oracle.interactions) {
      const card = await findQuestionCard(page, fixture, interaction);
      events.push({
        type: "question_asked",
        requirement_id: interaction.requirement_id,
        question: card.text
      });

      if (interaction.confirmed) {
        await applyConfirmedInteraction(page, interaction, card.id);
        events.push({
          type: "confirmed_and_added",
          requirement_id: interaction.requirement_id,
          answer: interaction.simulated_user_answer,
          resume_change: interaction.resume_change
        });
      } else {
        const reject = cardLocator(page, card.id).locator('[data-action="reject"]');
        await requireExactlyOne(reject, `Expected one Reject button for ${interaction.requirement_id}.`);
        await reject.click();
        events.push({
          type: "declined",
          requirement_id: interaction.requirement_id,
          answer: interaction.simulated_user_answer
        });
      }
    }

    const resumeAfter = await page.locator("#finalResume").inputValue();
    const scoring = scoreFixtureResult(fixture, resumeAfter);
    const result = {
      fixture_id: fixture.id,
      runner: "live-web-flow",
      app_url: appUrl,
      timestamp: new Date().toISOString(),
      events,
      resume_after: resumeAfter,
      ...scoring,
      result: scoring.grounding_safety === "PASS" && scoring.structure_preservation === "PASS" ? "PASS" : "REJECT"
    };

    if (options.outputPath) {
      await writeFile(options.outputPath, `${JSON.stringify(result, null, 2)}\n`);
    }
    return result;
  } finally {
    await browser.close();
  }
}

function parseArguments(argv) {
  const [fixturePath, ...flags] = argv;
  if (!fixturePath) throw new Error("Usage: node evaluation/live-flow-runner.mjs <fixture.json> [--output result.json] [--headed]");
  const outputIndex = flags.indexOf("--output");
  return {
    fixturePath,
    outputPath: outputIndex >= 0 ? flags[outputIndex + 1] : "",
    headless: !flags.includes("--headed")
  };
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { fixturePath, outputPath, headless } = parseArguments(process.argv.slice(2));
  const result = await runLiveFixture(fixturePath, { outputPath, headless });
  console.log(JSON.stringify({
    fixture_id: result.fixture_id,
    result: result.result,
    before: result.resume_representation_before.combined,
    after: result.resume_representation_after.combined,
    delta: result.resume_representation_after.delta,
    grounding_safety: result.grounding_safety,
    structure_preservation: result.structure_preservation
  }, null, 2));
}
