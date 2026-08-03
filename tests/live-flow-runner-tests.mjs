import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { interactionMatchTerms } from "../evaluation/live-flow-runner.mjs";

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

console.log("Live flow runner tests passed.");
