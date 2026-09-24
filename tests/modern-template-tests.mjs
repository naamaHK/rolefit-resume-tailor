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
050-555-0198 alex.morgan@example.com linkedin.com/in/alex-morgan [Google Scholar](https://scholar.google.com/citations?user=example)

STATEMENT
- Research engineer working on machine learning systems.

EXPERIENCE
Senior Research Engineer 2020 - 2024
Northstar Research
- Built production ranking systems.
- Published the implementation on [GitHub](https://github.com/example/ranking-system).
SELECTED RESEARCH PROJECTS
Ranking Quality: Improved offline ranking metrics by 12%.
Search Reliability: Reduced failed queries through anomaly monitoring.
Earlier Technical Experience
Research Intern, Example Labs 2018 - 2019

EDUCATION
M.Sc. in Computer Science 2016 - 2018
Example University

SELECTED PUBLICATIONS & PATENTS
Ranking Systems at Scale 2024
IEEE Conference
A. Morgan, J. Example
https://example.com/paper
Applied Ranking Research 2023
ACM Conference
A. Morgan, B. Example
Patents: Co-inventor on 2 patent applications. [Google Scholar](https://scholar.google.com/citations?user=example)

SKILLS & TECHNOLOGIES
Programming & Tools: Python, SQL, Git
Big Data: Spark, Hadoop
Machine Learning: Ranking, Evaluation, A/B Testing`;

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
  assert.equal(
    await page.locator(".modern-section h2").getByText("SELECTED RESEARCH PROJECTS", { exact: true }).count(),
    0,
    "nested Yahoo projects must not be promoted to a top-level section"
  );
  assert.equal(
    await page.locator(".modern-experience-section .modern-project-subsection h4").innerText(),
    "SELECTED RESEARCH PROJECTS"
  );
  assert.equal(await page.locator(".modern-project-subsection li").count(), 2);
  assert.equal(
    await page.locator(".modern-experience-section .modern-earlier-experience h4").innerText(),
    "EARLIER TECHNICAL EXPERIENCE"
  );
  assert.match(await page.locator(".modern-education-section").innerText(), /M\.Sc\. in Computer Science, Example University/);
  assert.equal(await page.locator(".modern-research-section h2").innerText(), "SELECTED PUBLICATIONS & PATENTS");
  assert.match(await page.locator(".modern-research-section").innerText(), /Ranking Systems at Scale[\s\S]*IEEE Conference[\s\S]*A\. Morgan/);
  assert.equal(await page.locator(".modern-research-entry").count(), 2, "each dated publication must remain a separate entry");
  assert.equal(await page.locator(".modern-patent-summary").count(), 1, "the patent summary must render outside the publication list");
  assert.equal(await page.locator(".modern-research-entry").getByText(/Co-inventor/).count(), 0, "the patent summary must not become a publication bullet");
  assert.deepEqual(
    await page.locator(".modern-skill-groups strong").allTextContents(),
    ["Programming & Tools:", "Big Data:", "Machine Learning:"],
    "Skills subsection labels must remain grouped and highlighted"
  );
  assert.equal(await page.locator(".modern-skill-groups").evaluate((node) => getComputedStyle(node).listStyleType), "square");
  assert.equal(await page.locator(".modern-skill-groups strong").first().evaluate((node) => getComputedStyle(node).color), "rgb(24, 59, 141)");
  assert.equal(await page.locator(".designed-sidebar").count(), 0, "Modern Blue must stay one-column");
  assert.equal(await page.locator(".modern-contact-separator").count(), 3, "contact items must have visible printable separators");
  assert.deepEqual(
    await page.locator(".modern-contact-row a").evaluateAll((links) => links.map((link) => link.getAttribute("href"))),
    [
      "tel:0505550198",
      "mailto:alex.morgan@example.com",
      "https://linkedin.com/in/alex-morgan",
      "https://scholar.google.com/citations?user=example"
    ],
    "phone, email, profile, and Scholar contact items must render as real links"
  );
  assert.equal(
    await page.locator(".modern-experience-section a").getAttribute("href"),
    "https://github.com/example/ranking-system",
    "inline links inside resume content must remain clickable"
  );

  const preservedLinks = await page.evaluate(() => window.__roleFitTest.preservePdfAnnotationLinks(
    "Google Scholar\nDuring this period, developed RoleFit (GitHub).\nPatents: Google Scholar",
    [
      { url: "https://scholar.google.com/citations?user=example" },
      { url: "https://github.com/example/rolefit" },
      { url: "https://scholar.google.com/citations?user=example" }
    ]
  ));
  assert.equal(
    preservedLinks,
    "[Google Scholar](https://scholar.google.com/citations?user=example)\nDuring this period, developed RoleFit ([GitHub](https://github.com/example/rolefit)).\nPatents: [Google Scholar](https://scholar.google.com/citations?user=example)",
    "PDF annotation targets must survive extraction as self-contained resume links"
  );

  console.log("Modern Blue template tests passed");
} finally {
  await browser.close();
}
