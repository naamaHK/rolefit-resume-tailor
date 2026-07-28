import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeRegExp(text) {
  return String(text || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function preferredSectionTitle(section) {
  const titles = {
    statement: "Statement",
    summary: "Professional Summary",
    experience: "Experience",
    education: "Education",
    skills: "Skills",
    projects: "Selected Projects"
  };
  return titles[String(section?.title || "").trim().toLowerCase()] || String(section?.title || "");
}

function stripHtmlTags(value) {
  return String(value || "").replace(/<[^>]*>/g, "");
}

function unique(items) {
  return [...new Set(items.filter(Boolean))];
}

const context = { window: {} };
vm.createContext(context);
const source = await readFile(new URL("../src/resume/preview-highlighter.js", import.meta.url), "utf8");
vm.runInContext(source, context, { filename: "src/resume/preview-highlighter.js" });

const highlighter = context.window.RoleFitResumePreviewHighlighter.create({
  escapeHtml,
  escapeRegExp,
  preferredSectionTitle,
  stripHtmlTags,
  unique
});

assert.deepEqual(
  JSON.parse(JSON.stringify(highlighter.getChangedAfterFragments(
    "Built recommendation models for production.",
    "Built Python recommendation models for production."
  ))),
  ["Python"],
  "a one-word insertion should produce only the inserted word"
);

assert.deepEqual(
  JSON.parse(JSON.stringify(highlighter.getChangedAfterFragments(
    "Built recommendation models.",
    "Built recommendation models. Monitored results after launch."
  ))),
  ["Monitored results after launch."],
  "an appended sentence should produce only the appended sentence"
);

assert.deepEqual(
  JSON.parse(JSON.stringify(highlighter.getChangedBeforeFragments(
    "Built legacy recommendation models.",
    "Built recommendation models."
  ))),
  ["legacy"],
  "the before-side diff should identify only removed text"
);

const duplicateTextHtml = `
  <section class="resume-section"><h2>Statement</h2><p>Built Python models.</p></section>
  <section class="resume-section"><h2>Experience</h2><p>Built Python models for production.</p></section>
`;
const sectionScoped = highlighter.highlightFirstMatchInSectionHtml(
  duplicateTextHtml,
  ["Python"],
  "experience"
);
assert.match(
  sectionScoped.html,
  /<h2>Experience<\/h2><p>Built <mark class="resume-preview-highlight">Python<\/mark> models/,
  "section-scoped highlighting should mark the candidate in the requested section"
);
assert.doesNotMatch(
  sectionScoped.html,
  /<h2>Statement<\/h2><p>Built <mark/,
  "section-scoped highlighting must not mark the same word in an earlier section"
);

const classNameHtml = '<p class="Python-example">Used Python for experiments.</p>';
const visibleText = highlighter.highlightFirstMatchInHtml(classNameHtml, ["Python"]);
assert.equal(
  visibleText.html,
  '<p class="Python-example">Used <mark class="resume-preview-highlight">Python</mark> for experiments.</p>',
  "visible-text matching must ignore candidate text inside HTML attributes"
);

const wholeWordHtml = "<p>C++ and C are programming languages.</p>";
const wholeWord = highlighter.highlightFirstWholeWordMatchInHtml(wholeWordHtml, ["C"]);
assert.equal(
  wholeWord.html,
  '<p>C++ and <mark class="resume-preview-highlight">C</mark> are programming languages.</p>',
  "whole-word matching should not select C from inside C++"
);

const multiFragmentBlock = highlighter.highlightCandidatesInsideBlock(
  "<li>Built Python models and deployed them to production.</li>",
  ["Python", "production"]
);
assert.equal(
  multiFragmentBlock.html,
  '<li>Built <mark class="resume-preview-highlight">Python</mark> models and deployed them to <mark class="resume-preview-highlight">production</mark>.</li>',
  "multiple changed fragments in one bullet should all be highlighted"
);

const repeatedBulletHtml = `
  <section class="resume-section"><h2>Experience</h2>
    <h3>Lead Data Analyst</h3>
    <p>Northstar Research</p>
    <li>Built Python models for production.</li>
    <h3>Software Engineering Intern</h3>
    <p>Cedar Research</p>
    <li>Built Python models for production.</li>
  </section>
`;
const anchoredRewrite = highlighter.highlightRewriteDiffInHtml(
  repeatedBulletHtml,
  "experience",
  {
    before: "Built models for production.",
    after: "Built Python models for production."
  },
  ["Python"],
  ["Software Engineering Intern", "Cedar Research"]
);
assert.match(
  anchoredRewrite.html,
  /<p>Cedar Research<\/p>\s*<li>Built <mark class="resume-preview-highlight">Python<\/mark> models/,
  "rewrite highlighting should use the selected entry anchors when bullets are identical"
);
assert.doesNotMatch(
  anchoredRewrite.html,
  /<p>Northstar Research<\/p>\s*<li>Built <mark/,
  "rewrite highlighting must not mutate an identical bullet in an earlier job"
);

const fuzzyHtml = `
  <p>Managed weekly status reports.</p>
  <li>Designed recommendation experiments and evaluated delivery performance.</li>
`;
const fuzzy = highlighter.highlightBestBlockInHtml(
  fuzzyHtml,
  ["recommendation experiments delivery performance"]
);
assert.match(
  fuzzy.html,
  /<li class="resume-preview-highlight">Designed recommendation experiments/,
  "fuzzy matching should select the most relevant resume block"
);

const insertedSectionHtml = `
  <section class="resume-section"><h2>Skills</h2><p>Python • SQL</p></section>
`;
const wholeSection = highlighter.highlightSectionInHtml(insertedSectionHtml, "skills");
assert.match(
  wholeSection.html,
  /resume-preview-section-highlight[\s\S]*<h2>Skills<\/h2>/,
  "a newly inserted section should be wrapped as one highlighted section"
);

const insertedExperienceHtml = `
  <section class="resume-section"><h2>Experience</h2>
    <p>C++ Engineer 2021</p>
    <p>Compiler Labs</p>
    <ul><li>Built compiler tooling in C++.</li></ul>
    <p>Data Analyst 2020</p>
  </section>
`;
const groupedExperience = highlighter.highlightGroupedBlocksInSectionHtml(
  insertedExperienceHtml,
  "experience",
  ["C++ Engineer 2021", "Compiler Labs", "Built compiler tooling in C++."]
);
assert.match(
  groupedExperience.html,
  /resume-preview-entry-highlight[\s\S]*<p>C\+\+ Engineer 2021<\/p>[\s\S]*<p>Compiler Labs<\/p>[\s\S]*<li>Built compiler tooling in C\+\+\.<\/li>/,
  "a new multi-line experience entry should be shown as one grouped highlight"
);
assert.match(
  groupedExperience.html,
  /resume-preview-entry-highlight[\s\S]*<\/div>\s*<p>Data Analyst 2020<\/p>/,
  "the grouped entry highlight must stop before the next experience entry"
);

const repeatedPythonEntryHtml = `
  <section class="resume-section"><h2>Experience</h2>
    <p>Python 2021</p>
    <p>Python</p>
    <ul><li>Something python.</li></ul>
    <p>Data Analyst 2020</p>
    <p>Example AI</p>
    <ul><li>Built models.</li></ul>
  </section>
`;
const repeatedPythonEntries = [
  {
    title: "Python",
    company: "Python",
    years: "2021",
    bullets: ["Something python."]
  },
  {
    title: "Data Analyst",
    company: "Example AI",
    years: "2020",
    bullets: ["Built models."]
  }
];
const strictGroupedPythonEntry = highlighter.highlightGroupedBlocksInSectionHtml(
  repeatedPythonEntryHtml,
  "experience",
  ["Python 2021", "Python", "Something python."]
);
assert.match(
  strictGroupedPythonEntry.html,
  /resume-preview-entry-highlight[\s\S]*<p>Python 2021<\/p>[\s\S]*<p>Python<\/p>[\s\S]*<li>Something python\.<\/li>/,
  "grouped matching should consume distinct lines instead of matching title, company, and bullet to one repeated word"
);

const repeatedPythonEntry = highlighter.highlightExperienceChangeInHtml(
  repeatedPythonEntryHtml,
  "experience",
  repeatedPythonEntries,
  0,
  {
    mode: "entry",
    blockText: "Something python."
  }
);
assert.match(
  repeatedPythonEntry.html,
  /resume-preview-entry-highlight[\s\S]*<p>Python 2021<\/p>[\s\S]*<p>Python<\/p>[\s\S]*<li>Something python\.<\/li>/,
  "a full new Experience entry should include its bullet even when title and company repeat the same word"
);
assert.match(
  repeatedPythonEntry.html,
  /resume-preview-entry-highlight[\s\S]*<\/div>\s*<p>Data Analyst 2020<\/p>/,
  "entry-scoped highlighting should stop before the following job"
);

const repeatedPythonRewriteHtml = repeatedPythonEntryHtml.replace(
  "Something python.",
  "Something python and C++."
);
const repeatedPythonRewrite = highlighter.highlightExperienceChangeInHtml(
  repeatedPythonRewriteHtml,
  "experience",
  [
    {
      ...repeatedPythonEntries[0],
      bullets: ["Something python and C++."]
    },
    repeatedPythonEntries[1]
  ],
  0,
  {
    mode: "diff",
    blockText: "Something python and C++.",
    fragments: ["and C++"]
  }
);
assert.match(
  repeatedPythonRewrite.html,
  /<li>Something python <mark class="resume-preview-highlight">and C\+\+<\/mark>\.<\/li>/,
  "rewriting an Experience bullet should highlight the changed phrase inside the selected job"
);
assert.doesNotMatch(
  repeatedPythonRewrite.html,
  /<p><mark class="resume-preview-highlight">Python<\/mark>/,
  "a repeated title or company must not steal an existing-bullet diff highlight"
);

const designedPythonEntryHtml = `
  <section class="resume-section designed-experience-section"><h2>Experience</h2>
    <article class="designed-entry">
      <div class="entry-main"><h3>Python</h3><p class="entry-company">Python</p></div>
      <div class="entry-years">2021</div>
      <ul class="original-bullets"><li>Something python.</li></ul>
    </article>
    <article class="designed-entry">
      <div class="entry-main"><h3>Data Analyst</h3><p class="entry-company">Example AI</p></div>
      <div class="entry-years">2020</div>
      <ul class="original-bullets"><li>Built models.</li></ul>
    </article>
  </section>
`;
const designedPythonEntry = highlighter.highlightExperienceChangeInHtml(
  designedPythonEntryHtml,
  "experience",
  repeatedPythonEntries,
  0,
  {
    mode: "entry",
    blockText: "Something python."
  }
);
assert.match(
  designedPythonEntry.html,
  /resume-preview-entry-highlight[\s\S]*<article class="designed-entry">[\s\S]*<h3>Python<\/h3>[\s\S]*<li>Something python\.<\/li>[\s\S]*<\/article><\/div>/,
  "the designed template should highlight the complete new Experience article without changing its internal layout"
);
assert.doesNotMatch(
  designedPythonEntry.html.match(/resume-preview-entry-highlight[\s\S]*?<\/article><\/div>/)?.[0] || "",
  /Data Analyst/,
  "the designed entry wrapper must stop before the next job"
);

assert.throws(
  () => context.window.RoleFitResumePreviewHighlighter.create({}),
  /requires escapeHtml/,
  "the module should fail clearly when a required dependency is absent"
);

console.log("Resume preview highlighter tests passed.");
