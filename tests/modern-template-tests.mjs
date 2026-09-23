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
const page = await browser.newPage({ viewport: { width: 1180, height: 1480 } });

try {
  await page.addInitScript(() => { window.__ROLEFIT_TEST__ = true; });
  await page.goto(pathToFileURL(path.resolve("index.html")).href);

  const resume = `ALEX MORGAN
alex.morgan@example.com | 050-555-0198 | linkedin.com/in/alex-morgan

STATEMENT
- Research engineer working on machine learning systems.

EXPERIENCE
Senior Research Engineer 2020 - 2024
Northstar Research
- Built production ranking systems.

EDUCATION
M.Sc. in Computer Science 2016 - 2018
Example University

PUBLICATIONS
Ranking Systems at Scale 2024
IEEE Conference
A. Morgan, J. Example
https://example.com/paper

SKILLS
Machine Learning - Python - SQL`;

  await page.evaluate((text) => {
    document.querySelector("#resumeInput").value = text;
    document.querySelector("#finalResume").value = text;
    document.querySelector("#exportStyleSelect").value = "modern-blue";
    window.__roleFitTest.renderNumberedCommentPreview();
  }, resume);

  assert.equal(await page.locator("#exportStyleSelect").inputValue(), "modern-blue");
  assert.equal(await page.locator("#pdfPreview").evaluate((node) => node.classList.contains("modern-blue-template")), true);
  assert.equal(await page.locator(".modern-blue-resume").count(), 1);
  assert.equal(await page.locator(".modern-resume-header h1").innerText(), "ALEX MORGAN");
  assert.equal(await page.locator(".modern-section h2").first().innerText(), "PROFESSIONAL SUMMARY");
  assert.match(await page.locator(".modern-experience-section").innerText(), /Northstar Research.*Senior Research Engineer/s);
  assert.match(await page.locator(".modern-education-section").innerText(), /M\.Sc\. in Computer Science, Example University/);
  assert.match(await page.locator(".modern-research-section").innerText(), /Ranking Systems at Scale[\s\S]*IEEE Conference[\s\S]*A\. Morgan/);
  assert.equal(await page.locator(".designed-sidebar").count(), 0, "Modern Blue must stay one-column");

  console.log("Modern Blue template tests passed");
} finally {
  await browser.close();
}
