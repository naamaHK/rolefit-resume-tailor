import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { loadEvaluationFixture } from "./fixture-loader.mjs";
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

function matchTerms(...values) {
  return [...new Set(values.flatMap((value) => Array.isArray(value) ? value : [value])
    .map(normalized)
    .filter((term) => term.length >= 3))];
}

function uniqueMatch(values) {
  return values.length === 1 ? values[0] : null;
}

function profileEntryMatchesCard(entry, cardText) {
  return [entry.title, entry.company, entry.degree, entry.institution]
    .map(normalized)
    .filter((value) => value.length >= 4)
    .some((value) => cardText.includes(value));
}

function includesExactPhrase(text, phrase) {
  return ` ${text} `.includes(` ${phrase} `);
}

function profileSkillTerms(profile) {
  return Object.values(profile?.skills || {})
    .flatMap((skills) => Array.isArray(skills) ? skills : [])
    .map((skill) => ({ original: String(skill), normalized: normalized(skill) }))
    .filter((skill) => skill.normalized.length >= 3);
}

/**
 * Match a Missing Experience card only when its wording includes profile skill
 * labels verbatim and those labels identify one factual experience bullet.
 * This prevents the test harness from deciding that related skills are equal.
 */
export function profileEvidenceForQuestion(profile, rawCardText) {
  const cardText = normalized(rawCardText);
  const matchedSkills = profileSkillTerms(profile)
    .filter((skill) => includesExactPhrase(cardText, skill.normalized));
  if (!matchedSkills.length) return null;

  const evidence = (profile?.experience || []).flatMap((entry) => (entry.facts || [])
    .filter((fact) => matchedSkills.every((skill) => includesExactPhrase(normalized(fact), skill.normalized)))
    .map((fact) => ({ entry, fact })));
  const uniqueEvidence = uniqueMatch(evidence);
  if (!uniqueEvidence) return null;

  return {
    entry: uniqueEvidence.entry,
    evidence: uniqueEvidence.fact,
    matched_skills: matchedSkills.map((skill) => skill.original)
  };
}

/**
 * Return only a literal value already stored in the hidden profile.  This is
 * deliberately not an equivalence or skill matcher: an ambiguous card, or a
 * job-specific question, stays for the fixture's explicit interaction map.
 */
export function profileLookupForResumeCheckCard(profile, rawCardText, options = {}) {
  const cardText = normalized(rawCardText);
  const basicInfo = profile?.basic_info || {};

  if (options.headers) {
    if (cardText.includes("missing header full name") && basicInfo.name) {
      return { field: "name", value: basicInfo.name, source: "profile.basic_info.name" };
    }
    if (cardText.includes("missing header phone number") && basicInfo.phone) {
      return { field: "phone", value: basicInfo.phone, source: "profile.basic_info.phone" };
    }
    if (cardText.includes("missing header email address") && basicInfo.email) {
      return { field: "email", value: basicInfo.email, source: "profile.basic_info.email" };
    }
  }

  if (options.dates && cardText.includes("confirm years")) {
    const entry = uniqueMatch([
      ...(profile?.experience || []),
      ...(profile?.education || [])
    ].filter((candidate) => candidate.dates && profileEntryMatchesCard(candidate, cardText)));
    if (entry) return { field: "dates", value: entry.dates, source: "profile entry dates" };
  }

  if (options.required_fields && cardText.includes("missing required field")) {
    const field = cardText.includes("institution") ? "institution"
      : cardText.includes("degree") ? "degree"
        : "";
    const entry = field && uniqueMatch((profile?.education || [])
      .filter((candidate) => candidate[field] && profileEntryMatchesCard(candidate, cardText)));
    if (entry) return { field, value: entry[field], source: `profile.education.${field}` };
  }

  return null;
}

export function interactionMatchTerms(fixture, interaction) {
  const requirement = fixture.oracle.requirements.find((item) => item.id === interaction.requirement_id);
  if (!requirement) throw new Error(`Unknown interaction requirement: ${interaction.requirement_id}`);
  return matchTerms([
    interaction.card_match,
    requirement.label,
    interaction.requirement_id.replaceAll("_", " ")
  ]);
}

export function unexpectedQuestionErrors(fixture, cardTexts = []) {
  const expectedAbsent = fixture.oracle.question_expectations?.must_not_ask || [];
  return expectedAbsent.flatMap((requirementId) => {
    const requirement = fixture.oracle.requirements.find((item) => item.id === requirementId);
    if (!requirement) throw new Error(`Unknown no-question requirement: ${requirementId}`);
    const terms = matchTerms(requirement.label, requirementId.replaceAll("_", " "));
    return cardTexts
      .filter((cardText) => terms.some((term) => normalized(cardText).includes(term)))
      .map((cardText) => ({ requirement_id: requirementId, question: cardText }));
  });
}

export function coverageRecognitionErrors(fixture, coveredText = "") {
  const expectedCovered = fixture.oracle.coverage_expectations?.must_be_covered || [];
  const normalizedCovered = normalized(coveredText);
  return expectedCovered.flatMap((requirementId) => {
    const requirement = fixture.oracle.requirements.find((item) => item.id === requirementId);
    if (!requirement) throw new Error(`Unknown covered requirement: ${requirementId}`);
    const expectedText = requirement.coverage_match || requirement.label;
    return normalizedCovered.includes(normalized(expectedText)) ? [] : [{
      requirement_id: requirementId,
      expected_coverage: expectedText
    }];
  });
}

async function recordExpectedCoverage(page, fixture, events) {
  if (!(fixture.oracle.coverage_expectations?.must_be_covered || []).length) return [];
  const covered = page.locator(".role-coverage-block.covered");
  await requireExactlyOne(covered, "Expected one covered-requirements block.");
  const errors = coverageRecognitionErrors(fixture, await covered.innerText());
  errors.forEach((error) => events.push({ type: "expected_coverage_missing", ...error }));
  return errors;
}

async function readRoleCoverage(page) {
  const covered = page.locator(".role-coverage-block.covered");
  const missing = page.locator(".role-coverage-block.missing");
  await requireExactlyOne(covered, "Expected one covered-requirements block.");
  await requireExactlyOne(missing, "Expected one missing-requirements block.");
  return {
    covered: await covered.innerText(),
    missing: await missing.innerText()
  };
}

async function recordUnexpectedQuestions(page, fixture, events) {
  if (!(fixture.oracle.question_expectations?.must_not_ask || []).length) return [];
  const cards = page.locator("#changeCards [data-change-id]");
  const count = await cards.count();
  const cardTexts = [];
  for (let index = 0; index < count; index += 1) cardTexts.push(await cards.nth(index).innerText());
  const errors = unexpectedQuestionErrors(fixture, cardTexts);
  errors.forEach((error) => events.push({ type: "unexpected_question", ...error }));
  return errors;
}

async function findCardByTerms(page, terms, description) {
  const cards = page.locator("#changeCards [data-change-id]");
  const count = await cards.count();
  const available = [];

  for (let index = 0; index < count; index += 1) {
    const card = cards.nth(index);
    const rawCardText = await card.innerText();
    const cardText = normalized(rawCardText);
    available.push(cardText);
    if (terms.some((term) => cardText.includes(term))) {
      const id = await card.getAttribute("data-change-id");
      if (id) return { id, text: await card.innerText() };
    }
  }

  throw new Error(`RoleFit did not show the expected ${description}. Looked for: ${terms.join(", ")}. Available: ${available.join(" || ") || "none"}.`);
}

async function findQuestionCard(page, fixture, interaction) {
  return findCardByTerms(
    page,
    interactionMatchTerms(fixture, interaction),
    `question for ${interaction.requirement_id}`
  );
}

function cardLocator(page, id) {
  return page.locator(`#changeCards [data-change-id="${id}"]`);
}

async function requireExactlyOne(locator, description) {
  assert.equal(await locator.count(), 1, description);
  return locator;
}

async function selectExperienceTarget(targetSelect, placement, requirementId) {
  if (placement.target_label) {
    await targetSelect.selectOption({ label: placement.target_label });
    return;
  }
  if (!placement.target_match) return;

  const options = targetSelect.locator("option");
  const count = await options.count();
  const targetMatch = normalized(placement.target_match);
  for (let index = 0; index < count; index += 1) {
    const option = options.nth(index);
    if (!normalized(await option.innerText()).includes(targetMatch)) continue;
    const value = await option.getAttribute("value");
    if (value) {
      await targetSelect.selectOption(value);
      return;
    }
  }
  throw new Error(`Could not find Experience target "${placement.target_match}" for ${requirementId}.`);
}

async function fillDraftField(card, field, value, requirementId) {
  const draft = card.locator(`[data-draft-field="${field}"]`);
  await requireExactlyOne(draft, `Expected ${field} field for ${requirementId}.`);
  await draft.fill(String(value || ""));
}

async function applyEducationPlacement(page, interaction, cardId) {
  const placement = interaction.placement || {};
  const fields = placement.fields || {};
  let card = cardLocator(page, cardId);
  const educationCheckbox = card.locator('.placement-checkbox[value="education"]');
  await requireExactlyOne(educationCheckbox, `Expected one Education placement checkbox for ${interaction.requirement_id}.`);
  await educationCheckbox.check();

  card = cardLocator(page, cardId);
  const actionSelect = card.locator(".education-action-select");
  await requireExactlyOne(actionSelect, `Expected an Education action selector for ${interaction.requirement_id}.`);
  await actionSelect.selectOption(placement.action || "new");

  card = cardLocator(page, cardId);
  if ((placement.action || "new") === "new") {
    await fillDraftField(card, "educationProgram", fields.program, interaction.requirement_id);
    await fillDraftField(card, "educationInstitution", fields.institution, interaction.requirement_id);
    await fillDraftField(card, "educationYear", fields.year, interaction.requirement_id);
    if (fields.details) await fillDraftField(card, "educationDetails", fields.details, interaction.requirement_id);
  } else {
    if (placement.target_label) {
      const target = card.locator(".education-entry-select");
      await requireExactlyOne(target, `Expected an Education target selector for ${interaction.requirement_id}.`);
      await target.selectOption({ label: placement.target_label });
    }
    await fillDraftField(card, "educationDetails", fields.details || interaction.resume_change, interaction.requirement_id);
  }

  card = cardLocator(page, cardId);
  const accept = card.locator('[data-action="accept-placement"][data-accept-placement="education"]');
  await requireExactlyOne(accept, `Expected one Add to Education button for ${interaction.requirement_id}.`);
  await accept.click();
}

async function applyConfirmedInteraction(page, interaction, cardId) {
  const placement = interaction.placement || {};
  const section = placement.section || "experience";
  if (section === "education") {
    await applyEducationPlacement(page, interaction, cardId);
    return;
  }
  if (section !== "experience") throw new Error(`Live runner does not support ${section} placement for ${interaction.requirement_id}.`);

  let card = cardLocator(page, cardId);
  const experienceCheckbox = card.locator('.placement-checkbox[value="experience"]');
  await requireExactlyOne(experienceCheckbox, `Expected one Experience placement checkbox for ${interaction.requirement_id}.`);
  await experienceCheckbox.check();

  card = cardLocator(page, cardId);
  const targetSelect = card.locator(".experience-entry-select");
  await requireExactlyOne(targetSelect, `Expected an experience target selector for ${interaction.requirement_id}.`);
  await selectExperienceTarget(targetSelect, placement, interaction.requirement_id);

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

async function selectExperienceEntryOrNew(card, evidence) {
  const targetSelect = card.locator(".experience-entry-select");
  const count = await targetSelect.count();
  if (!count) return "new";
  await requireExactlyOne(targetSelect, "Expected one Experience target selector.");

  const options = targetSelect.locator("option");
  const optionCount = await options.count();
  for (let index = 0; index < optionCount; index += 1) {
    const option = options.nth(index);
    const optionText = normalized(await option.innerText());
    if (includesExactPhrase(optionText, normalized(evidence.entry.title))
      && includesExactPhrase(optionText, normalized(evidence.entry.company))) {
      const value = await option.getAttribute("value");
      if (value) {
        await targetSelect.selectOption(value);
        return "existing";
      }
    }
  }

  await targetSelect.selectOption({ label: "Add new experience entry" });
  return "new";
}

async function applyProfileEvidenceToExperience(page, cardId, evidence) {
  let card = cardLocator(page, cardId);
  const experienceCheckbox = card.locator('.placement-checkbox[value="experience"]');
  await requireExactlyOne(experienceCheckbox, "Expected one Experience placement checkbox for a profile-backed answer.");
  await experienceCheckbox.check();

  card = cardLocator(page, cardId);
  const targetKind = await selectExperienceEntryOrNew(card, evidence);
  card = cardLocator(page, cardId);
  if (targetKind === "new") {
    await fillDraftField(card, "experienceNewTitle", evidence.entry.title, "profile-backed experience");
    await fillDraftField(card, "experienceNewCompany", evidence.entry.company, "profile-backed experience");
    await fillDraftField(card, "experienceNewYears", evidence.entry.dates, "profile-backed experience");
  } else {
    const actionSelect = card.locator(".experience-action-select");
    await requireExactlyOne(actionSelect, "Expected an action selector for a profile-backed experience answer.");
    await actionSelect.selectOption("new");
  }

  card = cardLocator(page, cardId);
  await fillDraftField(card, "experienceDraftText", evidence.evidence, "profile-backed experience");
  const accept = card.locator('[data-action="accept-placement"][data-accept-placement="experience"]');
  await requireExactlyOne(accept, "Expected an Add to Experience button for a profile-backed answer.");
  await accept.click();
}

async function applyResumeCheckInteraction(page, interaction) {
  const terms = matchTerms(interaction.card_match, interaction.before, interaction.field, interaction.type);
  if (!terms.length) throw new Error("Each resume-check interaction needs card_match, before, field, or type.");
  const card = await findCardByTerms(page, terms, "Resume Check card");
  const editBox = cardLocator(page, card.id).locator(".edit-box");
  if (interaction.answer != null) {
    await requireExactlyOne(editBox, `Expected an input for Resume Check card ${interaction.card_match || interaction.type}.`);
    await editBox.fill(String(interaction.answer));
  }
  const accept = cardLocator(page, card.id).locator('[data-action="accept"]');
  await requireExactlyOne(accept, `Expected an accept button for Resume Check card ${interaction.card_match || interaction.type}.`);
  await accept.click();
  return card.text;
}

async function applyAutomaticProfileLookups(page, fixture, events) {
  const options = fixture.oracle.auto_profile_lookup;
  if (!options) return;

  const attempted = new Set();
  // A successful acceptance re-renders the cards, so apply at most one direct
  // lookup per pass and then inspect the current UI again.
  for (let pass = 0; pass < 12; pass += 1) {
    const cards = page.locator("#changeCards [data-change-id]");
    const count = await cards.count();
    let applied = false;

    for (let index = 0; index < count; index += 1) {
      const card = cards.nth(index);
      const cardText = await card.innerText();
      const lookup = profileLookupForResumeCheckCard(fixture.profile, cardText, options);
      if (!lookup) continue;

      const key = `${normalized(cardText)}|${lookup.field}|${lookup.value}`;
      if (attempted.has(key)) continue;
      attempted.add(key);

      const id = await card.getAttribute("data-change-id");
      if (!id) continue;
      const editBox = cardLocator(page, id).locator(".edit-box");
      await requireExactlyOne(editBox, `Expected a direct profile lookup input for ${lookup.field}.`);
      await editBox.fill(String(lookup.value));
      const accept = cardLocator(page, id).locator('[data-action="accept"]');
      await requireExactlyOne(accept, `Expected a direct profile lookup accept button for ${lookup.field}.`);
      await accept.click();
      events.push({ type: "profile_lookup_applied", field: lookup.field, source: lookup.source });
      applied = true;
      break;
    }

    if (!applied) return;
  }
  throw new Error("Stopped automatic profile lookup after 12 accepted cards; a card may not be resolving.");
}

async function applyAutomaticProfileEvidence(page, fixture, events) {
  if (!fixture.oracle.auto_profile_lookup?.missing_experience) return;
  const handled = new Set();

  for (let pass = 0; pass < 12; pass += 1) {
    const cards = page.locator("#changeCards [data-change-id]");
    const count = await cards.count();
    let applied = false;

    for (let index = 0; index < count; index += 1) {
      const card = cards.nth(index);
      const cardText = await card.innerText();
      const evidence = profileEvidenceForQuestion(fixture.profile, cardText);
      if (!evidence) continue;
      const key = `${normalized(cardText)}|${evidence.evidence}`;
      if (handled.has(key)) continue;
      handled.add(key);

      const id = await card.getAttribute("data-change-id");
      if (!id) continue;
      await applyProfileEvidenceToExperience(page, id, evidence);
      events.push({
        type: "profile_evidence_applied",
        matched_skills: evidence.matched_skills,
        experience: `${evidence.entry.title} at ${evidence.entry.company}`
      });
      applied = true;
      break;
    }

    if (!applied) break;
  }

  const remainingCards = page.locator("#changeCards [data-change-id]");
  const remainingCount = await remainingCards.count();
  for (let index = 0; index < remainingCount; index += 1) {
    const card = remainingCards.nth(index);
    events.push({ type: "question_unhandled", question: await card.innerText() });
  }
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
  const fixture = await loadEvaluationFixture(fixturePath);
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
    const role_coverage = await readRoleCoverage(page);
    const coverageRecognitionErrors = await recordExpectedCoverage(page, fixture, events);

    const cleanupPass = page.locator("#cleanupPassBtn");
    await requireExactlyOne(cleanupPass, "Expected one Resume Check tab.");
    await cleanupPass.click();
    await applyAutomaticProfileLookups(page, fixture, events);
    const resumeCheckCoverageErrors = [];
    for (const interaction of fixture.oracle.resume_check_interactions || []) {
      try {
        const cardText = await applyResumeCheckInteraction(page, interaction);
        events.push({
          type: "resume_check_applied",
          card_match: interaction.card_match || interaction.type,
          card: cardText,
          answer: interaction.answer || ""
        });
      } catch (error) {
        const message = error.message || String(error);
        resumeCheckCoverageErrors.push({ card_match: interaction.card_match || interaction.type, message });
        events.push({ type: "expected_resume_check_missing", card_match: interaction.card_match || interaction.type, message });
      }
    }

    const missingExperienceTab = page.locator("#missingExperiencePassBtn");
    await requireExactlyOne(missingExperienceTab, "Expected one Missing Experience tab.");
    await missingExperienceTab.click();
    const questionRecognitionErrors = await recordUnexpectedQuestions(page, fixture, events);
    const questionCoverageErrors = [];

    for (const interaction of fixture.oracle.interactions) {
      let card;
      try {
        card = await findQuestionCard(page, fixture, interaction);
      } catch (error) {
        const message = error.message || String(error);
        questionCoverageErrors.push({ requirement_id: interaction.requirement_id, message });
        events.push({ type: "expected_question_missing", requirement_id: interaction.requirement_id, message });
        continue;
      }
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
    await applyAutomaticProfileEvidence(page, fixture, events);

    const resumeAfter = (await page.locator("#finalResume").inputValue()).trim()
      || await page.locator("#resumeInput").inputValue();
    const scoring = scoreFixtureResult(fixture, resumeAfter);
    const result = {
      fixture_id: fixture.id,
      runner: "live-web-flow",
      app_url: appUrl,
      timestamp: new Date().toISOString(),
      events,
      role_coverage,
      resume_after: resumeAfter,
      ...scoring,
      coverage_recognition: coverageRecognitionErrors.length ? "FAIL" : "PASS",
      coverage_recognition_errors: coverageRecognitionErrors,
      resume_check_coverage: resumeCheckCoverageErrors.length ? "FAIL" : "PASS",
      resume_check_coverage_errors: resumeCheckCoverageErrors,
      question_coverage: questionCoverageErrors.length ? "FAIL" : "PASS",
      question_coverage_errors: questionCoverageErrors,
      question_recognition: questionRecognitionErrors.length ? "FAIL" : "PASS",
      question_recognition_errors: questionRecognitionErrors,
      result: scoring.grounding_safety === "PASS"
        && scoring.repair_integrity === "PASS"
        && scoring.structure_preservation === "PASS"
        && coverageRecognitionErrors.length === 0
        && resumeCheckCoverageErrors.length === 0
        && questionCoverageErrors.length === 0
        && questionRecognitionErrors.length === 0 ? "PASS" : "REJECT"
    };

    if (options.outputPath) {
      await mkdir(path.dirname(options.outputPath), { recursive: true });
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

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { fixturePath, outputPath, headless } = parseArguments(process.argv.slice(2));
  const result = await runLiveFixture(fixturePath, { outputPath, headless });
  console.log(JSON.stringify({
    fixture_id: result.fixture_id,
    result: result.result,
    before: result.resume_representation_before.combined,
    after: result.resume_representation_after.combined,
    delta: result.resume_representation_after.delta,
    grounding_safety: result.grounding_safety,
    repair_integrity: result.repair_integrity,
    coverage_recognition: result.coverage_recognition,
    question_coverage: result.question_coverage,
    question_recognition: result.question_recognition,
    structure_before: result.structure_before,
    structure_preservation: result.structure_preservation
  }, null, 2));
}
