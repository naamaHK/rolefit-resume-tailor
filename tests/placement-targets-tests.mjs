import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

const context = { console };
vm.createContext(context);
const source = await readFile(new URL("../src/resume/placement-targets.js", import.meta.url), "utf8");
vm.runInContext(source, context, { filename: "src/resume/placement-targets.js" });

function normalize(value) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9+#]+/g, " ").trim();
}

function extractYears(value) {
  const match = String(value || "").match(/\b(?:19|20)\d{2}(?:\s*-\s*(?:19|20)\d{2})?/);
  return match ? match[0] : "";
}

function removeYears(value) {
  return String(value || "").replace(/\b(?:19|20)\d{2}(?:\s*-\s*(?:19|20)\d{2})?/, "").replace(/\s+/g, " ").trim();
}

function stripLeadingBullet(value) {
  return String(value || "").replace(/^[-*•]\s*/, "").trim();
}

function findSectionRange(lines, candidates) {
  const aliases = candidates.map(normalize);
  const start = lines.findIndex((line) => aliases.includes(normalize(line)));
  if (start === -1) return null;
  let end = lines.length;
  for (let index = start + 1; index < lines.length; index += 1) {
    if (aliases.includes(normalize(lines[index]))) continue;
    if (/^[A-Z][A-Z ]+$/.test(String(lines[index] || "").trim())) {
      end = index;
      break;
    }
  }
  return { start, end };
}

function parseExperienceEntries(lines) {
  const entries = [];
  for (let index = 0; index < lines.length; index += 1) {
    const titleLine = lines[index];
    if (!extractYears(titleLine)) continue;
    entries.push({
      title: removeYears(titleLine),
      company: lines[index + 1] || "",
      years: extractYears(titleLine),
      bullets: lines[index + 2]?.startsWith("-") ? [stripLeadingBullet(lines[index + 2])] : []
    });
  }
  return entries;
}

function parseEducationEntries(lines) {
  const entries = [];
  for (let index = 0; index < lines.length; index += 1) {
    const degreeLine = lines[index];
    if (!/\b(?:B\.Sc|M\.Sc|Course)\b/.test(degreeLine)) continue;
    entries.push({
      degree: removeYears(degreeLine),
      institution: lines[index + 1] || "",
      years: extractYears(degreeLine),
      details: []
    });
  }
  return entries;
}

const targets = context.RoleFitPlacementTargets.create({
  extractYears,
  findSectionRange,
  normalize,
  parseEducationEntries,
  parseExperienceEntries,
  removeYears,
  stripLeadingBullet
});

const resume = `EXPERIENCE
C++ 2022
C++
- Built C++ tooling.

EDUCATION
Advanced ML Course 2025
Example Institute
M.Sc. in Data Science 2013 - 2016
Northbridge Institute

SELECTED PROJECTS
Evaluation Toolkit 2025
Personal project
- Built an evaluation workflow.`;

assert.equal(
  JSON.stringify(targets.getExperienceTargets(resume).map((target) => [target.title, target.company, target.years])),
  JSON.stringify([["C++", "C++", "2022"]]),
  "Experience target parsing should preserve C++ titles and companies"
);
assert.equal(
  JSON.stringify(targets.getProjectTargets(resume).map((target) => [target.name, target.year, target.bullets])),
  JSON.stringify([["Evaluation Toolkit", "2025", ["Built an evaluation workflow."]]]),
  "Project targets should retain the project label and bullet structure"
);

const educationTargets = targets.getEducationTargets(resume);
const masters = targets.findBySnapshot(educationTargets, {
  degree: "M.Sc. in Data Science",
  institution: "Northbridge Institute",
  years: "2013 - 2016"
}, ["degree", "institution", "years"]);
assert.equal(masters?.degree, "M.Sc. in Data Science", "content snapshots should select the intended education entry after ordering changes");
assert.equal(
  targets.findBySnapshot(educationTargets, { degree: "Unknown" }, ["degree"]),
  null,
  "a missing snapshot must not silently select another target"
);

console.log("Placement target tests passed");
