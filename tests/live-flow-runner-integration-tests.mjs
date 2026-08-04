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

const emptyMockAiResponse = {
  model: "evaluation-fixture-mock",
  job_analysis: { required_skills: [], preferred_skills: [] },
  change_cards: [],
  user_questions: [],
  final_checks: { keywords_covered: [], keywords_missing: [] }
};

const backendMatchingMockAiResponse = {
  ...emptyMockAiResponse,
  job_analysis: {
    required_skills: ["Computer Science or closely related degree", "TypeScript", "Kubernetes"],
    preferred_skills: ["GraphQL"]
  },
  change_cards: [
    {
      id: "fixture-cs-degree",
      type: "ask_user",
      section: "Missing Evidence",
      related_job_requirement: "Computer Science or closely related degree",
      question: "Do you have a Computer Science or closely related degree?",
      why_it_matters: "The target role requires a related degree.",
      evidence: "No related degree appears in the resume."
    },
    {
      id: "fixture-typescript",
      type: "ask_user",
      section: "Missing Evidence",
      related_job_requirement: "TypeScript",
      question: "Have you used TypeScript?",
      why_it_matters: "The target role requires TypeScript.",
      evidence: "No TypeScript evidence appears in the resume."
    },
    {
      id: "fixture-kubernetes",
      type: "ask_user",
      section: "Missing Evidence",
      related_job_requirement: "Kubernetes",
      question: "Have you operated Kubernetes workloads?",
      why_it_matters: "The target role requires Kubernetes.",
      evidence: "No Kubernetes evidence appears in the resume."
    },
    {
      id: "fixture-graphql",
      type: "ask_user",
      section: "Missing Evidence",
      related_job_requirement: "GraphQL",
      question: "Have you built GraphQL APIs?",
      why_it_matters: "The target role prefers GraphQL.",
      evidence: "No GraphQL evidence appears in the resume."
    }
  ]
};

async function runMockFixture(name, mockResponse) {
  return runLiveFixture(path.resolve(`evaluation/fixtures/${name}`), {
    appUrl: pathToFileURL(path.resolve("index.html")).href,
    skipReachabilityCheck: true,
    mockAiResponse: mockResponse,
    timeoutMs: 10_000
  });
}

try {
  const result = await runMockFixture("001-product-data-analyst-simulation.json", mockAiResponse);
  assert.equal(result.result, "PASS", JSON.stringify({
    grounding_errors: result.grounding_errors,
    structure_errors: result.structure_errors,
    resume_after: result.resume_after
  }, null, 2));
  assert.equal(result.resume_representation_after.combined, 100);
  assert.equal(result.events.filter((event) => event.type === "confirmed_and_added").length, 1);
  assert.equal(result.events.filter((event) => event.type === "declined").length, 2);

  const repairResult = await runMockFixture("002-backend-platform-repair-boundary.json", emptyMockAiResponse);
  assert.equal(repairResult.result, "PASS", JSON.stringify(repairResult, null, 2));
  assert.equal(repairResult.repair_integrity, "PASS");
  assert.equal(repairResult.structure_before, "FAIL");
  assert.equal(repairResult.structure_preservation, "PASS");
  assert.equal(repairResult.events.filter((event) => event.type === "resume_check_applied").length, 4);

  const degreeResult = await runMockFixture("003-backend-platform-implied-degree-and-similar-skill.json", backendMatchingMockAiResponse);
  assert.equal(degreeResult.result, "PASS", JSON.stringify(degreeResult, null, 2));
  assert.equal(degreeResult.resume_representation_after.combined, 100);
  assert.equal(degreeResult.events.filter((event) => event.type === "confirmed_and_added").length, 1);

  const headerResult = await runMockFixture("004-backend-platform-missing-contact-and-typos.json", emptyMockAiResponse);
  assert.equal(headerResult.result, "PASS", JSON.stringify(headerResult, null, 2));
  assert.equal(headerResult.repair_integrity, "PASS");
  assert.equal(headerResult.structure_before, "FAIL");
  assert.equal(headerResult.structure_preservation, "PASS");

  const minimalResult = await runMockFixture("005-backend-platform-minimal-resume.json", emptyMockAiResponse);
  assert.equal(minimalResult.result, "REJECT");
  assert.equal(minimalResult.resume_representation_after.combined, 15);
  console.log("Live flow runner integration test passed.");
} catch (error) {
  if (/Executable doesn't exist|browserType\.launch|Target page, context or browser has been closed/i.test(error.message || "")) {
    console.log("Live flow runner integration test skipped: no usable Playwright browser is available.");
    process.exit(0);
  }
  throw error;
}
