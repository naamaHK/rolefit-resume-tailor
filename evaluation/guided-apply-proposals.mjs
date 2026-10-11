import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { loadEvaluationFixture } from "./fixture-loader.mjs";
import { scoreFixtureResult } from "./oracle-scorer.mjs";

const fixturePath = path.resolve(process.argv[2] || "evaluation/fixtures/001-product-data-analyst-simulation.json");
const guidedPath = path.resolve(process.argv[3] || "evaluation/results/guided-001-product-data-analyst-simulation-live-retest.json");
const outputPath = path.resolve(process.argv[4] || "evaluation/results/guided-001-product-data-analyst-simulation-applied.json");
const fixture = await loadEvaluationFixture(fixturePath);
const guided = JSON.parse(await readFile(guidedPath, "utf8"));
assert.equal(guided.fixture_id, fixture.id, "The guided result belongs to a different fixture");
assert.equal(fixture.id, "001-product-data-analyst-simulation", "This first review runner supports fixture 001 only");
assert.equal(guided.outcome, "PROPOSAL_READY", "Only a completed guided result may be applied");
assert.equal(guided.proposals.length, 1, "This first review runner expects exactly one proposal");

let playwright;
try { playwright = await import("playwright"); }
catch {
  const bundled = path.join(homedir(), ".cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.js");
  playwright = await import(pathToFileURL(bundled).href);
}
playwright = playwright.chromium ? playwright : playwright.default;
const chrome = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const browser = await playwright.chromium.launch({ headless: true, ...(existsSync(chrome) ? { executablePath: chrome } : {}) });
const page = await browser.newPage();
const pageErrors = [];
page.on("pageerror", error => pageErrors.push(error.message));

async function applyExperienceProposal(proposal, requirement, interaction) {
  assert.equal(interaction.placement?.section, "experience", "This review runner only applies Experience proposals");
  await page.evaluate(({ proposal, requirement }) => {
    window.RoleFitWorkflowReview.addProposal(proposal, requirement);
  }, { proposal, requirement });

  const card = page.locator(`#changeCards [data-change-id="${proposal.id}"]`);
  await card.locator('.placement-checkbox[value="experience"]').check();
  const target = card.locator(".experience-entry-select");
  const options = await target.locator("option").all();
  let selected = false;
  for (const option of options) {
    if (!(await option.innerText()).toLowerCase().includes(interaction.placement.target_match.toLowerCase())) continue;
    await target.selectOption(await option.getAttribute("value"));
    selected = true;
    break;
  }
  assert.ok(selected, `No Experience entry matches ${interaction.placement.target_match}`);
  await card.locator(".experience-action-select").selectOption(interaction.placement.action || "new");
  await card.locator('[data-draft-field="experienceDraftText"]').fill(proposal.suggestedText);
  await card.locator('[data-action="preview"][data-preview-placement="experience"]').click();
  await card.locator('[data-action="accept-placement"][data-accept-placement="experience"]').click();
  assert.ok((await page.locator("#finalResume").inputValue()).includes(proposal.suggestedText),
    "The approved proposal was not added to the final resume");
}

try {
  await page.goto(process.env.ROLEFIT_APP_URL || guided.url || "http://127.0.0.1:8765/index.html");
  await page.locator("#resumeInput").fill(fixture.rolefit_input.resume_before);
  await page.locator("#jobInput").fill(fixture.rolefit_input.job_description);
  for (const proposal of guided.proposals) {
    assert.equal(proposal.verification, "supported_by_supplied_evidence", "Refusing an unverified proposal");
    const proposedRequirements = guided.requirements.filter(item => item.status === "proposed");
    assert.equal(proposedRequirements.length, 1, "Cannot unambiguously identify the proposal's requirement");
    const interaction = fixture.oracle.interactions.find(item => {
      const expected = fixture.oracle.requirements.find(requirement => requirement.id === item.requirement_id);
      return item.confirmed && expected && proposedRequirements[0].text.toLowerCase().includes(expected.label.toLowerCase());
    });
    assert.ok(interaction, `No confirmed fixture evidence matches proposal ${proposal.id}`);
    await applyExperienceProposal(proposal, proposedRequirements[0], interaction);
  }

  const resumeAfter = await page.locator("#finalResume").inputValue();
  const scoring = scoreFixtureResult(fixture, resumeAfter);
  const passed = !pageErrors.length && scoring.grounding_safety === "PASS"
    && scoring.structure_preservation === "PASS" && scoring.repair_integrity === "PASS"
    && scoring.resume_representation_after.delta > 0;
  const result = {
    fixture_id: fixture.id, guided_result: path.relative(process.cwd(), guidedPath),
    run_at: new Date().toISOString(), outcome: passed ? "PASS" : "FAIL",
    approved_proposals: guided.proposals.map(item => ({ id: item.id, suggested_text: item.suggestedText })),
    resume_before: fixture.rolefit_input.resume_before, resume_after: resumeAfter,
    score: scoring, page_errors: pageErrors
  };
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(result, null, 2)}\n`);
  console.log(`${result.outcome}: ${outputPath}`);
  console.log(`Representation: ${scoring.resume_representation_before.combined}% -> ${scoring.resume_representation_after.combined}%`);
  assert.ok(passed, "The approved resume failed an evaluation gate");
} finally {
  await browser.close();
}
