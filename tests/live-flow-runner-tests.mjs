import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { interactionMatchTerms, runLiveFixture } from "../evaluation/live-flow-runner.mjs";

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

await assert.rejects(
  runLiveFixture(
    new URL("../evaluation/fixtures/002-backend-platform-repair-boundary.json", import.meta.url).pathname,
    { skipReachabilityCheck: true }
  ),
  /not ready for the live runner/,
  "a repair-boundary fixture must stop before it spends a model call"
);

console.log("Live flow runner tests passed.");
