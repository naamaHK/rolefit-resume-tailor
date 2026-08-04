import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { interactionMatchTerms, profileLookupForResumeCheckCard } from "../evaluation/live-flow-runner.mjs";
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

const backendFixture = await loadEvaluationFixture(
  new URL("../evaluation/fixtures/005-backend-platform-minimal-resume.json", import.meta.url).pathname
);
assert.deepEqual(
  profileLookupForResumeCheckCard(
    backendFixture.profile,
    "Missing Header: Full Name",
    backendFixture.oracle.auto_profile_lookup
  ),
  { field: "name", value: "Maya Cohen", source: "profile.basic_info.name" },
  "the runner may copy an explicit header value from the hidden profile"
);
assert.deepEqual(
  profileLookupForResumeCheckCard(
    backendFixture.profile,
    "Confirm Years: Experience\nEntry: Backend Engineer at CivicFlow",
    backendFixture.oracle.auto_profile_lookup
  ),
  { field: "dates", value: "2022–Present", source: "profile entry dates" },
  "the runner may copy dates only when one profile entry is explicitly identified"
);
assert.deepEqual(
  profileLookupForResumeCheckCard(
    backendFixture.profile,
    "Missing Required Field: Institution\nEntry: B.Sc. Computer Information Systems",
    backendFixture.oracle.auto_profile_lookup
  ),
  {
    field: "institution",
    value: "Northern Israel Institute of Technology",
    source: "profile.education.institution"
  },
  "the runner may copy one identified education field without inventing it"
);
assert.equal(
  profileLookupForResumeCheckCard(
    backendFixture.profile,
    "Do you have resume-worthy experience with Kubernetes?",
    backendFixture.oracle.auto_profile_lookup
  ),
  null,
  "the runner must not infer a job skill from the profile"
);

console.log("Live flow runner tests passed.");
