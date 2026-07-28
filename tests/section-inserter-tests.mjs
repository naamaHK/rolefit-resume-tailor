import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

const context = { console };
vm.createContext(context);
const source = await readFile(new URL("../src/resume/section-inserter.js", import.meta.url), "utf8");
vm.runInContext(source, context, { filename: "src/resume/section-inserter.js" });

function extractYears(value) {
  const match = String(value || "").match(/\b(?:19|20)\d{2}(?:\s*-\s*(?:19|20)\d{2}|\s*-\s*Present)?/);
  return match ? match[0] : "";
}

function stripLeadingBullet(value) {
  return String(value || "").replace(/^[-*•]\s*/, "").trim();
}

function normalize(value) {
  return String(value || "").toLowerCase().replace(/[^a-z]+/g, " ").trim();
}

function findSectionRange(lines, candidates) {
  const expected = candidates.map(normalize);
  const start = lines.findIndex((line) => expected.includes(normalize(line)));
  if (start === -1) return null;
  let end = lines.length;
  for (let index = start + 1; index < lines.length; index += 1) {
    if (/^[A-Z][A-Z ]+$/.test(String(lines[index] || "").trim())) {
      end = index;
      break;
    }
  }
  return { start, end };
}

const inserter = context.RoleFitSectionInserter.create({
  extractYears,
  findSectionRange,
  stripLeadingBullet
});

const resume = [
  "STATEMENT",
  "Research engineer.",
  "",
  "EXPERIENCE",
  "Senior Engineer 2017 - 2024",
  "Example Co",
  "",
  "EDUCATION",
  "B.Sc. in Statistics 2009 - 2013",
  "Example University"
].join("\n");

assert.match(
  inserter.insertBlockIntoSection(resume, ["projects", "selected projects"], "Selected Projects", ["RoleFit 2026", "- Built a resume tool."]),
  /EDUCATION[\s\S]*Example University\n\nSELECTED PROJECTS\nRoleFit 2026\n- Built a resume tool\./,
  "a missing optional section should be created after Education"
);

const dated = inserter.insertDatedBlockIntoSection(
  `${resume}\n\nSELECTED PROJECTS\nOlder Project 2022\n- Earlier work.`,
  ["projects", "selected projects"],
  "Selected Projects",
  ["Newer Project 2025", "- Later work."]
);
assert.match(
  dated,
  /SELECTED PROJECTS\nNewer Project 2025\n- Later work\.\nOlder Project 2022/,
  "dated sections should keep new entries in reverse chronological order"
);
assert.equal(inserter.getYearSortValue("2019 - Present"), 9999, "Present should sort above completed years");

console.log("Section inserter tests passed");
