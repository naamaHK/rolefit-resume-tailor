import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

function normalize(text) {
  return String(text || "").toLowerCase();
}

function normalizeSectionLabel(section) {
  return String(section || "")
    .trim()
    .toLowerCase()
    .replace(/^professional\s+/, "")
    .replace(/\s+/g, " ");
}

function removeResumePlaceholders(text) {
  return String(text || "")
    .split("\n")
    .filter((line) => !/\b(to be confirmed|per user input|ask user|user should|tbd|todo)\b/i.test(line))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function extractYears(text) {
  const match = String(text || "").match(/\b((?:19|20)\d{2})(?:\s*(?:-|–|—|to)?\s*(Present|present|(?:19|20)\d{2}))?\b/);
  if (!match) return "";
  return match[2] ? `${match[1]} - ${match[2]}` : match[1];
}

function removeYears(text) {
  return String(text || "")
    .replace(/\b(?:19|20)\d{2}(?:\s*(?:-|–|—|to)?\s*(?:Present|present|(?:19|20)\d{2}))?\b/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function stripLeadingBullet(line) {
  return String(line || "").replace(/^[-*•]\s*/, "").trim();
}

function titleCase(text) {
  return String(text || "")
    .toLowerCase()
    .split(" ")
    .map((word) => word ? word[0].toUpperCase() + word.slice(1) : "")
    .join(" ");
}

function isDegreeLine(line) {
  return /\b(B\.?Sc|M\.?Sc|Ph\.?D|Bachelor|Master|Doctorate)\b/i.test(String(line || ""));
}

let parser;

function looksLikeCustomSectionHeaderLine(line) {
  const clean = String(line || "").trim();
  if (!clean || clean.length > 42) return false;
  if (parser?.getResumeSectionNames().has(clean.toLowerCase())) return true;
  if (extractYears(clean)) return false;
  if (/[@:]|https?:\/\//i.test(clean)) return false;
  if (/^[-*•]/.test(clean)) return false;
  if (clean !== clean.toUpperCase()) return false;
  if (clean.split(/\s+/).length > 4) return false;
  return /^[A-Z][A-Z0-9 &/+.-]*$/.test(clean);
}

const context = { window: {} };
vm.createContext(context);
const source = await readFile(new URL("../src/resume/document-parser.js", import.meta.url), "utf8");
vm.runInContext(source, context, { filename: "src/resume/document-parser.js" });

parser = context.window.RoleFitResumeDocument.create({
  extractYears,
  isDegreeLine,
  looksLikeCustomSectionHeaderLine,
  normalize,
  normalizeSectionLabel,
  removeResumePlaceholders,
  removeYears,
  stripLeadingBullet,
  titleCase
});

const parsed = parser.parseResumeText(`ALEX MORGAN
alex.morgan@example.com

STATEMENT
Research engineer.

EXPERIENCE
Software Engineering Intern 2015
Cedar Research
- Built verification tools.

EDUCATION
M.Sc. in Data Science 2013 - 2016
NORTHBRIDGE INSTITUTE

AWARDS
Best Paper Award`);

assert.deepEqual(
  JSON.parse(JSON.stringify(parsed.headerLines)),
  ["ALEX MORGAN", "alex.morgan@example.com"],
  "contact lines before the first section should remain in the header"
);
assert.deepEqual(
  JSON.parse(JSON.stringify(parsed.sections.map((section) => section.title))),
  ["Statement", "Experience", "Education", "Awards"],
  "known and custom section headers should be recognized"
);
assert.ok(
  parsed.sections.find((section) => section.title === "Experience").lines.includes("Cedar Research"),
  "an uppercase company after a dated role must not become a custom section"
);
assert.ok(
  parsed.sections.find((section) => section.title === "Education").lines.includes("NORTHBRIDGE INSTITUTE"),
  "an uppercase institution after a degree must not become a custom section"
);

const cPlusPlusExperience = parser.parseResumeText(`ALEX

EXPERIENCE
C++ 2022
C++
- Built C++ tooling.

EDUCATION
B.Sc. Statistics 2012 - 2016
Example University`);
assert.deepEqual(
  JSON.parse(JSON.stringify(cPlusPlusExperience.sections.map((section) => section.title))),
  ["Experience", "Education"],
  "a C++ company line after a dated C++ role must not become a custom section"
);
assert.deepEqual(
  JSON.parse(JSON.stringify(cPlusPlusExperience.sections[0].lines)),
  ["C++ 2022", "C++", "- Built C++ tooling."],
  "a dated C++ role and company should remain together in Experience"
);

const merged = parser.mergeDuplicateSections([
  { title: "Skills", lines: ["Python", "SQL"] },
  { title: "Technical Skills", lines: ["SQL", "C++"] },
  { title: "Awards", lines: ["Best Paper"] }
]);

assert.deepEqual(
  JSON.parse(JSON.stringify(merged)),
  [
    { title: "Skills", lines: ["Python", "SQL", "C++"] },
    { title: "Awards", lines: ["Best Paper"] }
  ],
  "section aliases should merge without duplicating lines"
);

const ordered = parser.orderSectionsForStructure([
  { title: "Awards", lines: ["Best Paper"] },
  { title: "Education", lines: ["M.Sc."] },
  { title: "Statement", lines: ["Research engineer."] },
  { title: "Experience", lines: ["Data Analyst"] },
  { title: "Skills", lines: ["Python"] }
]);

assert.deepEqual(
  JSON.parse(JSON.stringify(ordered.map((section) => section.title))),
  ["Statement", "Experience", "Education", "Awards", "Skills"],
  "the core section order should be fixed while optional sections keep their relative order"
);

assert.equal(
  parser.serializeResumeText(["ALEX"], ordered),
  `ALEX

STATEMENT
Research engineer.

EXPERIENCE
Data Analyst

EDUCATION
M.Sc.

AWARDS
Best Paper

SKILLS
Python`,
  "serialization should preserve the prepared section order and preferred titles"
);

assert.equal(parser.hasSectionContent({ title: "Skills", lines: ["•", " - "] }), false);
assert.equal(parser.canonicalSectionTitle("Professional Experience"), "experience");
assert.equal(parser.canonicalSectionTitle("Google Scholar Links"), "links");

assert.throws(
  () => context.window.RoleFitResumeDocument.create({}),
  /requires extractYears/,
  "the module should fail clearly when a required dependency is absent"
);

console.log("Document parser tests passed");
