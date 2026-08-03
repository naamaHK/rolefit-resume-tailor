import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { runLiveFixture } from "../evaluation/live-flow-runner.mjs";

const browserCandidates = [
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Chromium.app/Contents/MacOS/Chromium",
  "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
  "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser"
];
const bundledPlaywright = path.join(
  homedir(),
  ".cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.js"
);

if (!browserCandidates.some(existsSync) && !existsSync(bundledPlaywright)) {
  console.log("Live flow runner integration test skipped: no usable Playwright browser is available.");
  process.exit(0);
}

const mockAiResponse = {
  model: "evaluation-fixture-mock",
  job_analysis: {
    required_skills: ["Tableau"],
    preferred_skills: ["Apache Airflow", "dbt"]
  },
  change_cards: [
    {
      id: "fixture-tableau",
      type: "ask_user",
      section: "Missing Evidence",
      related_job_requirement: "Tableau dashboards",
      question: "Have you built Tableau dashboards?",
      why_it_matters: "The target role lists Tableau dashboards.",
      evidence: "No Tableau evidence appears in the resume."
    },
    {
      id: "fixture-airflow",
      type: "ask_user",
      section: "Missing Evidence",
      related_job_requirement: "Apache Airflow",
      question: "Have you used Apache Airflow?",
      why_it_matters: "The target role lists Apache Airflow.",
      evidence: "No Apache Airflow evidence appears in the resume."
    },
    {
      id: "fixture-dbt",
      type: "ask_user",
      section: "Missing Evidence",
      related_job_requirement: "dbt",
      question: "Have you used dbt?",
      why_it_matters: "The target role lists dbt.",
      evidence: "No dbt evidence appears in the resume."
    }
  ],
  user_questions: [],
  final_checks: { keywords_covered: [], keywords_missing: ["Tableau", "Apache Airflow", "dbt"] }
};

try {
  const result = await runLiveFixture(
    path.resolve("evaluation/fixtures/001-product-data-analyst-simulation.json"),
    {
      appUrl: pathToFileURL(path.resolve("index.html")).href,
      skipReachabilityCheck: true,
      mockAiResponse,
      timeoutMs: 10_000
    }
  );
  assert.equal(result.result, "PASS");
  assert.equal(result.resume_representation_after.combined, 100);
  assert.equal(result.events.filter((event) => event.type === "confirmed_and_added").length, 1);
  assert.equal(result.events.filter((event) => event.type === "declined").length, 2);
  console.log("Live flow runner integration test passed.");
} catch (error) {
  if (/Executable doesn't exist|browserType\.launch|Target page, context or browser has been closed/i.test(error.message || "")) {
    console.log("Live flow runner integration test skipped: no usable Playwright browser is available.");
    process.exit(0);
  }
  throw error;
}
