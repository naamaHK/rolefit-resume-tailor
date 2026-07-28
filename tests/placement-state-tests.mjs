import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";
import path from "node:path";

await import(pathToFileURL(path.resolve("src/resume/placement-flow.js")).href);

const flow = globalThis.RoleFitPlacementFlow.create({
  resolvePlacement: (change) => change.placement || "undecided",
  unique: (values) => [...new Set(values)]
});

const multiple = {
  placement: "experience",
  placements: ["experience", "skills"],
  acceptedPlacements: []
};

assert.deepEqual(flow.getSelectedPlacements(multiple), ["experience", "skills"]);
assert.deepEqual(flow.getPendingSelectedPlacements(multiple), ["experience", "skills"]);

const first = flow.acceptPlacement({
  change: multiple,
  placement: "experience",
  currentResume: "EXPERIENCE\nData Analyst",
  validate: () => ({}),
  apply: () => "EXPERIENCE\nData Analyst\n- Added Python work.",
  normalize: (text) => String(text).trim()
});
assert.equal(first.ok, true);
assert.equal(first.status, "partial");
assert.deepEqual(first.acceptedPlacements, ["experience"]);
assert.equal(first.singlePlacementChange.placements.join(","), "experience");

const second = flow.acceptPlacement({
  change: { ...multiple, acceptedPlacements: first.acceptedPlacements },
  placement: "skills",
  currentResume: first.appliedResume,
  validate: () => ({}),
  apply: () => "EXPERIENCE\nData Analyst\n- Added Python work.\n\nSKILLS\nPython",
  normalize: (text) => String(text).trim()
});
assert.equal(second.ok, true);
assert.equal(second.status, "accepted");
assert.deepEqual(second.acceptedPlacements, ["experience", "skills"]);
assert.deepEqual(flow.getPlacementsToApply({ ...multiple, acceptedPlacements: second.acceptedPlacements }), ["experience", "skills"]);

const invalid = flow.acceptPlacement({
  change: multiple,
  placement: "experience",
  currentResume: "resume",
  validate: () => ({ error: "Choose an existing job." }),
  apply: () => "changed",
  normalize: (text) => String(text).trim()
});
assert.equal(invalid.ok, false);
assert.equal(invalid.error, "Choose an existing job.");

const unchanged = flow.acceptPlacement({
  change: multiple,
  placement: "experience",
  currentResume: "resume",
  validate: () => ({}),
  apply: () => "resume",
  normalize: (text) => String(text).trim()
});
assert.equal(unchanged.ok, false);
assert.match(unchanged.error, /no longer available/i);

console.log("Placement state tests passed.");
