import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

const sectionAliases = {
  summary: ["professional summary", "summary", "profile", "statement"],
  statement: ["statement", "professional summary", "summary", "profile"],
  experience: ["experience", "professional experience"],
  education: ["education"],
  skills: ["skills", "technical skills"],
  projects: ["projects", "selected projects"]
};

function normalizeSectionLabel(section) {
  return String(section || "").trim().toLowerCase().replace(/^professional\s+/, "").replace(/\s+/g, " ");
}

function getResumeSectionAliases(section) {
  const normalized = normalizeSectionLabel(section);
  return sectionAliases[normalized] || [normalized];
}

function findSectionRange(lines, sectionCandidates) {
  const candidates = sectionCandidates.flatMap(getResumeSectionAliases);
  const knownHeaders = new Set(Object.values(sectionAliases).flat());
  const start = lines.findIndex((line) => candidates.includes(line.trim().toLowerCase()));
  if (start === -1) return null;

  let end = lines.length;
  for (let index = start + 1; index < lines.length; index += 1) {
    if (knownHeaders.has(lines[index].trim().toLowerCase())) {
      end = index;
      break;
    }
  }
  return { start, end };
}

function looksLikeInstructionOnly(text) {
  return /^(move|remove|delete|deemphasize|reorder|place|reformat|format|organize|update|revise|compress)\b/i
    .test(String(text || "").trim());
}

function titleCase(text) {
  return String(text || "")
    .toLowerCase()
    .split(" ")
    .map((word) => word ? word[0].toUpperCase() + word.slice(1) : "")
    .join(" ");
}

const context = { window: {} };
vm.createContext(context);
const source = await readFile(new URL("../src/resume/text-editor.js", import.meta.url), "utf8");
vm.runInContext(source, context, { filename: "src/resume/text-editor.js" });

const editor = context.window.RoleFitResumeTextEditor.create({
  findSectionRange,
  getResumeSectionAliases,
  looksLikeInstructionOnly,
  normalizeSectionLabel,
  titleCase
});

const compacted = editor.compactTextWithMap("A b\nC");
assert.equal(compacted.text, "abc", "compaction should ignore whitespace and case");
assert.deepEqual(
  JSON.parse(JSON.stringify(compacted.map)),
  [0, 2, 4],
  "compaction should retain source indexes for replacement"
);

const wrappedResume = `ALEX

EXPERIENCE
Built customer analytics workflows to improve targeting and optimize
production machine learning models.

EDUCATION
M.Sc. Computer Science`;

assert.equal(
  editor.replaceIgnoringWhitespace(
    wrappedResume,
    "Built customer analytics workflows to improve targeting and optimize production machine learning models.",
    "Improved audience segmentation and production machine learning models."
  ),
  `ALEX

EXPERIENCE
Improved audience segmentation and production machine learning models.

EDUCATION
M.Sc. Computer Science`,
  "a rewrite should match text even when PDF extraction inserted a line break"
);

assert.equal(
  editor.replaceIgnoringWhitespace(wrappedResume, "optimize production", ""),
  wrappedResume.replace("optimize\nproduction", ""),
  "an exact compact span should be removable without changing surrounding text"
);

assert.equal(
  editor.replaceIgnoringWhitespace(wrappedResume, "text that is not present", "replacement"),
  wrappedResume,
  "an unmatched rewrite must leave the resume unchanged"
);

const sectionResume = `ALEX

STATEMENT
Research engineer.

SKILLS
Machine Learning

EXPERIENCE
Data Analyst 2020 - 2024
Example Company`;

assert.equal(
  editor.replaceSectionBody(sectionResume, "skills", "SKILLS\nPython\nSQL"),
  `ALEX

STATEMENT
Research engineer.

SKILLS
Python
SQL
EXPERIENCE
Data Analyst 2020 - 2024
Example Company`,
  "section-body replacement should strip a duplicate heading and preserve neighboring sections"
);

assert.equal(
  editor.replaceResumeSection(sectionResume, "skills", "Python\nSQL"),
  `ALEX

STATEMENT
Research engineer.

SKILLS
Python
SQL
EXPERIENCE
Data Analyst 2020 - 2024
Example Company`,
  "whole-section replacement should retain one canonical section heading"
);

assert.equal(
  editor.replaceResumeSection(sectionResume, "education", "M.Sc. Computer Science 2015 - 2017"),
  `${sectionResume}

EDUCATION
M.Sc. Computer Science 2015 - 2017`,
  "a missing section should be appended as a complete section block"
);

assert.equal(
  editor.replaceResumeSection(sectionResume, "skills", "Move Skills after Education."),
  sectionResume,
  "an instruction must never be inserted as resume content"
);

assert.equal(
  editor.replaceSectionBody(sectionResume, "education", "M.Sc. Computer Science"),
  sectionResume,
  "section-body replacement should be a no-op when the target section is absent"
);

assert.throws(
  () => context.window.RoleFitResumeTextEditor.create({}),
  /requires findSectionRange/,
  "the module should fail clearly when a required dependency is absent"
);

console.log("Resume text editor tests passed.");
