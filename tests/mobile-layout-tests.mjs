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
    if (existsSync(bundledPath)) {
      return import(pathToFileURL(bundledPath).href);
    }
  }

  console.log("Mobile layout tests skipped: Playwright is not available.");
  process.exit(0);
}

async function assertNoHorizontalOverflow(page, label) {
  const metrics = await page.evaluate(() => ({
    innerWidth: window.innerWidth,
    documentWidth: document.documentElement.scrollWidth,
    bodyWidth: document.body.scrollWidth
  }));

  assert.ok(
    metrics.documentWidth <= metrics.innerWidth + 1,
    `${label}: document overflows horizontally (${metrics.documentWidth}px > ${metrics.innerWidth}px)`
  );
  assert.ok(
    metrics.bodyWidth <= metrics.innerWidth + 1,
    `${label}: body overflows horizontally (${metrics.bodyWidth}px > ${metrics.innerWidth}px)`
  );
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

const playwrightModule = await loadPlaywright();
const playwright = playwrightModule.chromium ? playwrightModule : playwrightModule.default;
const { chromium } = playwright;
const systemExecutable = getSystemChromiumExecutable();
const mobileViewport = { width: 360, height: 780 };
let browser;

try {
  browser = await chromium.launch({
    headless: true,
    ...(systemExecutable ? { executablePath: systemExecutable } : {})
  });
} catch (error) {
  console.log(`Mobile layout tests skipped: could not launch a browser. ${error.message}`);
  process.exit(0);
}

const page = await browser.newPage({
  viewport: mobileViewport,
  isMobile: true
});

try {
  await page.addInitScript(() => {
    window.__ROLEFIT_TEST__ = true;
  });

  await page.goto(pathToFileURL(path.resolve("index.html")).href);

  const mobileResume = `050-555-0198 alex.morgan@example.com

STATEMENT
Experienced Lead Data Analyst with a strong track record of leading impactful projects.

EXPERIENCE
Lead Data Analyst 2022
Northstar Research

EDUCATION
B.Sc. Statistics 2009 - 2013
Northbridge University`;

  await page.evaluate((resumeText) => {
    document.querySelector("#resumeInput").value = resumeText;
    document.querySelector("#finalResume").value = "";
    window.__roleFitTest.resetState();
    window.__roleFitTest.refreshResumeCheckPass(resumeText);
  }, mobileResume);

  await page.waitForSelector("#pdfPreviewPanel:not([hidden])");
  await page.waitForSelector(".resume-comment-marker");
  await assertNoHorizontalOverflow(page, "mobile resume-check preview");

  const passTabs = await page.locator(".pass-tab").evaluateAll((tabs) =>
    tabs.map((tab) => {
      const rect = tab.getBoundingClientRect();
      return {
        text: tab.textContent.trim(),
        width: rect.width,
        height: rect.height,
        left: rect.left,
        right: rect.right
      };
    })
  );

  assert.equal(passTabs.length, 3, "mobile should show all three review pass tabs");
  for (const tab of passTabs) {
    assert.ok(tab.width >= 44 && tab.height >= 34, `mobile pass tab should be tappable: ${tab.text}`);
    assert.ok(tab.left >= 0 && tab.right <= mobileViewport.width, `mobile pass tab should fit viewport: ${tab.text}`);
  }

  await page.locator(".resume-comment-marker").first().click();
  await page.waitForSelector("#activeCommentPanel:not([hidden])");
  await assertNoHorizontalOverflow(page, "mobile active comment");

  const stackedLayout = await page.evaluate(() => {
    const workspace = document.querySelector(".preview-workspace");
    const preview = document.querySelector("#pdfPreview");
    const panel = document.querySelector("#activeCommentPanel");
    const workspaceStyle = getComputedStyle(workspace);
    const previewRect = preview.getBoundingClientRect();
    const panelRect = panel.getBoundingClientRect();
    return {
      columns: workspaceStyle.gridTemplateColumns,
      previewRight: previewRect.right,
      panelRight: panelRect.right,
      panelTop: panelRect.top,
      previewTop: previewRect.top,
      previewBottom: previewRect.bottom,
      panelWidth: panelRect.width,
      viewportWidth: window.innerWidth
    };
  });

  assert.equal(
    stackedLayout.columns.trim().split(/\s+/).length,
    1,
    "mobile preview workspace should use one grid column"
  );
  assert.ok(stackedLayout.previewRight <= stackedLayout.viewportWidth + 1, "mobile resume preview should fit viewport");
  assert.ok(stackedLayout.panelRight <= stackedLayout.viewportWidth + 1, "mobile comment panel should fit viewport");
  assert.ok(stackedLayout.panelTop >= stackedLayout.previewTop, "mobile comment panel should not sit to the side of preview");
  assert.ok(stackedLayout.panelWidth >= 300, "mobile comment panel should remain readable");

  const rejectButton = page.locator("#activeCommentPanel [data-action='reject']").first();
  await rejectButton.scrollIntoViewIfNeeded();
  await rejectButton.click();
  await page.waitForSelector(".done-preview-callout");
  await assertNoHorizontalOverflow(page, "mobile done state");

  const doneControls = await page.locator(".done-preview-actions button, .done-preview-actions select").evaluateAll((controls) =>
    controls.map((control) => {
      const rect = control.getBoundingClientRect();
      return {
        text: control.textContent.trim() || control.value,
        width: rect.width,
        height: rect.height,
        left: rect.left,
        right: rect.right
      };
    })
  );
  const viewportWidth = await page.evaluate(() => window.innerWidth);

  assert.ok(doneControls.length >= 4, "mobile done state should show format, preview, export, and review controls");
  for (const control of doneControls) {
    assert.ok(control.height >= 34, `mobile done control should be tappable: ${control.text}`);
    assert.ok(
      control.left >= -1 && control.right <= viewportWidth + 1,
      `mobile done control should fit viewport: ${control.text} (${control.left}-${control.right}, viewport ${viewportWidth})`
    );
  }

  console.log("Mobile layout tests passed");
} finally {
  await browser.close();
}
