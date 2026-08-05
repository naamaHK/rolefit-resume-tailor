import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  buildExpectedAfterResume,
  scoreFixtureResult,
  safetyErrors,
  validateFixtureInput
} from "../evaluation/oracle-scorer.mjs";
import { loadEvaluationFixture } from "../evaluation/fixture-loader.mjs";

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

const groupedSkillResume = expectedAfter.replace(
  "SQL, Python, A/B testing, product analytics, cohort analysis, cross-functional collaboration, stakeholder communication, Google Analytics 4",
  "A/B Testing • product analytics • cohort analysis • cross-functional collaboration • stakeholder communication • Google Analytics 4\nProgramming Languages: SQL • Python"
);
assert.deepEqual(
  safetyErrors(fixture, groupedSkillResume),
  [],
  "grouped Skills lines should be checked as individual skills"
);

const unsafeResume = `${expectedAfter}\n\nSKILLS\nSQL, Apache Airflow`;
assert.match(
  safetyErrors(fixture, unsafeResume).join("\n"),
  /Unsupported (?:skill|requirement) in final resume: Apache Airflow/,
  "the oracle must reject a skill absent from the hidden profile"
);

const relatedFixturePaths = [
  "002-backend-platform-repair-boundary.json",
  "003-backend-platform-implied-degree-and-similar-skill.json",
  "004-backend-platform-missing-contact-and-typos.json",
  "005-backend-platform-minimal-resume.json",
  "006-backend-platform-seven-year-gap.json",
  "007-backend-platform-related-degree-present.json"
];

for (const fixtureName of relatedFixturePaths) {
  const relatedFixture = await loadEvaluationFixture(
    new URL(`../evaluation/fixtures/${fixtureName}`, import.meta.url).pathname
  );
  const relatedResult = scoreFixtureResult(relatedFixture, buildExpectedAfterResume(relatedFixture));
  assert.deepEqual(relatedResult.profile_job_potential, relatedFixture.oracle.expected.profile_job_potential);
  assert.deepEqual(relatedResult.resume_representation_before, relatedFixture.oracle.expected.resume_representation_before);
  assert.deepEqual(relatedResult.resume_representation_after, relatedFixture.oracle.expected.resume_representation_after);
  assert.equal(relatedResult.grounding_safety, relatedFixture.oracle.expected.grounding_safety);
  assert.equal(relatedResult.repair_integrity, "PASS");
  assert.equal(relatedResult.structure_preservation, relatedFixture.oracle.expected.structure_preservation);
}

console.log("Evaluation oracle tests passed.");
