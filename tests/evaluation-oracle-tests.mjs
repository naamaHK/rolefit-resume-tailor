import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  buildExpectedAfterResume,
  scoreFixtureResult,
  safetyErrors,
  validateFixtureInput
} from "../evaluation/oracle-scorer.mjs";

const fixture = JSON.parse(await readFile(
  new URL("../evaluation/fixtures/001-product-data-analyst-simulation.json", import.meta.url),
  "utf8"
));

validateFixtureInput(fixture);
const expectedAfter = buildExpectedAfterResume(fixture);
const result = scoreFixtureResult(fixture, expectedAfter);

assert.deepEqual(result.profile_job_potential, fixture.oracle.expected.profile_job_potential);
assert.deepEqual(result.resume_representation_before, fixture.oracle.expected.resume_representation_before);
assert.deepEqual(result.resume_representation_after, fixture.oracle.expected.resume_representation_after);
assert.equal(result.grounding_safety, "PASS");
assert.equal(result.structure_preservation, "PASS");

const unsafeResume = `${expectedAfter}\n\nSKILLS\nSQL, Apache Airflow`;
assert.match(
  safetyErrors(fixture, unsafeResume).join("\n"),
  /Unsupported (?:skill|requirement) in final resume: Apache Airflow/,
  "the oracle must reject a skill absent from the hidden profile"
);

console.log("Evaluation oracle tests passed.");
