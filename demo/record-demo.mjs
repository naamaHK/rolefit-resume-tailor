import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, readdir, rename } from "node:fs/promises";
import net from "node:net";
import { homedir } from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputDir = path.join(rootDir, "docs", "demo");
const videoPath = path.join(outputDir, "rolefit-demo.webm");
const posterPath = path.join(outputDir, "rolefit-demo-poster.png");

const resume = `JORDAN LEE
050-555-0142 | jordan.lee@example.com | linkedin.com/in/jordan-lee

PROFESSIONAL SUMMARY
Operations specialist with experience supporting sales and customer teams.

EXPERIENCE
Operations Analyst 2021 - Present
BrightCart
- Prepared weekly sales and customer reports.
- Maintained CRM workflows and account records.
- Redesigned the customer onboarding process, reducing setup time by 18%.
- Coordinated reporting requirements across sales, finance, and customer success.

Customer Support Coordinator 2018 - 2021
HarborDesk
- Managed customer requests and escalations.
- Created internal documentation for recurring support processes.

EDUCATION
B.A. in Business Administration 2015 - 2018
Lakeview University

SKILLS
- Analytics & Reporting: Advanced Excel, Google Sheets
- Operations: Process Improvement, Customer Onboarding, Documentation
- Tools & Systems: Jira, Zendesk`;

const jobDescription = `Senior Revenue Operations Analyst

Responsibilities
- Analyze sales pipeline, revenue, and customer-retention data.
- Build recurring reports and dashboards for business stakeholders.
- Improve CRM workflows and data quality.
- Automate recurring operational reporting.
- Partner with sales, finance, and customer-success teams.

Required Qualifications
- Advanced Excel
- Salesforce
- SQL

Preferred Qualifications
- Tableau`;

const modelResponse = {
  model: "demo/verified-response",
  job_analysis: {
    target_title: "Senior Revenue Operations Analyst",
    seniority: "Senior",
    required_skills: ["Advanced Excel", "Salesforce", "SQL"],
    preferred_skills: ["Tableau"],
    responsibilities: [
      "Analyze revenue and retention data.",
      "Improve CRM workflows and automate reporting.",
      "Partner with cross-functional stakeholders."
    ],
    keywords: ["Salesforce", "SQL", "Tableau"],
    hidden_priorities: []
  },
  resume_analysis: {
    strongest_relevant_evidence: [
      "Reduced customer onboarding setup time by 18%.",
      "Coordinated reporting across sales, finance, and customer success."
    ],
    weak_or_missing_signals: ["Salesforce", "SQL", "Tableau"],
    irrelevant_or_lower_priority_content: [],
    risk_flags: []
  },
  tailoring_strategy: {
    emphasize: ["reporting", "process improvement", "cross-functional operations"],
    deemphasize: [],
    do_not_claim_without_confirmation: ["Salesforce", "SQL", "Tableau"]
  },
  change_cards: [
    {
      id: "demo-summary-rewrite",
      type: "rewrite",
      section: "Professional Summary",
      original_text: "Operations specialist with experience supporting sales and customer teams.",
      suggested_text: "Operations analyst with six years of experience improving reporting, customer onboarding, and cross-functional workflows, including an 18% reduction in setup time.",
      why_it_helps: "Connects the candidate's supported results to the target role.",
      evidence: "Operations roles from 2018 to present; onboarding setup time reduced by 18%.",
      risk_level: "low",
      support_level: "resume_supported"
    }
  ],
  user_questions: [],
  final_checks: {
    keywords_covered: ["Advanced Excel"],
    keywords_missing: ["Salesforce", "SQL", "Tableau"],
    unsupported_claims: [],
    risk_flags: []
  }
};

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

async function startServer(port) {
  const child = spawn(process.execPath, ["server.mjs"], {
    cwd: rootDir,
    env: {
      ...process.env,
      HOST: "127.0.0.1",
      PORT: String(port),
      OPENROUTER_API_KEY: "demo-placeholder-key"
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

async function findPlaywrightFfmpeg() {
  const cacheRoots = [
    path.join(homedir(), "Library/Caches/ms-playwright"),
    path.join(homedir(), ".cache/ms-playwright")
  ];

  for (const cacheRoot of cacheRoots) {
    let entries = [];
    try {
      entries = await readdir(cacheRoot, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries.filter((item) => item.isDirectory() && item.name.startsWith("ffmpeg-")).reverse()) {
      for (const binaryName of ["ffmpeg-mac", "ffmpeg-linux", "ffmpeg.exe"]) {
        const candidate = path.join(cacheRoot, entry.name, binaryName);
        if (existsSync(candidate)) return candidate;
      }
    }
  }

  return "";
}

async function compressVideoForGitHub(sourcePath) {
  const ffmpeg = await findPlaywrightFfmpeg();
  if (!ffmpeg) return;
  const compactPath = path.join(outputDir, "rolefit-demo-compact.webm");
  const args = [
    "-i", sourcePath,
    "-vf", "scale=1152:720",
    "-c:v", "libvpx",
    "-b:v", "480k",
    "-deadline", "good",
    "-cpu-used", "2",
    "-an",
    "-y",
    compactPath
  ];

  await new Promise((resolve, reject) => {
    const child = spawn(ffmpeg, args, { stdio: "ignore" });
    child.once("error", reject);
    child.once("exit", (code) => code === 0
      ? resolve()
      : reject(new Error(`Could not compress the demo video. ffmpeg exited with code ${code}.`)));
  });
  await rename(compactPath, sourcePath);
}

async function installDemoOverlay(page) {
  await page.evaluate(() => {
    const style = document.createElement("style");
    style.textContent = `
      #rolefit-demo-caption {
        position: fixed;
        left: 50%;
        bottom: 28px;
        transform: translateX(-50%);
        z-index: 99999;
        width: min(860px, calc(100vw - 48px));
        padding: 16px 22px;
        border: 1px solid rgba(255, 255, 255, 0.18);
        border-radius: 8px;
        background: rgba(18, 28, 42, 0.94);
        box-shadow: 0 16px 38px rgba(15, 23, 42, 0.3);
        color: #fff;
        font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        text-align: center;
        opacity: 0;
        transition: opacity 180ms ease;
        pointer-events: none;
      }
      #rolefit-demo-caption.visible { opacity: 1; }
      #rolefit-demo-caption strong {
        display: block;
        margin-bottom: 3px;
        color: #7dd3c7;
        font-size: 19px;
        letter-spacing: 0;
      }
      #rolefit-demo-caption span {
        display: block;
        font-size: 15px;
        line-height: 1.35;
      }
      .rolefit-demo-focus {
        outline: 4px solid rgba(21, 128, 116, 0.48) !important;
        outline-offset: 5px !important;
        transition: outline-color 180ms ease;
      }
    `;
    document.head.append(style);
    const caption = document.createElement("div");
    caption.id = "rolefit-demo-caption";
    caption.innerHTML = "<strong></strong><span></span>";
    document.body.append(caption);
  });
}

async function caption(page, title, detail, duration = 1800) {
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
  await page.waitForTimeout(250);
}

async function focus(page, locator, duration = 650) {
  await locator.scrollIntoViewIfNeeded();
  await locator.evaluate((element) => element.classList.add("rolefit-demo-focus"));
  await page.waitForTimeout(duration);
  await locator.evaluate((element) => element.classList.remove("rolefit-demo-focus"));
}

async function clickWithFocus(page, locator, pause = 700) {
  await focus(page, locator, 450);
  await locator.click();
  await page.waitForTimeout(pause);
}

async function selectPlacement(page, panel, value) {
  const checkbox = panel.locator(`.placement-checkbox[value='${value}']`);
  if (!(await checkbox.isChecked())) await checkbox.check();
  await page.waitForTimeout(500);
}

const playwrightModule = await loadPlaywright();
const playwright = playwrightModule.chromium ? playwrightModule : playwrightModule.default;
await mkdir(outputDir, { recursive: true });
const port = await reservePort();
const server = await startServer(port);
let browser;
let context;
let page;
let video;

try {
  browser = await playwright.chromium.launch({
    headless: true,
    ...(getSystemChromiumExecutable() ? { executablePath: getSystemChromiumExecutable() } : {})
  });
  context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
    recordVideo: {
      dir: outputDir,
      size: { width: 1440, height: 900 }
    }
  });
  page = await context.newPage();
  await page.addInitScript(() => {
    window.__ROLEFIT_TEST__ = true;
    window.print = () => {};
  });
  await page.route("**/api/analyze", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify(modelResponse)
  }));
  await page.route("**/api/rephrase-experience", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({
      model: "demo/verified-response",
      bullet: "- Automated Salesforce lead routing, reducing unassigned leads by approximately 30% and accelerating sales follow-up."
    })
  }));

  await page.goto(`http://127.0.0.1:${port}/index.html`);
  await installDemoOverlay(page);
  await caption(
    page,
    "RoleFit Resume Tailor",
    "Evidence-grounded tailoring with every change kept under the candidate's control.",
    2500
  );

  const resumeInput = page.locator("#resumeInput");
  const jobInput = page.locator("#jobInput");
  await resumeInput.fill(resume);
  await jobInput.fill(jobDescription);
  await hideCaption(page);
  await focus(page, resumeInput, 650);
  await focus(page, jobInput, 650);
  await caption(page, "Start with the evidence", "Compare a real resume with one target job description.", 1700);

  await hideCaption(page);
  await clickWithFocus(page, page.locator("#analyzeAiBtn"), 900);
  await page.waitForFunction(() => document.querySelector("#aiStatus")?.textContent.includes("AI analysis complete"));
  const analysis = page.locator("#analysisOutput");
  await focus(page, analysis, 800);
  await caption(page, "Map the role", "RoleFit separates requirements already supported from experience that still needs confirmation.", 2300);

  await hideCaption(page);
  await clickWithFocus(page, page.locator("#suggestionsPassBtn"));
  const summaryCard = page.locator("#changeCards [data-change-id='demo-summary-rewrite']");
  await focus(page, summaryCard, 900);
  await caption(page, "Strengthen supported evidence", "The summary recommendation uses only experience and results already present in the resume.", 2200);
  await hideCaption(page);
  await clickWithFocus(page, summaryCard.locator("[data-action='preview']"), 900);
  await focus(page, page.locator("#pdfPreview .resume-preview-highlight").first(), 800);
  await caption(page, "Preview before accepting", "The exact change is highlighted in the resume.", 1800);
  await hideCaption(page);
  await clickWithFocus(page, summaryCard.locator("[data-action='accept']"), 850);

  await clickWithFocus(page, page.locator("#missingExperiencePassBtn"), 700);
  const missingPanel = page.locator("#missingExperiencePanel");
  await focus(page, missingPanel, 900);
  await caption(page, "Confirm missing experience", "Only three concrete requirements remain: Salesforce, SQL, and Tableau.", 2200);
  await hideCaption(page);

  await clickWithFocus(
    page,
    missingPanel.locator(".missing-experience-label-button", { hasText: "Salesforce" }),
    700
  );
  const activePanel = page.locator("#activeCommentPanel");
  await selectPlacement(page, activePanel, "skills");
  await selectPlacement(page, activePanel, "experience");

  await activePanel.locator(".skill-subsection-select").selectOption({ label: "Tools & Systems" });
  await activePanel.locator("[data-draft-field='skillDraftText']").fill("Salesforce");
  await activePanel.locator(".experience-action-select").selectOption("new");
  const experienceDraft = activePanel.locator("[data-draft-field='experienceDraftText']");
  await experienceDraft.fill("");
  await experienceDraft.pressSequentially(
    "I made a Salesforce rule that assigned new leads to the right salespeople and reduced unassigned leads by around 30%.",
    { delay: 20 }
  );
  await focus(page, experienceDraft, 700);
  await caption(page, "Write the facts in your own words", "The candidate supplies the evidence. RoleFit does not invent it.", 2100);

  await hideCaption(page);
  await clickWithFocus(page, activePanel.locator("[data-action='rephrase']"), 800);
  await page.waitForFunction(() => document.querySelector("#aiStatus")?.textContent.includes("AI rephrased"));
  await focus(page, experienceDraft, 850);
  await caption(page, "AI Rephrase", "The rough note becomes a concise resume bullet while preserving the confirmed metric.", 2300);
  await page.screenshot({ path: posterPath, fullPage: false });

  await hideCaption(page);
  await clickWithFocus(page, activePanel.locator("[data-preview-placement='experience']"), 850);
  await focus(page, page.locator("#pdfPreview .resume-preview-highlight").first(), 750);
  await caption(page, "Check the placement", "The new bullet is previewed under the selected BrightCart role.", 1800);
  await hideCaption(page);
  await clickWithFocus(page, activePanel.locator("[data-accept-placement='experience']"), 800);
  await clickWithFocus(page, activePanel.locator("[data-preview-placement='skills']"), 750);
  await caption(page, "Preserve the resume structure", "Salesforce is added to the existing Tools & Systems subsection.", 1800);
  await hideCaption(page);
  await clickWithFocus(page, activePanel.locator("[data-accept-placement='skills']"), 850);

  await clickWithFocus(
    page,
    missingPanel.locator(".missing-experience-label-button", { hasText: "SQL" }),
    650
  );
  await selectPlacement(page, activePanel, "skills");
  await activePanel.locator(".skill-subsection-select").selectOption({ label: "Analytics & Reporting" });
  await activePanel.locator("[data-draft-field='skillDraftText']").fill("SQL");
  await clickWithFocus(page, activePanel.locator("[data-preview-placement='skills']"), 650);
  await clickWithFocus(page, activePanel.locator("[data-accept-placement='skills']"), 800);
  await caption(page, "Add only confirmed skills", "SQL is placed in Analytics & Reporting, without flattening the Skills section.", 1900);

  await hideCaption(page);
  await clickWithFocus(
    page,
    missingPanel.locator(".missing-experience-label-button", { hasText: "Tableau" }),
    650
  );
  await selectPlacement(page, activePanel, "omit");
  await caption(page, "Reject unsupported claims", "The candidate has not used Tableau, so it stays out of the resume.", 1800);
  await hideCaption(page);
  await clickWithFocus(page, activePanel.locator("[data-action='accept']"), 900);

  const finalResume = page.locator("#finalResume");
  const doneCallout = page.locator("#pdfPreview .done-preview-callout");
  await doneCallout.waitFor({ state: "visible" });
  await doneCallout.locator("[data-action='preview-export-style']").selectOption("designed");
  await clickWithFocus(page, doneCallout.locator("[data-action='view-updated-preview']"), 900);
  const updatedPreview = page.locator("#pdfPreview");
  await updatedPreview.scrollIntoViewIfNeeded();
  await focus(page, updatedPreview, 900);
  await caption(
    page,
    "A tailored resume, still truthful",
    "Supported evidence is emphasized, confirmed experience is added, and unsupported experience is rejected.",
    3000
  );
  await hideCaption(page);
  await page.waitForTimeout(500);

  const finalText = await finalResume.inputValue();
  const expected = [
    "Operations analyst with six years of experience",
    "Automated Salesforce lead routing",
    "Analytics & Reporting: Advanced Excel, Google Sheets, SQL",
    "Tools & Systems: Jira, Zendesk, Salesforce"
  ];
  for (const value of expected) {
    if (!finalText.includes(value)) throw new Error(`Demo did not produce expected resume text: ${value}`);
  }
  if (/\bTableau\b/i.test(finalText)) throw new Error("Demo incorrectly added unsupported Tableau experience.");

  video = page.video();
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
  await stopProcess(server);
}

await compressVideoForGitHub(videoPath);
console.log(`Demo video: ${videoPath}`);
console.log(`Demo poster: ${posterPath}`);
