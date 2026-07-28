import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

function titleCase(value) {
  return String(value || "").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function extractYears(text) {
  const match = String(text || "").match(/\b((?:19|20)\d{2})(?:\s*(?:-|–|—|to)?\s*(Present|present|(?:19|20)\d{2}))?\b/);
  if (!match) return "";
  return match[2] ? `${match[1]} - ${titleCase(match[2])}` : match[1];
}

function removeYears(text) {
  return String(text || "")
    .replace(/\b(?:19|20)\d{2}(?:\s*(?:-|–|—|to)?\s*(?:Present|present|(?:19|20)\d{2}))?\b/g, "")
    .replace(/\s{2,}/g, " ")
    .replace(/\s*,\s*$/, "")
    .trim();
}

function cleanEntryTitle(text) {
  return String(text || "")
    .replace(/\(\s*\)/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function looksLikeInstitutionOrCompany(line) {
  return /\b(University|Institute|Northbridge Institute|Cedar Research|Vertex Research|Research|Media|Inc|Ltd|LLC|Company|School|College)\b/i.test(line);
}

function stripLeadingBullet(line) {
  return String(line || "").replace(/^[-*•]\s*/, "").replace(/^b\s+(?=[A-Z])/i, "").trim();
}

function looksLikeSentence(line) {
  return /\b(and|with|in|to|for|of|the|a|an|by|on|across|during|using)\b/i.test(line) || /[.!?]$/.test(line);
}

const context = { window: {} };
vm.createContext(context);
const source = await readFile(new URL("../src/resume/experience-parser.js", import.meta.url), "utf8");
vm.runInContext(source, context, { filename: "src/resume/experience-parser.js" });

const parser = context.window.RoleFitExperienceParser.create({
  cleanEntryTitle,
  extractYears,
  looksLikeInstitutionOrCompany,
  looksLikeSentence,
  removeYears,
  stripLeadingBullet
});

const entries = parser.parseExperienceEntries([
  "Senior Data Scientist, ShopStream",
  "2020 - 2024",
  "- Built recommendation models.",
  "Data Analyst",
  "MarketPulse",
  "2017 - 2020",
  "- Analyzed customer behavior."
]);

assert.deepEqual(
  JSON.parse(JSON.stringify(entries)),
  [
    {
      title: "Senior Data Scientist",
      company: "ShopStream",
      years: "2020 - 2024",
      rawLine: "Senior Data Scientist, ShopStream",
      bullets: ["Built recommendation models."]
    },
    {
      title: "Data Analyst",
      company: "MarketPulse",
      years: "2017 - 2020",
      rawLine: "Data Analyst",
      bullets: ["Analyzed customer behavior."]
    }
  ],
  "parser should preserve separate roles, companies, years, and bullets"
);

const multilineEntry = parser.parseExperienceEntries([
  "Data Analyst 2017 - 2024",
  "Northstar Research",
  "Built customer analytics workflows to improve",
  "production machine learning models."
]);

assert.deepEqual(
  JSON.parse(JSON.stringify(multilineEntry)),
  [
    {
      title: "Data Analyst",
      company: "Northstar Research",
      years: "2017 - 2024",
      rawLine: "Data Analyst 2017 - 2024",
      bullets: ["Built customer analytics workflows to improve production machine learning models."]
    }
  ],
  "wrapped PDF text should remain one bullet"
);

const missingCompany = parser.parseExperienceEntries([
  "Software Engineering Intern 2015",
  "- Built verification tools."
]);

assert.equal(missingCompany[0].company, "", "missing companies must remain missing");
assert.equal(missingCompany[0].years, "2015", "single-year roles should retain their year");
assert.equal(parser.looksLikeJobTitle("Course Assistant"), true);
assert.equal(parser.looksLikeCompanyLine("Northbridge Institute of Technology"), true);
assert.equal(parser.looksLikeJobTitle("Facilitated Data Fundamentals."), false);

const customTitle = parser.parseExperienceEntries([
  "C something 2022",
  "C something",
  "- Built a C experiment."
]);

assert.deepEqual(
  JSON.parse(JSON.stringify(customTitle)),
  [
    {
      title: "C something",
      company: "C something",
      years: "2022",
      rawLine: "C something 2022",
      bullets: ["Built a C experiment."]
    }
  ],
  "a dated custom title followed by a company line should remain a selectable job entry"
);

const cPlusPlusTitle = parser.parseExperienceEntries([
  "C++ 2022",
  "C++",
  "- Built C++ tooling."
]);

assert.deepEqual(
  JSON.parse(JSON.stringify(cPlusPlusTitle)),
  [
    {
      title: "C++",
      company: "C++",
      years: "2022",
      rawLine: "C++ 2022",
      bullets: ["Built C++ tooling."]
    }
  ],
  "C++ roles and companies should remain selectable Experience entries"
);

assert.throws(
  () => context.window.RoleFitExperienceParser.create({}),
  /requires cleanEntryTitle/,
  "the module should fail clearly when a required dependency is absent"
);

console.log("Experience parser tests passed");
