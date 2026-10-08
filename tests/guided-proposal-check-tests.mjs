import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { checkGuidedProposals } from "../evaluation/guided-proposal-check.mjs";

const fixture = JSON.parse(await readFile(new URL("../evaluation/fixtures/001-product-data-analyst-simulation.json", import.meta.url)));
const state = { requirements: [
  { id: "r1", text: "Experience building and maintaining Tableau dashboards" },
  { id: "r2", text: "Experience with Apache Airflow" }
], proposals: [] };
assert.deepEqual(checkGuidedProposals(fixture, state), {
  expected_additions: ["Tableau dashboards"], missing_proposals: ["Tableau dashboards"], unsupported_proposals: []
});
state.proposals.push({ requirementId: "r1" });
assert.deepEqual(checkGuidedProposals(fixture, state).missing_proposals, []);
state.proposals.push({ requirementId: "r2" });
assert.deepEqual(checkGuidedProposals(fixture, state).unsupported_proposals, ["Apache Airflow"]);
console.log("Guided proposal check tests passed");
