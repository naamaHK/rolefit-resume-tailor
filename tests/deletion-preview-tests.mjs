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
  return String(section?.title || "");
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

const html = `
  <section class="resume-section"><h2>Experience</h2>
    <li>Built recommendation models.</li>
    <li>Documented experiment results.</li>
  </section>
`;
const result = highlighter.highlightBestBlockInSectionHtml(
  html,
  ["Built recommendation models."],
  "experience",
  { threshold: 0.45 }
);

assert.match(
  result.html,
  /<li class="resume-preview-highlight">Built recommendation models\.<\/li>/,
  "a deletion-only rewrite should mark the resulting full sentence or bullet"
);
assert.doesNotMatch(
  result.html,
  /Documented experiment results.*resume-preview-highlight/,
  "the preview must not highlight an unrelated bullet"
);

console.log("Deletion preview tests passed.");
