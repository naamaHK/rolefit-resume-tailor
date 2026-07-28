import assert from "node:assert/strict";
import { existsSync } from "node:fs";
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
  throw new Error("Playwright is required for placement flow tests.");
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

async function clickUnique(locator, label) {
  assert.equal(await locator.count(), 1, `${label} should have exactly one button`);
  await locator.click();
}

const playwrightModule = await loadPlaywright();
const playwright = playwrightModule.chromium ? playwrightModule : playwrightModule.default;
const systemExecutable = getSystemChromiumExecutable();
const browser = await playwright.chromium.launch({
  headless: true,
  ...(systemExecutable ? { executablePath: systemExecutable } : {})
});
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

try {
  await page.addInitScript(() => {
    window.__ROLEFIT_TEST__ = true;
  });
  await page.goto(pathToFileURL(path.resolve("index.html")).href);

  const baseResume = `ALEX MORGAN
alex.morgan@example.com
050-555-0198

STATEMENT
Research engineer working on machine learning systems.

EXPERIENCE
Data Analyst 2020 - 2024
Northstar Research
- Built recommendation experiments.

EDUCATION
B.Sc. in Statistics 2012 - 2016
Example University

SKILLS
Machine Learning • Python`;

  await page.evaluate((resumeText) => {
    document.querySelector("#resumeInput").value = resumeText;
    document.querySelector("#finalResume").value = "";
    window.__roleFitTest.resetState();
    window.__roleFitTest.setActivePass(window.__roleFitTest.passes.missingExperience);
    window.__roleFitTest.setCurrentChanges([{
      id: "c-experience-and-skill",
      type: "ask_user",
      section: "Experience",
      missingTerm: "C",
      promptText: "Do you have experience with C?",
      whyItHelps: "C is requested by the target role.",
      evidence: "User confirmation required.",
      riskLevel: "high",
      supportLevel: "user_confirmation_needed",
      status: "pending",
      mode: "appendUserConfirmed",
      requiresUserWording: true,
      placement: "experience",
      placements: ["experience", "skills"],
      acceptedPlacements: [],
      previewedPlacementKeys: {},
      experienceAction: "new",
      experienceDraftText: "Implemented experiment tooling in C.",
      experienceDraftContext: "experience-0|new|",
      skillDraftText: "C",
      pass: window.__roleFitTest.passes.missingExperience
    }]);
    window.__roleFitTest.renderChanges();
  }, baseResume);

  await clickUnique(
    page.locator("#changeCards [data-preview-placement='experience']"),
    "Experience preview"
  );
  assert.match(
    await page.locator("#pdfPreview").innerText(),
    /Implemented experiment tooling in C\./,
    "Experience preview should show the exact new C bullet before it is accepted"
  );
  assert.match(
    await page.locator("#pdfPreview").innerHTML(),
    /resume-preview-highlight[\s\S]*Implemented experiment tooling in C\./,
    "Experience preview should highlight the newly added C bullet"
  );
  await clickUnique(
    page.locator("#activeCommentPanel [data-accept-placement='experience']"),
    "Add to Experience"
  );
  let finalText = await page.locator("#finalResume").inputValue();
  assert.match(finalText, /Northstar Research[\s\S]*- Implemented experiment tooling in C\./, "Add to Experience should persist the C bullet");

  await clickUnique(
    page.locator("#activeCommentPanel [data-preview-placement='skills']"),
    "Skills preview after Experience"
  );
  const singleSkillPreviewHtml = await page.locator("#pdfPreview").innerHTML();
  assert.match(singleSkillPreviewHtml, /<mark class="resume-preview-highlight">C<\/mark>/, "the real Skills preview should highlight only the added single-letter skill");
  assert.doesNotMatch(singleSkillPreviewHtml, /resume-preview-section-highlight/, "the real Skills preview must not highlight the whole existing Skills section");
  await clickUnique(
    page.locator("#activeCommentPanel [data-accept-placement='skills']"),
    "Add to Skills after Experience"
  );
  finalText = await page.locator("#finalResume").inputValue();
  assert.match(finalText, /Northstar Research[\s\S]*- Implemented experiment tooling in C\./, "adding C to Skills should preserve the accepted Experience bullet");
  assert.match(finalText, /Programming Languages: Python • C|Programming Languages: C • Python/, "Add to Skills should persist C with the existing programming language");

  await page.evaluate(() => {
    const api = window.__roleFitTest;
    const followupProjectCard = {
      id: "followup-project-skill",
      type: "ask_user",
      section: "Selected Projects",
      missingTerm: "Java",
      promptText: "Do you have experience with Java?",
      whyItHelps: "Java is requested by the target role.",
      evidence: "User confirmation required.",
      riskLevel: "high",
      supportLevel: "user_confirmation_needed",
      status: "pending",
      mode: "appendUserConfirmed",
      requiresUserWording: true,
      placement: "projects",
      placements: ["projects"],
      acceptedPlacements: [],
      previewedPlacementKeys: {},
      projectAction: "new_bullet",
      projectEntryKey: "project-0",
      projectDetails: "Added Java validation support.",
      projectDraftContext: "new_bullet|project-0|",
      pass: api.passes.missingExperience
    };
    const newProjectCard = {
      id: "new-project-first",
      type: "ask_user",
      section: "Selected Projects",
      missingTerm: "RAG",
      promptText: "Do you have a substantial RAG project?",
      whyItHelps: "The project is relevant to the target role.",
      evidence: "User confirmation required.",
      riskLevel: "high",
      supportLevel: "user_confirmation_needed",
      status: "pending",
      mode: "appendUserConfirmed",
      requiresUserWording: true,
      placement: "projects",
      placements: ["projects"],
      acceptedPlacements: [],
      previewedPlacementKeys: {},
      projectAction: "new",
      projectName: "RoleFit Evaluator",
      projectYear: "2025",
      projectLabel: "Portfolio project",
      projectDetails: "Built a RAG evaluation workflow.",
      projectDraftContext: "new||",
      pass: api.passes.missingExperience
    };
    api.setCurrentChanges([...api.getCurrentChanges(), followupProjectCard, newProjectCard]);
    api.renderChanges();
  });

  await clickUnique(
    page.locator("#changeCards [data-change-id='new-project-first'] [data-preview-placement='projects']"),
    "New Project preview"
  );
  await clickUnique(
    page.locator("#activeCommentPanel [data-accept-placement='projects']"),
    "Add new Project"
  );
  finalText = await page.locator("#finalResume").inputValue();
  assert.match(finalText, /RoleFit Evaluator 2025[\s\S]*Built a RAG evaluation workflow\./, "new Project should be accepted first");

  await clickUnique(
    page.locator("#changeCards [data-change-id='followup-project-skill'] [data-preview-placement='projects']"),
    "Follow-up Project preview"
  );
  await clickUnique(
    page.locator("#activeCommentPanel [data-accept-placement='projects']"),
    "Add to newly created Project"
  );
  finalText = await page.locator("#finalResume").inputValue();
  assert.match(
    finalText,
    /RoleFit Evaluator 2025[\s\S]*- Built a RAG evaluation workflow\.[\s\S]*- Added Java validation support\./,
    "a later skill card should persist a bullet under a previously accepted new Project"
  );

  await page.evaluate(() => {
    const api = window.__roleFitTest;
    const followupExperienceCard = {
      id: "followup-new-experience-skill",
      type: "ask_user",
      section: "Experience",
      missingTerm: "SQL",
      promptText: "Do you have experience with SQL?",
      whyItHelps: "SQL is requested by the target role.",
      evidence: "User confirmation required.",
      riskLevel: "high",
      supportLevel: "user_confirmation_needed",
      status: "pending",
      mode: "appendUserConfirmed",
      requiresUserWording: true,
      placement: "experience",
      placements: ["experience"],
      acceptedPlacements: [],
      previewedPlacementKeys: {},
      experienceAction: "new",
      experienceDraftText: "Built SQL quality checks for model inputs.",
      experienceDraftContext: "experience-0|new|",
      pass: api.passes.missingExperience
    };
    const newExperienceCard = {
      id: "new-experience-first",
      type: "ask_user",
      section: "Experience",
      missingTerm: "LLM",
      promptText: "Do you have relevant LLM experience?",
      whyItHelps: "The role requests LLM experience.",
      evidence: "User confirmation required.",
      riskLevel: "high",
      supportLevel: "user_confirmation_needed",
      status: "pending",
      mode: "appendUserConfirmed",
      requiresUserWording: true,
      placement: "experience",
      placements: ["experience"],
      acceptedPlacements: [],
      previewedPlacementKeys: {},
      experienceEntryKey: "__new_experience__",
      experienceNewTitle: "Applied AI Researcher",
      experienceNewCompany: "Example AI",
      experienceNewYears: "2025 - Present",
      experienceDraftText: "Built an LLM evaluation prototype.",
      experienceDraftContext: "__new_experience__|new_experience|",
      pass: api.passes.missingExperience
    };
    api.setCurrentChanges([...api.getCurrentChanges(), followupExperienceCard, newExperienceCard]);
    api.renderChanges();
  });

  await clickUnique(
    page.locator("#changeCards [data-change-id='new-experience-first'] [data-preview-placement='experience']"),
    "New Experience preview"
  );
  await clickUnique(
    page.locator("#activeCommentPanel [data-accept-placement='experience']"),
    "Add new Experience"
  );
  finalText = await page.locator("#finalResume").inputValue();
  assert.match(finalText, /Applied AI Researcher 2025 - Present[\s\S]*Example AI[\s\S]*- Built an LLM evaluation prototype\./, "new Experience should be accepted first");

  const followupExperienceCard = page.locator("#changeCards [data-change-id='followup-new-experience-skill']");
  assert.match(
    await followupExperienceCard.innerText(),
    /Applied AI Researcher - Example AI - 2025 - Present/,
    "a later skill card should show a newly accepted Experience entry in its selector"
  );
  await followupExperienceCard.locator(".experience-entry-select").selectOption({
    label: "Applied AI Researcher - Example AI - 2025 - Present"
  });
  assert.equal(
    await followupExperienceCard.locator("[data-draft-field='experienceDraftText']").inputValue(),
    "",
    "switching to a newly accepted job must clear evidence drafted for a different job"
  );
  await followupExperienceCard.locator("[data-draft-field='experienceDraftText']").fill("Built SQL quality checks for model inputs.");
  await clickUnique(
    followupExperienceCard.locator("[data-preview-placement='experience']"),
    "Follow-up Experience preview"
  );
  await clickUnique(
    page.locator("#activeCommentPanel [data-accept-placement='experience']"),
    "Add to newly created Experience"
  );
  finalText = await page.locator("#finalResume").inputValue();
  assert.match(
    finalText,
    /Applied AI Researcher 2025 - Present[\s\S]*Example AI[\s\S]*- Built an LLM evaluation prototype\.[\s\S]*- Built SQL quality checks for model inputs\./,
    "a later skill card should persist a bullet under a previously accepted new Experience entry"
  );

  await page.evaluate(() => {
    const api = window.__roleFitTest;
    const pythonFollowupCard = {
      id: "python-on-new-c-experience",
      type: "ask_user",
      section: "Experience",
      missingTerm: "Python",
      promptText: "Do you have experience with Python?",
      whyItHelps: "Python is requested by the target role.",
      evidence: "User confirmation required.",
      riskLevel: "high",
      supportLevel: "user_confirmation_needed",
      status: "pending",
      mode: "appendUserConfirmed",
      requiresUserWording: true,
      placement: "experience",
      placements: ["experience"],
      acceptedPlacements: [],
      previewedPlacementKeys: {},
      experienceAction: "new",
      experienceDraftText: "Automated test-data preparation with Python.",
      pass: api.passes.missingExperience
    };
    const newCExperienceCard = {
      id: "new-c-experience",
      type: "ask_user",
      section: "Experience",
      missingTerm: "C",
      promptText: "Do you have experience with C?",
      whyItHelps: "C is requested by the target role.",
      evidence: "User confirmation required.",
      riskLevel: "high",
      supportLevel: "user_confirmation_needed",
      status: "pending",
      mode: "appendUserConfirmed",
      requiresUserWording: true,
      placement: "experience",
      placements: ["experience"],
      acceptedPlacements: [],
      previewedPlacementKeys: {},
      experienceEntryKey: "__new_experience__",
      experienceNewTitle: "C Systems Intern",
      experienceNewCompany: "Example C Labs",
      experienceNewYears: "2010 - 2011",
      experienceDraftText: "Built low-level data tooling in C.",
      experienceDraftContext: "__new_experience__|new_experience|",
      pass: api.passes.missingExperience
    };
    api.setCurrentChanges([...api.getCurrentChanges(), pythonFollowupCard, newCExperienceCard]);
    api.renderChanges();
  });

  await clickUnique(
    page.locator("#changeCards [data-change-id='new-c-experience'] [data-accept-placement='experience']"),
    "Add older C Experience without preview"
  );
  const pythonFollowupCard = page.locator("#changeCards [data-change-id='python-on-new-c-experience']");
  const pythonExperienceSelect = pythonFollowupCard.locator(".experience-entry-select");
  await pythonExperienceSelect.selectOption({ label: "C Systems Intern - Example C Labs - 2010 - 2011" });
  assert.match(
    await pythonFollowupCard.innerText(),
    /New bullet under C Systems Intern - Example C Labs - 2010 - 2011/,
    "the later Python card should target the newly created C Experience entry"
  );
  assert.equal(
    await pythonFollowupCard.locator("[data-draft-field='experienceDraftText']").inputValue(),
    "",
    "switching to another job must clear any previous new-bullet draft"
  );
  await pythonFollowupCard.locator("[data-draft-field='experienceDraftText']").fill("Automated test-data preparation with Python.");
  await clickUnique(
    pythonFollowupCard.locator("[data-accept-placement='experience']"),
    "Add Python to the selected C Experience"
  );
  finalText = await page.locator("#finalResume").inputValue();
  assert.match(
    finalText,
    /C Systems Intern 2010 - 2011[\s\S]*Example C Labs[\s\S]*- Built low-level data tooling in C\.[\s\S]*- Automated test-data preparation with Python\./,
    "a later missing skill should be addable to the same newly created Experience entry"
  );

  await page.evaluate(() => {
    const api = window.__roleFitTest;
    api.setCurrentChanges([...api.getCurrentChanges(), {
      id: "later-java-skill",
      type: "ask_user",
      section: "Skills",
      missingTerm: "Java",
      promptText: "Do you have experience with Java?",
      whyItHelps: "Java is requested by the target role.",
      evidence: "User confirmation required.",
      riskLevel: "high",
      supportLevel: "user_confirmation_needed",
      status: "pending",
      mode: "appendUserConfirmed",
      requiresUserWording: true,
      placement: "skills",
      placements: ["skills"],
      acceptedPlacements: [],
      previewedPlacementKeys: {},
      skillDraftText: "Java",
      pass: api.passes.missingExperience
    }]);
    api.renderChanges();
  });
  await clickUnique(
    page.locator("#changeCards [data-change-id='later-java-skill'] [data-preview-placement='skills']"),
    "Later Java Skills preview"
  );
  await clickUnique(
    page.locator("#activeCommentPanel [data-accept-placement='skills']"),
    "Add later Java skill"
  );
  finalText = await page.locator("#finalResume").inputValue();
  assert.match(finalText, /Programming Languages: Python • C • Java/, "adding a later programming language should update the existing Programming Languages row");
  assert.match(finalText, /Applied AI Researcher 2025 - Present/, "adding a later skill should preserve newly accepted Experience entries");
  assert.match(finalText, /RoleFit Evaluator 2025/, "adding a later skill should preserve newly accepted Projects");

  await page.evaluate(() => {
    const api = window.__roleFitTest;
    api.setCurrentChanges([...api.getCurrentChanges(), {
      id: "two-distinct-skills",
      type: "ask_user",
      section: "Skills",
      missingTerm: "Model evaluation",
      promptText: "Do you have experience with model evaluation?",
      whyItHelps: "The role values model evaluation and error analysis.",
      evidence: "User confirmation required.",
      riskLevel: "high",
      supportLevel: "user_confirmation_needed",
      status: "pending",
      mode: "appendUserConfirmed",
      requiresUserWording: true,
      placement: "skills",
      placements: ["skills"],
      acceptedPlacements: [],
      previewedPlacementKeys: {},
      skillDraftText: "Model Evaluation, Error Analysis",
      pass: api.passes.missingExperience
    }]);
    api.renderChanges();
  });
  await clickUnique(
    page.locator("#changeCards [data-change-id='two-distinct-skills'] [data-preview-placement='skills']"),
    "Two skills preview"
  );
  const twoSkillsPreview = await page.locator("#pdfPreview").innerText();
  assert.match(twoSkillsPreview, /Model Evaluation/, "Skills preview should include the first requested skill");
  assert.match(twoSkillsPreview, /Error Analysis/, "Skills preview should include the second requested skill");
  await clickUnique(
    page.locator("#activeCommentPanel [data-accept-placement='skills']"),
    "Add both distinct skills"
  );
  finalText = await page.locator("#finalResume").inputValue();
  assert.match(finalText, /Machine Learning • Model Evaluation • Error Analysis/, "adding two distinct skills should persist both skills, not only the first one");
  assert.match(finalText, /Programming Languages: Python • C • Java/, "adding non-language skills should preserve the Programming Languages subsection");

  const truncatedSpellingCard = {
    id: "truncated-effective-spelling",
    type: "spelling_check",
    section: "Strengths",
    originalText: "ective Communication and Business Understanding.",
    suggestedText: "Effective Communication and Business Understanding.",
    spellingBefore: "ective",
    spellingAfter: "Effective",
    whyItHelps: "Fixes spelling mistakes.",
    evidence: "ective Communication and Business Understanding.",
    riskLevel: "low",
    supportLevel: "resume_supported",
    status: "pending",
    mode: "replace",
    pass: "cleanup"
  };
  await page.evaluate((change) => {
    const api = window.__roleFitTest;
    document.querySelector("#resumeInput").value = `ALEX MORGAN
alex.morgan@example.com

STRENGTHS
ective Communication and Business Understanding.`;
    document.querySelector("#finalResume").value = "";
    api.resetState();
    api.setActivePass(api.passes.cleanup);
    api.setCurrentChanges([change]);
    api.renderChanges();
  }, truncatedSpellingCard);
  await clickUnique(
    page.locator("#changeCards [data-change-id='truncated-effective-spelling'] [data-action='preview']"),
    "Truncated spelling preview"
  );
  assert.match(
    await page.locator("#pdfPreview").innerHTML(),
    /<mark class="resume-preview-highlight">Effective<\/mark> Communication and Business Understanding/,
    "the real browser spelling preview should highlight only Effective"
  );

  await page.evaluate((change) => {
    const api = window.__roleFitTest;
    document.querySelector("#resumeInput").value = `ALEX MORGAN
alex.morgan@example.com

STRENGTHS
Effective Communication and Business Understanding.`;
    document.querySelector("#finalResume").value = "";
    api.resetState();
    api.setActivePass(api.passes.cleanup);
    api.setCurrentChanges([change]);
    api.renderChanges();
  }, truncatedSpellingCard);
  await clickUnique(
    page.locator("#changeCards [data-change-id='truncated-effective-spelling'] [data-action='preview']"),
    "Stale truncated spelling preview"
  );
  const staleSpellingPreview = await page.locator("#pdfPreview").innerHTML();
  assert.doesNotMatch(staleSpellingPreview, /resume-preview-highlight/, "the real browser should not highlight an already-correct word for a stale spelling card");
  assert.doesNotMatch(staleSpellingPreview, /EffEffective/, "the real browser should not corrupt an already-correct word for a stale spelling card");

  await page.evaluate((resumeText) => {
    const api = window.__roleFitTest;
    document.querySelector("#resumeInput").value = resumeText;
    document.querySelector("#finalResume").value = "";
    api.resetState();
    api.setActivePass(api.passes.missingExperience);
    api.setCurrentChanges([{
      id: "save-without-preview",
      type: "ask_user",
      section: "Skills",
      missingTerm: "C",
      promptText: "Do you have experience with C?",
      whyItHelps: "C is requested by the target role.",
      evidence: "User confirmation required.",
      riskLevel: "high",
      supportLevel: "user_confirmation_needed",
      status: "pending",
      mode: "appendUserConfirmed",
      requiresUserWording: true,
      placement: "skills",
      placements: ["skills"],
      acceptedPlacements: [],
      previewedPlacementKeys: {},
      skillDraftText: "C",
      pass: api.passes.missingExperience
    }]);
    api.renderChanges();
  }, baseResume);
  await clickUnique(
    page.locator("#changeCards [data-change-id='save-without-preview'] [data-accept-placement='skills']"),
    "Add to Skills without Preview"
  );
  finalText = await page.locator("#finalResume").inputValue();
  assert.match(finalText, /EXPERIENCE[\s\S]*Data Analyst/, "saving without Preview should preserve the original Experience section");
  assert.match(finalText, /EDUCATION[\s\S]*B\.Sc\. in Statistics/, "saving without Preview should preserve the original Education section");
  assert.match(finalText, /Programming Languages: Python • C|Programming Languages: C • Python/, "saving without Preview should add the selected skill");

  await page.evaluate((resumeText) => {
    const api = window.__roleFitTest;
    document.querySelector("#resumeInput").value = resumeText;
    document.querySelector("#finalResume").value = "";
    api.resetState();
    api.setActivePass(api.passes.missingExperience);
    api.setCurrentChanges([{
      id: "save-multiple-without-preview",
      type: "ask_user",
      section: "Experience",
      missingTerm: "C++",
      promptText: "Do you have experience with C++?",
      whyItHelps: "C++ is requested by the target role.",
      evidence: "User confirmation required.",
      riskLevel: "high",
      supportLevel: "user_confirmation_needed",
      status: "pending",
      mode: "appendUserConfirmed",
      requiresUserWording: true,
      placement: "skills",
      placements: ["skills", "experience", "other"],
      acceptedPlacements: [],
      previewedPlacementKeys: {},
      skillDraftText: "C++",
      experienceEntryKey: "experience-0",
      experienceAction: "new",
      experienceDraftText: "Built C++ data-quality checks.",
      experienceDraftContext: "experience-0|new|",
      otherSectionName: "Awards",
      otherPlacementText: "Received an internal C++ innovation award.",
      pass: api.passes.missingExperience
    }]);
    api.renderChanges();
  }, baseResume);
  await clickUnique(
    page.locator("#changeCards [data-change-id='save-multiple-without-preview'] [data-accept-placement='skills']"),
    "Save multi-placement Skills without Preview"
  );
  await clickUnique(
    page.locator("#activeCommentPanel [data-accept-placement='experience']"),
    "Save multi-placement Experience without Preview"
  );
  await clickUnique(
    page.locator("#activeCommentPanel [data-accept-placement='other']"),
    "Save multi-placement Other without Preview"
  );
  finalText = await page.locator("#finalResume").inputValue();
  assert.match(finalText, /^ALEX MORGAN/m, "saving multiple additions without Preview must preserve the original header");
  assert.match(finalText, /EXPERIENCE[\s\S]*Data Analyst[\s\S]*- Built C\+\+ data-quality checks\./, "saving multiple additions without Preview must preserve and update Experience");
  assert.match(finalText, /EDUCATION[\s\S]*B\.Sc\. in Statistics/, "saving multiple additions without Preview must preserve Education");
  assert.match(finalText, /Programming Languages: Python • C\+\+|Programming Languages: C\+\+ • Python/, "saving multiple additions without Preview should add C++ to Skills");
  assert.match(finalText, /AWARDS\n- Received an internal C\+\+ innovation award\./, "saving multiple additions without Preview should add the custom section without replacing the resume");

  await page.evaluate((resumeText) => {
    const api = window.__roleFitTest;
    document.querySelector("#resumeInput").value = resumeText;
    document.querySelector("#finalResume").value = "";
    api.resetState();
    api.setActivePass(api.passes.missingExperience);
    api.setCurrentChanges([{
      id: "typed-experience-without-preview",
      type: "ask_user",
      section: "Experience",
      missingTerm: "C",
      promptText: "Do you have experience with C?",
      whyItHelps: "C is requested by the target role.",
      evidence: "User confirmation required.",
      riskLevel: "high",
      supportLevel: "user_confirmation_needed",
      status: "pending",
      mode: "appendUserConfirmed",
      requiresUserWording: true,
      placement: "experience",
      placements: ["experience"],
      acceptedPlacements: [],
      previewedPlacementKeys: {},
      experienceAction: "new",
      experienceDraftText: "",
      pass: api.passes.missingExperience
    }]);
    api.renderChanges();
  }, baseResume);
  const typedExperienceCard = page.locator("#changeCards [data-change-id='typed-experience-without-preview']");
  const typedExperienceInput = typedExperienceCard.locator("[data-draft-field='experienceDraftText']");
  assert.equal(await typedExperienceInput.count(), 1, "the typed Experience card should have one draft field");
  await typedExperienceInput.fill("Built C instrumentation for recommendation experiments.");
  await clickUnique(
    typedExperienceCard.locator("[data-accept-placement='experience']"),
    "Add typed Experience without Preview"
  );
  finalText = await page.locator("#finalResume").inputValue();
  assert.match(finalText, /Northstar Research[\s\S]*- Built C instrumentation for recommendation experiments\./, "Add to Experience should save user-typed evidence without Preview");

  await page.evaluate((resumeText) => {
    const api = window.__roleFitTest;
    document.querySelector("#resumeInput").value = resumeText;
    document.querySelector("#finalResume").value = "";
    api.resetState();
    api.setActivePass(api.passes.missingExperience);
    api.setCurrentChanges([{
      id: "typed-experience-with-preview",
      type: "ask_user",
      section: "Experience",
      missingTerm: "C",
      promptText: "Do you have experience with C?",
      whyItHelps: "C is requested by the target role.",
      evidence: "User confirmation required.",
      riskLevel: "high",
      supportLevel: "user_confirmation_needed",
      status: "pending",
      mode: "appendUserConfirmed",
      requiresUserWording: true,
      placement: "experience",
      placements: ["experience"],
      acceptedPlacements: [],
      previewedPlacementKeys: {},
      experienceAction: "new",
      experienceDraftText: "",
      pass: api.passes.missingExperience
    }]);
    api.renderChanges();
  }, baseResume);
  const previewExperienceCard = page.locator("#changeCards [data-change-id='typed-experience-with-preview']");
  const previewExperienceInput = previewExperienceCard.locator("[data-draft-field='experienceDraftText']");
  assert.equal(await previewExperienceInput.count(), 1, "the preview Experience card should have one draft field");
  await previewExperienceInput.fill("Built C monitoring for production experiments.");
  await clickUnique(
    previewExperienceCard.locator("[data-preview-placement='experience']"),
    "Preview typed Experience"
  );
  assert.match(
    await page.locator("#pdfPreview").innerHTML(),
    /<li class="resume-preview-highlight">Built C monitoring for production experiments\.<\/li>/,
    "Experience Preview should highlight the complete user-typed bullet"
  );
  await clickUnique(
    page.locator("#activeCommentPanel [data-accept-placement='experience']"),
    "Add typed Experience after Preview"
  );
  finalText = await page.locator("#finalResume").inputValue();
  assert.match(finalText, /Northstar Research[\s\S]*- Built C monitoring for production experiments\./, "Add to Experience should save the same text shown in Preview");

  await page.evaluate((resumeText) => {
    const api = window.__roleFitTest;
    document.querySelector("#resumeInput").value = resumeText;
    document.querySelector("#finalResume").value = "";
    api.resetState();
    api.setActivePass(api.passes.missingExperience);
    api.setCurrentChanges([{
      id: "rewrite-default-existing-experience",
      type: "ask_user",
      section: "Experience",
      missingTerm: "C",
      promptText: "Do you have experience with C?",
      whyItHelps: "C is requested by the target role.",
      evidence: "User confirmation required.",
      riskLevel: "high",
      supportLevel: "user_confirmation_needed",
      status: "pending",
      mode: "appendUserConfirmed",
      requiresUserWording: true,
      placement: "experience",
      placements: ["experience"],
      acceptedPlacements: [],
      previewedPlacementKeys: {},
      experienceAction: "enhance",
      experienceBulletIndex: "0",
      experienceDraftText: "",
      pass: api.passes.missingExperience
    }]);
    api.renderChanges();
  }, baseResume);
  const rewriteExperienceCard = page.locator("#changeCards [data-change-id='rewrite-default-existing-experience']");
  const rewriteExperienceInput = rewriteExperienceCard.locator("[data-draft-field='experienceDraftText']");
  assert.equal(await rewriteExperienceInput.count(), 1, "the default existing Experience rewrite should have one draft field");
  await rewriteExperienceInput.fill("Built C-based recommendation experiments for production.");
  await clickUnique(
    rewriteExperienceCard.locator("[data-preview-placement='experience']"),
    "Preview default existing Experience rewrite"
  );
  assert.match(
    await page.locator("#pdfPreview").innerHTML(),
    /Built <mark class="resume-preview-highlight">C-based<\/mark> recommendation experiments <mark class="resume-preview-highlight">for production\.<\/mark>/,
    "Experience rewrite Preview should show the exact replacement bullet and highlight only its additions"
  );
  await clickUnique(
    page.locator("#activeCommentPanel [data-accept-placement='experience']"),
    "Save default existing Experience rewrite"
  );
  finalText = await page.locator("#finalResume").inputValue();
  assert.match(finalText, /Northstar Research[\s\S]*- Built C-based recommendation experiments for production\./, "Add to Experience should save a rewrite under the default existing job");
  assert.doesNotMatch(finalText, /Built recommendation experiments\./, "the existing Experience rewrite should replace the chosen bullet");

  await page.evaluate((resumeText) => {
    const api = window.__roleFitTest;
    document.querySelector("#resumeInput").value = resumeText;
    document.querySelector("#finalResume").value = "";
    api.resetState();
    api.setActivePass(api.passes.missingExperience);
    api.setCurrentChanges([{
      id: "create-awards-first",
      type: "ask_user",
      section: "Awards",
      missingTerm: "C",
      promptText: "Do you have a relevant award?",
      whyItHelps: "The award supports the role.",
      evidence: "User confirmation required.",
      riskLevel: "high",
      supportLevel: "user_confirmation_needed",
      status: "pending",
      mode: "appendUserConfirmed",
      requiresUserWording: true,
      placement: "other",
      placements: ["other"],
      acceptedPlacements: [],
      previewedPlacementKeys: {},
      otherSectionName: "Awards",
      otherAction: "new",
      otherPlacementText: "Received an internal innovation award.",
      pass: api.passes.missingExperience
    }]);
    api.renderChanges();
  }, baseResume);
  await clickUnique(
    page.locator("#changeCards [data-change-id='create-awards-first'] [data-accept-placement='other']"),
    "Create Awards section"
  );
  await page.evaluate(() => {
    const api = window.__roleFitTest;
    api.setCurrentChanges([...api.getCurrentChanges(), {
      id: "rewrite-existing-award-later",
      type: "ask_user",
      section: "Awards",
      missingTerm: "C++",
      promptText: "Should C++ be reflected in an existing award?",
      whyItHelps: "This connects the award to the requested skill.",
      evidence: "User confirmation required.",
      riskLevel: "high",
      supportLevel: "user_confirmation_needed",
      status: "pending",
      mode: "appendUserConfirmed",
      requiresUserWording: true,
      placement: "other",
      placements: ["other"],
      acceptedPlacements: [],
      previewedPlacementKeys: {},
      otherSectionName: "Awards",
      otherAction: "enhance",
      otherItemIndex: "0",
      otherPlacementText: "Received an internal C++ innovation award.",
      pass: api.passes.missingExperience
    }]);
    api.renderChanges();
  });
  const laterAwardsCard = page.locator("#changeCards [data-change-id='rewrite-existing-award-later']");
  const laterAwardsAction = laterAwardsCard.locator(".other-action-select");
  assert.equal(await laterAwardsAction.count(), 1, "the later Awards card should show its action selector");
  assert.equal(await laterAwardsAction.inputValue(), "enhance", "the later Awards card should allow rewriting the existing award");
  assert.match(await laterAwardsCard.innerText(), /Received an internal innovation award\./, "the later Awards card should show the award added by the previous skill card");
  await clickUnique(
    laterAwardsCard.locator("[data-accept-placement='other']"),
    "Rewrite existing Award"
  );
  finalText = await page.locator("#finalResume").inputValue();
  assert.match(finalText, /AWARDS\n- Received an internal C\+\+ innovation award\./, "a later skill card should rewrite an Award added by an earlier card");

  await page.evaluate((resumeText) => {
    const api = window.__roleFitTest;
    document.querySelector("#resumeInput").value = resumeText;
    document.querySelector("#finalResume").value = "";
    api.resetState();
    api.setActivePass(api.passes.missingExperience);
    api.setCurrentChanges([{
      id: "incomplete-project-inline-error",
      type: "ask_user",
      section: "Selected Projects",
      missingTerm: "RAG",
      promptText: "Do you have a RAG project?",
      whyItHelps: "RAG is requested by the target role.",
      evidence: "User confirmation required.",
      riskLevel: "high",
      supportLevel: "user_confirmation_needed",
      status: "pending",
      mode: "appendUserConfirmed",
      requiresUserWording: true,
      placement: "projects",
      placements: ["projects"],
      acceptedPlacements: [],
      previewedPlacementKeys: {},
      projectAction: "new",
      pass: api.passes.missingExperience
    }]);
    api.renderChanges();
    api.openChangeInCommentPanel("incomplete-project-inline-error");
  }, baseResume);
  const incompleteProjectCard = page.locator("#activeCommentPanel [data-change-id='incomplete-project-inline-error']");
  const projectDetailsInput = incompleteProjectCard.locator("[data-draft-field='projectDetails']");
  await projectDetailsInput.fill("Built a truthful RAG evaluation prototype.");
  await clickUnique(
    incompleteProjectCard.locator("[data-preview-placement='projects']"),
    "Preview incomplete Project"
  );
  assert.equal(await incompleteProjectCard.count(), 1, "an incomplete project should stay open in its comment window after a validation error");
  assert.match(await incompleteProjectCard.innerText(), /Project placement needs at least Project name and Year/, "the project validation error should be visible inside the project comment window");
  assert.equal(
    await incompleteProjectCard.locator(":scope > .card-validation-error").count(),
    0,
    "a Project validation error should not be stranded at the top of the comment card"
  );
  assert.match(
    await incompleteProjectCard.locator(".placement-detail-card").filter({ hasText: "Projects" }).innerText(),
    /Project placement needs at least Project name and Year/,
    "a Project validation error should appear directly inside the Projects editor"
  );
  const projectNameInput = incompleteProjectCard.locator("[data-draft-field='projectName']");
  const projectYearInput = incompleteProjectCard.locator("[data-draft-field='projectYear']");
  assert.equal(await projectNameInput.count(), 1, "the project card should keep its Project name field after the error");
  assert.equal(await projectYearInput.count(), 1, "the project card should keep its Year field after the error");
  assert.equal(await projectDetailsInput.inputValue(), "Built a truthful RAG evaluation prototype.", "a Project validation error should keep the user's typed detail in the open comment");
  await projectNameInput.fill("RoleFit Evaluator");
  await projectYearInput.fill("2026");
  await clickUnique(
    incompleteProjectCard.locator("[data-accept-placement='projects']"),
    "Add corrected Project without preview"
  );
  finalText = await page.locator("#finalResume").inputValue();
  assert.match(finalText, /SELECTED PROJECTS[\s\S]*RoleFit Evaluator 2026[\s\S]*Built a truthful RAG evaluation prototype\./, "a corrected Project should add directly without reopening or requiring another preview");

  await page.evaluate((resumeText) => {
    const api = window.__roleFitTest;
    document.querySelector("#resumeInput").value = `${resumeText}\n\nAWARDS\n- Existing award.`;
    document.querySelector("#finalResume").value = "";
    api.resetState();
    api.setActivePass(api.passes.missingExperience);
    api.setCurrentChanges([{
      id: "choose-project-once",
      type: "ask_user",
      section: "Missing Evidence",
      missingTerm: "RAG",
      promptText: "Do you have a RAG project?",
      whyItHelps: "RAG is requested by the target role.",
      evidence: "User confirmation required.",
      riskLevel: "high",
      supportLevel: "user_confirmation_needed",
      status: "pending",
      mode: "appendUserConfirmed",
      requiresUserWording: true,
      placement: "undecided",
      placements: [],
      acceptedPlacements: [],
      previewedPlacementKeys: {},
      pass: api.passes.missingExperience
    }]);
    api.renderChanges();
  }, baseResume);

  await clickUnique(
    page.locator("#missingExperiencePanel button[data-missing-experience-id='choose-project-once']"),
    "Open a Project card from Missing Experience"
  );
  const chooseProjectCard = page.locator("#activeCommentPanel [data-change-id='choose-project-once']");
  assert.equal(await chooseProjectCard.count(), 1, "the Project card should remain open after its first list click");
  await chooseProjectCard.locator(".placement-checkbox[value='projects']").check();
  const projectCardAfterSelection = page.locator("#activeCommentPanel [data-change-id='choose-project-once']");
  await projectCardAfterSelection.locator("[data-draft-field='projectName']").fill("One-click Project");
  await projectCardAfterSelection.locator("[data-draft-field='projectYear']").fill("2026");
  await projectCardAfterSelection.locator("[data-draft-field='projectDetails']").fill("Built a focused RAG experiment.");
  await clickUnique(
    projectCardAfterSelection.locator("[data-accept-placement='projects']"),
    "Add a Project after selecting Projects once"
  );
  finalText = await page.locator("#finalResume").inputValue();
  assert.match(finalText, /SELECTED PROJECTS[\s\S]*One-click Project 2026[\s\S]*Built a focused RAG experiment\./, "selecting Projects once should create the Project without reopening its card");
  assert.match(finalText, /AWARDS\n- Existing award\./, "adding a Project must preserve previously existing sections");

  const existingProjectResume = `${baseResume}\n\nSELECTED PROJECTS\nC Project 2020\n- C something.`;
  await page.evaluate((resumeText) => {
    const api = window.__roleFitTest;
    document.querySelector("#resumeInput").value = resumeText;
    document.querySelector("#finalResume").value = "";
    api.resetState();
    api.setActivePass(api.passes.missingExperience);
    api.setCurrentChanges([{
      id: "rewrite-existing-project-first-open",
      type: "ask_user",
      section: "Missing Evidence",
      missingTerm: "Python",
      promptText: "Do you have experience with Python?",
      whyItHelps: "Python is requested by the target role.",
      evidence: "User confirmation required.",
      riskLevel: "high",
      supportLevel: "user_confirmation_needed",
      status: "pending",
      mode: "appendUserConfirmed",
      requiresUserWording: true,
      placement: "undecided",
      placements: [],
      acceptedPlacements: [],
      previewedPlacementKeys: {},
      pass: api.passes.missingExperience
    }]);
    api.renderChanges();
  }, existingProjectResume);

  await clickUnique(
    page.locator("#missingExperiencePanel button[data-missing-experience-id='rewrite-existing-project-first-open']"),
    "Open existing Project rewrite"
  );
  let existingProjectCard = page.locator("#activeCommentPanel [data-change-id='rewrite-existing-project-first-open']");
  await existingProjectCard.locator(".placement-checkbox[value='projects']").check();
  existingProjectCard = page.locator("#activeCommentPanel [data-change-id='rewrite-existing-project-first-open']");
  await existingProjectCard.locator(".project-action-select").selectOption("rewrite");
  existingProjectCard = page.locator("#activeCommentPanel [data-change-id='rewrite-existing-project-first-open']");
  assert.equal(await existingProjectCard.count(), 1, "choosing rewrite should keep the Project editor open on the first selection");
  assert.equal(await existingProjectCard.locator(".placement-checkbox[value='projects']").isChecked(), true, "choosing rewrite must not replace the Projects destination with a rewrite destination");
  assert.equal(await existingProjectCard.locator(".project-action-select").inputValue(), "rewrite", "the Project action should remain rewrite after its first selection");
  assert.match(await existingProjectCard.innerText(), /C something\./, "the selected existing project bullet should appear in Before");
  await existingProjectCard.locator("[data-draft-field='projectDetails']").fill("C something and Python.");
  await clickUnique(
    existingProjectCard.locator("[data-preview-placement='projects']"),
    "Preview existing Project rewrite"
  );
  const projectPreviewText = await page.locator("#pdfPreview").innerText();
  assert.match(projectPreviewText, /C something and Python\./, "Project preview should show the rewritten existing bullet");
  assert.equal((projectPreviewText.match(/C something\./g) || []).length, 0, "Project preview should not retain the old bullet as a duplicate");
  existingProjectCard = page.locator("#activeCommentPanel [data-change-id='rewrite-existing-project-first-open']");
  await clickUnique(
    existingProjectCard.locator("[data-accept-placement='projects']"),
    "Accept existing Project rewrite"
  );
  finalText = await page.locator("#finalResume").inputValue();
  assert.match(finalText, /C Project 2020\n- C something and Python\./, "accepting should replace the selected existing project bullet");
  assert.equal((finalText.match(/C something\./g) || []).length, 0, "accepting a Project rewrite must not append the old bullet beside the replacement");

  await page.evaluate((resumeText) => {
    const api = window.__roleFitTest;
    document.querySelector("#resumeInput").value = resumeText;
    document.querySelector("#finalResume").value = "";
    api.resetState();
    api.setActivePass(api.passes.missingExperience);
    api.renderAiAnalysis({
      model: "test-model",
      job_analysis: {
        target_title: "Data Scientist",
        required_skills: ["Python", "Java", "Machine Learning"]
      },
      resume_analysis: {
        strongest_relevant_evidence: ["Machine learning research"]
      },
      tailoring_strategy: {
        emphasize: ["Python", "Java"],
        do_not_claim_without_confirmation: ["Java"]
      },
      final_checks: {
        keywords_covered: ["Python", "Java"],
        keywords_missing: ["Java"]
      }
    }, {
      baselineResume: resumeText,
      jobText: "The role requires Python, Java, and machine learning."
    });
    api.setCurrentChanges([{
      id: "java-role-coverage",
      type: "ask_user",
      section: "Skills",
      missingTerm: "Java",
      promptText: "Do you have experience with Java?",
      whyItHelps: "Java is requested by the target role.",
      evidence: "User confirmation required.",
      riskLevel: "high",
      supportLevel: "user_confirmation_needed",
      status: "pending",
      mode: "appendUserConfirmed",
      requiresUserWording: true,
      placement: "skills",
      placements: ["skills"],
      acceptedPlacements: [],
      previewedPlacementKeys: {},
      skillDraftText: "Java",
      pass: api.passes.missingExperience
    }]);
    api.renderChanges();
  }, baseResume);

  assert.equal(
    await page.locator(".role-coverage-block.covered [data-role-requirement='python']").count(),
    1,
    "Python should be covered because it is present in the current resume"
  );
  assert.equal(
    await page.locator(".role-coverage-block.missing [data-role-requirement='python']").count(),
    0,
    "Python must not appear in both role-analysis lists"
  );
  assert.equal(
    await page.locator(".role-coverage-block.missing [data-role-requirement='java']").count(),
    1,
    "Java should initially be missing"
  );
  await clickUnique(
    page.locator("#missingExperiencePanel button[data-missing-experience-id='java-role-coverage']"),
    "Open Java coverage card"
  );
  await clickUnique(
    page.locator("#activeCommentPanel [data-accept-placement='skills']"),
    "Add Java to Skills"
  );
  assert.equal(
    await page.locator(".role-coverage-block.covered [data-role-requirement='java']").count(),
    1,
    "accepted Java should move into covered requirements automatically"
  );
  assert.equal(
    await page.locator(".role-coverage-block.missing [data-role-requirement='java']").count(),
    0,
    "accepted Java should disappear from missing requirements automatically"
  );
  assert.equal(
    await page.locator(".role-coverage-block.covered [data-role-requirement='java'] .analysis-newly-covered").innerText(),
    "Added in this review",
    "newly covered Java should be visibly marked"
  );

  await page.setViewportSize({ width: 1500, height: 900 });
  const alignmentResume = `${baseResume}

PUBLICATIONS
An Example Research Paper 2024
Example Conference
A. Author, B. Author`;
  await page.evaluate((resumeText) => {
    const api = window.__roleFitTest;
    document.querySelector("#resumeInput").value = resumeText;
    document.querySelector("#finalResume").value = "";
    api.resetState();
    api.setActivePass(api.passes.suggestions);
    api.setCurrentChanges([{
      id: "aligned-lower-comment",
      type: "rewrite",
      section: "Publications",
      originalText: "An Example Research Paper 2024",
      suggestedText: "An Example Research Paper on Evaluation 2024",
      whyItHelps: "Makes the paper topic explicit.",
      evidence: "An Example Research Paper 2024",
      riskLevel: "low",
      supportLevel: "resume_supported",
      status: "pending",
      mode: "replace",
      pass: api.passes.suggestions
    }]);
    api.renderNumberedCommentPreview();
  }, alignmentResume);
  await clickUnique(
    page.locator("#pdfPreview .resume-comment-marker[data-comment-id='aligned-lower-comment']"),
    "Open lower Publications comment"
  );
  const alignedPositions = await page.evaluate(() => {
    const marker = document.querySelector("#pdfPreview .resume-comment-marker[data-comment-id='aligned-lower-comment']");
    const panel = document.querySelector("#activeCommentPanel");
    const preview = document.querySelector("#pdfPreview");
    return {
      markerTop: marker.getBoundingClientRect().top,
      panelTop: panel.getBoundingClientRect().top,
      previewTop: preview.getBoundingClientRect().top,
      aligned: panel.dataset.anchorAligned
    };
  });
  assert.equal(alignedPositions.aligned, "true", "a wide-screen comment should record that it is aligned to its resume marker");
  assert.ok(
    Math.abs(alignedPositions.panelTop - alignedPositions.markerTop) <= 24,
    "the active comment window should open beside the related resume bullet instead of beside the page header"
  );
  assert.ok(
    alignedPositions.panelTop - alignedPositions.previewTop > 120,
    "the lower Publications comment should not remain at the top of the preview"
  );

  console.log("Placement flow tests passed");
} finally {
  await browser.close();
}
