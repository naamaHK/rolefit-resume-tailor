import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { interactionMatchTerms } from "../evaluation/live-flow-runner.mjs";
import { loadEvaluationFixture } from "../evaluation/fixture-loader.mjs";

const fixture = JSON.parse(await readFile(
  new URL("../evaluation/fixtures/001-product-data-analyst-simulation.json", import.meta.url),
  "utf8"
));

assert.deepEqual(
  interactionMatchTerms(fixture, fixture.oracle.interactions[0]),
  ["tableau dashboards", "tableau"],
  "the live runner should match the human job requirement and its canonical identifier"
);
assert.deepEqual(
  interactionMatchTerms(fixture, fixture.oracle.interactions[1]),
  ["apache airflow", "airflow"],
  "the runner should use the job requirement when locating a question card"
);
assert.equal(
  fixture.oracle.interactions[0].placement.target_match,
  "Product Data Analyst",
  "a live fixture should use a stable Experience target match instead of a rendered dropdown label"
);

const repairFixture = await loadEvaluationFixture(
  new URL("../evaluation/fixtures/002-backend-platform-repair-boundary.json", import.meta.url).pathname
);
assert.equal(repairFixture.oracle.resume_check_interactions.length, 4);
assert.equal(
  repairFixture.test_metadata.live_runner_status,
  undefined,
  "a repair fixture should be runnable once the runner can drive Resume Check cards"
);

console.log("Live flow runner tests passed.");
