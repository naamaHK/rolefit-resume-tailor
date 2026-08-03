import assert from "node:assert/strict";
import { loadEvaluationFixture } from "./fixture-loader.mjs";
import {
  buildExpectedAfterResume,
  formatScore,
  scoreFixtureResult,
  validateFixtureInput
} from "./oracle-scorer.mjs";

const fixturePath = process.argv[2];
if (!fixturePath) throw new Error("Usage: node evaluation/run-fixture.mjs <fixture.json>");

const fixture = await loadEvaluationFixture(fixturePath);
validateFixtureInput(fixture);
const after = buildExpectedAfterResume(fixture);
const result = scoreFixtureResult(fixture, after);

assert.deepEqual(result.profile_job_potential, fixture.oracle.expected.profile_job_potential);
assert.deepEqual(result.resume_representation_before, fixture.oracle.expected.resume_representation_before);
assert.deepEqual(result.resume_representation_after, fixture.oracle.expected.resume_representation_after);
assert.equal(result.structure_preservation, fixture.oracle.expected.structure_preservation);
assert.equal(result.grounding_safety, fixture.oracle.expected.grounding_safety);

console.log(`Evaluation fixture: ${fixture.id}`);
console.log("RoleFit receives: resume_before + ordinary job description only");
console.log(`Profile–job potential: Basic ${formatScore(result.profile_job_potential.basic)} | Preferred ${formatScore(result.profile_job_potential.preferred)} | Combined ${formatScore(result.profile_job_potential.combined)}`);
console.log(`Resume representation before: Basic ${formatScore(result.resume_representation_before.basic)} | Preferred ${formatScore(result.resume_representation_before.preferred)} | Combined ${formatScore(result.resume_representation_before.combined)}`);
console.log(`Resume representation after: Basic ${formatScore(result.resume_representation_after.basic)} | Preferred ${formatScore(result.resume_representation_after.preferred)} | Combined ${formatScore(result.resume_representation_after.combined)} | Delta +${result.resume_representation_after.delta}`);
console.log(`Grounding Safety: ${result.grounding_safety}`);
console.log(`Structure Preservation: ${result.structure_preservation}`);
console.log("Fixture validation: PASS");
