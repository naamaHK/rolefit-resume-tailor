import { existsSync } from "node:fs";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const baseUrl = process.env.ROLEFIT_DEMO_URL || "http://127.0.0.1:8765";
const validationOnly = process.env.ROLEFIT_DEMO_VALIDATE_ONLY === "1";
const outputDir = path.join(rootDir, "tmp", validationOnly ? "live-demo-validation" : "live-demo");
const videoPath = path.join(outputDir, "rolefit-live-demo.webm");
const posterPath = path.join(outputDir, "rolefit-live-demo-poster.png");
const finalScreenshotPath = path.join(outputDir, "rolefit-final-resume.png");
const metadataPath = path.join(outputDir, "recording-metadata.json");

const [resume, jobDescription] = await Promise.all([
  readFile(path.join(rootDir, "data", "demo-inputs", "revenue-operations-resume.txt"), "utf8"),
  readFile(path.join(rootDir, "data", "demo-inputs", "revenue-operations-job.txt"), "utf8")
]);

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
  throw new Error("Playwright is required to record the RoleFit demo.");
}

function getBrowserExecutable() {
  return [
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge"
  ].find((candidate) => existsSync(candidate)) || "";
}

async function installCaptionOverlay(page) {
  await page.evaluate(() => {
    const style = document.createElement("style");
    style.textContent = `
      #rolefit-demo-caption {
        position: fixed;
        left: 50%;
        bottom: 22px;
        z-index: 99999;
        width: min(760px, calc(100vw - 48px));
        transform: translateX(-50%);
        padding: 13px 18px;
        border: 1px solid rgba(255,255,255,.2);
        border-radius: 7px;
        background: rgba(18,28,42,.95);
        box-shadow: 0 12px 30px rgba(15,23,42,.28);
        color: #fff;
        font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        text-align: center;
        opacity: 0;
        transition: opacity 160ms ease;
        pointer-events: none;
      }
      #rolefit-demo-caption.visible { opacity: 1; }
      #rolefit-demo-caption strong { display: block; color: #7dd3c7; font-size: 18px; }
      #rolefit-demo-caption span { display: block; margin-top: 2px; font-size: 14px; line-height: 1.35; }
      .rolefit-demo-focus {
        outline: 4px solid rgba(21,128,116,.46) !important;
        outline-offset: 4px !important;
      }
    `;
    document.head.append(style);
    const caption = document.createElement("div");
    caption.id = "rolefit-demo-caption";
    caption.innerHTML = "<strong></strong><span></span>";
    document.body.append(caption);
  });
}

async function caption(page, title, detail, duration = 1600) {
  await page.evaluate(({ title, detail }) => {
    const box = document.querySelector("#rolefit-demo-caption");
    box.querySelector("strong").textContent = title;
    box.querySelector("span").textContent = detail;
    box.classList.add("visible");
  }, { title, detail });
  await page.waitForTimeout(duration);
}

async function hideCaption(page) {
  await page.evaluate(() => document.querySelector("#rolefit-demo-caption")?.classList.remove("visible"));
  await page.waitForTimeout(220);
}

async function focus(page, locator, duration = 550) {
  await locator.scrollIntoViewIfNeeded();
  await locator.evaluate((element) => element.classList.add("rolefit-demo-focus"));
  await page.waitForTimeout(duration);
  await locator.evaluate((element) => element.classList.remove("rolefit-demo-focus"));
}

async function clickWithFocus(page, locator, pause = 650) {
  await focus(page, locator, 400);
  await locator.click();
  await page.waitForTimeout(pause);
}

async function chooseOptionContaining(select, text) {
  const options = await select.locator("option").evaluateAll((items) => items.map((item) => ({
    label: item.textContent?.trim() || "",
    value: item.value
  })));
  const match = options.find((option) => option.label.toLowerCase().includes(text.toLowerCase()));
  if (!match) throw new Error(`Could not find '${text}' in ${options.map((option) => option.label).join(", ")}`);
  await select.selectOption(match.value);
}

async function selectPlacement(page, panel, value) {
  const checkbox = panel.locator(`.placement-checkbox[value='${value}']`);
  if (!(await checkbox.isChecked())) {
    await checkbox.check();
    await page.waitForTimeout(450);
  }
}

async function openSuggestionMatching(page, pattern) {
  const ids = await page.locator("#pdfPreview .resume-comment-marker").evaluateAll((markers) => [
    ...new Set(markers.map((marker) => marker.getAttribute("data-comment-id")).filter(Boolean))
  ]);
  for (const id of ids) {
    await page.locator(`#pdfPreview .resume-comment-marker[data-comment-id='${id}']`).first().click();
    const panel = page.locator("#activeCommentPanel");
    await panel.waitFor({ state: "visible" });
    if (pattern.test(await panel.innerText())) return panel;
  }
  throw new Error(`Could not find a visible suggestion matching ${pattern}.`);
}

async function resolveAllRemainingSuggestions(page) {
  while (true) {
    const marker = page.locator("#pdfPreview .resume-comment-marker").first();
    if (!(await marker.count())) return;
    await marker.click();
    const panel = page.locator("#activeCommentPanel");
    await panel.waitFor({ state: "visible" });
    await clickWithFocus(page, panel.locator("[data-action='accept']"), 600);
  }
}

async function waitForAiResponse(page, endpoint, action) {
  const responsePromise = page.waitForResponse(
    (response) => response.url().includes(endpoint) && response.request().method() === "POST",
    { timeout: 180_000 }
  );
  await action();
  const response = await responsePromise;
  const payload = await response.json();
  if (!response.ok()) throw new Error(payload.error || `${endpoint} failed with ${response.status()}.`);
  return payload;
}

await mkdir(outputDir, { recursive: true });
const health = await fetch(`${baseUrl}/index.html`);
if (!health.ok) throw new Error(`RoleFit is not available at ${baseUrl}. Start the OpenRouter-backed server first.`);

const playwrightModule = await loadPlaywright();
const chromium = playwrightModule.chromium || playwrightModule.default.chromium;
let browser;
let context;
let page;
let video;
const usedModels = new Set();

try {
  browser = await chromium.launch({
    headless: true,
    ...(getBrowserExecutable() ? { executablePath: getBrowserExecutable() } : {})
  });
  context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
    ...(!validationOnly ? { recordVideo: { dir: outputDir, size: { width: 1440, height: 900 } } } : {})
  });
  page = await context.newPage();
  await page.addInitScript(() => {
    window.__ROLEFIT_TEST__ = true;
    window.print = () => {};
  });
  await page.goto(`${baseUrl}/index.html`);
  await installCaptionOverlay(page);
  await caption(page, "RoleFit Resume Tailor", "A live AI-assisted workflow with every resume change kept under the candidate's control.", 2200);

  await hideCaption(page);
  await page.locator("#resumeInput").fill(resume);
  await page.locator("#jobInput").fill(jobDescription);
  await focus(page, page.locator(".workspace-grid"), 700);
  await caption(page, "Resume and target role", "This fictional candidate is applying for a Senior Revenue Operations Analyst position.", 1800);

  await hideCaption(page);
  const analysisPayload = await waitForAiResponse(page, "/api/analyze", async () => {
    await clickWithFocus(page, page.locator("#analyzeAiBtn"), 350);
  });
  usedModels.add(analysisPayload.model || "unknown");
  await page.waitForFunction(() => document.querySelector("#aiStatus")?.textContent.includes("AI analysis complete"));

  const analysis = page.locator("#analysisOutput");
  await focus(page, analysis, 750);
  await caption(
    page,
    `Live role analysis: ${analysisPayload.model || "configured model"}`,
    "RoleFit separates supported evidence from requirements that still need the candidate's confirmation.",
    2300
  );

  await hideCaption(page);
  const preview = page.locator("#pdfPreviewPanel");
  await preview.scrollIntoViewIfNeeded();
  await page.locator("#pdfPreview [data-preview-pass='suggestions']").click();
  await page.waitForTimeout(500);
  const activePanel = await openSuggestionMatching(page, /PROFESSIONAL SUMMARY|Operations specialist/i);
  await focus(page, activePanel, 750);
  await caption(page, "Review comments beside the resume", "The AI proposes a grounded summary rewrite using evidence already present in the resume.", 2100);

  await hideCaption(page);
  await clickWithFocus(page, activePanel.locator("[data-action='preview']"), 650);
  await caption(page, "Preview before accepting", "The proposed wording is highlighted in place before the candidate decides.", 1700);
  await hideCaption(page);
  await clickWithFocus(page, activePanel.locator("[data-action='accept']"), 650);
  await resolveAllRemainingSuggestions(page);

  await page.locator("#pdfPreview [data-preview-pass='missing_experience']").click();
  const missingPanel = page.locator("#missingExperiencePanel");
  await missingPanel.waitFor({ state: "visible" });
  const missingLabels = await missingPanel.locator(".missing-experience-label-button").allTextContents();
  const normalizedMissingLabels = missingLabels.map((label) => label.trim().toLowerCase()).sort();
  const expectedMissingLabels = ["salesforce", "sql", "tableau"].sort();
  if (JSON.stringify(normalizedMissingLabels) !== JSON.stringify(expectedMissingLabels)) {
    throw new Error(`Unexpected missing-experience items: ${missingLabels.join(", ")}`);
  }
  await focus(page, missingPanel, 700);
  await caption(page, "Missing experience stays a question", "Salesforce, SQL, and Tableau are not added unless the candidate confirms them.", 2100);

  await hideCaption(page);
  await missingPanel.locator(".missing-experience-label-button", { hasText: "Salesforce" }).click();
  const confirmationPanel = page.locator("#activeCommentPanel");
  await confirmationPanel.waitFor({ state: "visible" });
  await selectPlacement(page, confirmationPanel, "skills");
  await selectPlacement(page, confirmationPanel, "experience");
  await chooseOptionContaining(confirmationPanel.locator(".skill-subsection-select"), "Tools & Systems");
  await confirmationPanel.locator("[data-draft-field='skillDraftText']").fill("Salesforce");
  await chooseOptionContaining(confirmationPanel.locator(".experience-entry-select"), "BrightCart");
  await confirmationPanel.locator(".experience-action-select").selectOption("new");
  const experienceDraft = confirmationPanel.locator("[data-draft-field='experienceDraftText']");
  await experienceDraft.fill("I built a Salesforce rule that routed new leads to the right sales representatives and reduced unassigned leads by around 30%.");
  await focus(page, confirmationPanel, 700);
  await caption(page, "The candidate supplies the evidence", "Salesforce is confirmed for Skills and as a new BrightCart experience bullet.", 2100);

  await hideCaption(page);
  const rephrasePayload = await waitForAiResponse(page, "/api/rephrase-experience", async () => {
    await clickWithFocus(page, confirmationPanel.locator("[data-action='rephrase']"), 350);
  });
  usedModels.add(rephrasePayload.model || "unknown");
  await page.waitForFunction(() => document.querySelector("#aiStatus")?.textContent.includes("AI rephrased"));
  await focus(page, experienceDraft, 700);
  await caption(page, "Live AI rephrasing", "RoleFit turns the rough note into a concise bullet without changing the confirmed facts.", 2100);
  await page.screenshot({ path: posterPath, fullPage: false });

  await hideCaption(page);
  await clickWithFocus(page, confirmationPanel.locator("[data-preview-placement='experience']"), 600);
  await caption(page, "Preview the new bullet", "The exact experience addition is highlighted under the selected job.", 1600);
  await hideCaption(page);
  await clickWithFocus(page, confirmationPanel.locator("[data-accept-placement='experience']"), 650);
  await clickWithFocus(page, confirmationPanel.locator("[data-preview-placement='skills']"), 550);
  await clickWithFocus(page, confirmationPanel.locator("[data-accept-placement='skills']"), 650);

  await page.locator("#missingExperiencePanel .missing-experience-label-button", { hasText: "SQL" }).click();
  await confirmationPanel.waitFor({ state: "visible" });
  await selectPlacement(page, confirmationPanel, "skills");
  await chooseOptionContaining(confirmationPanel.locator(".skill-subsection-select"), "Analytics & Reporting");
  await confirmationPanel.locator("[data-draft-field='skillDraftText']").fill("SQL");
  await clickWithFocus(page, confirmationPanel.locator("[data-preview-placement='skills']"), 500);
  await clickWithFocus(page, confirmationPanel.locator("[data-accept-placement='skills']"), 650);
  await caption(page, "Preserve the resume structure", "SQL is placed inside the existing Analytics & Reporting subsection.", 1700);

  await hideCaption(page);
  await page.locator("#missingExperiencePanel .missing-experience-label-button", { hasText: "Tableau" }).click();
  await confirmationPanel.waitFor({ state: "visible" });
  await selectPlacement(page, confirmationPanel, "omit");
  await caption(page, "Reject unsupported requirements", "Tableau remains absent because the candidate did not confirm that experience.", 1700);
  await hideCaption(page);
  await clickWithFocus(page, confirmationPanel.locator("[data-action='accept']"), 700);

  const doneCallout = page.locator("#pdfPreview .done-preview-callout");
  await doneCallout.waitFor({ state: "visible", timeout: 15_000 });
  await doneCallout.locator("[data-action='preview-export-style']").selectOption("modern-blue");
  await doneCallout.locator("[data-action='view-updated-preview']").click();
  await page.waitForTimeout(700);
  await focus(page, page.locator("#pdfPreview .modern-blue-resume"), 850);
  await caption(
    page,
    "Final Modern Blue resume",
    "Supported rewrites and confirmed additions are included. The rejected Tableau claim is not.",
    2600
  );
  await hideCaption(page);
  await page.screenshot({ path: finalScreenshotPath, fullPage: true });

  const finalText = await page.locator("#finalResume").inputValue();
  for (const expected of ["Salesforce", "SQL", "30%", "Tools & Systems", "Analytics & Reporting"]) {
    if (!finalText.includes(expected)) throw new Error(`The live demo final resume is missing: ${expected}`);
  }
  if (/\bTableau\b/i.test(finalText)) throw new Error("The live demo added rejected Tableau experience.");

  video = validationOnly ? null : page.video();
  await writeFile(metadataPath, JSON.stringify({
    recordedAt: new Date().toISOString(),
    baseUrl,
    models: [...usedModels],
    validationOnly,
    liveAnalyzeCall: true,
    liveRephraseCall: true,
    missingExperience: missingLabels,
    assertionsPassed: true
  }, null, 2));
} catch (error) {
  if (page && !page.isClosed()) {
    await page.screenshot({ path: path.join(outputDir, "failed-run.png"), fullPage: true }).catch(() => {});
    const failureState = await page.evaluate(() => ({
      status: document.querySelector("#aiStatus")?.textContent || "",
      openReviewSummary: document.querySelector("#changeCards")?.innerText || "",
      missingExperience: Array.from(document.querySelectorAll("#missingExperiencePanel .missing-experience-label-button"))
        .map((element) => element.textContent?.trim() || "")
    })).catch(() => ({}));
    await writeFile(
      path.join(outputDir, "failed-run.json"),
      JSON.stringify({ message: error.message, ...failureState }, null, 2)
    ).catch(() => {});
  }
  throw error;
} finally {
  if (video && page && context) {
    await page.close();
    await context.close();
    const recordedPath = await video.path();
    if (recordedPath !== videoPath) await rename(recordedPath, videoPath);
  } else if (context) {
    await context.close();
  }
  if (browser) await browser.close();
}

if (!validationOnly) console.log(`Live demo video: ${videoPath}`);
console.log(`${validationOnly ? "Validation" : "Live demo"} final resume: ${finalScreenshotPath}`);
console.log(`Live demo poster: ${posterPath}`);
console.log(`Recording metadata: ${metadataPath}`);
