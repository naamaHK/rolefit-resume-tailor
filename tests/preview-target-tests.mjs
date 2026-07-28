import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

const context = { window: {} };
vm.createContext(context);
const source = await readFile(new URL("../src/resume/preview-target.js", import.meta.url), "utf8");
vm.runInContext(source, context, { filename: "src/resume/preview-target.js" });

const targetBuilder = context.window.RoleFitPreviewTarget.create({
  unique: (items) => [...new Set(items)],
  stripHtmlTags: (value) => String(value).replace(/<[^>]*>/g, "")
});

const target = targetBuilder.build({
  change: { type: "rewrite", mode: "replace", section: "Experience", originalText: "Used Python.", suggestedText: "Built Python services." },
  placement: "experience",
  candidates: ["Built Python services.", "Built Python services.", "x"],
  anchors: ["Data Scientist", ""]
});

assert.equal(target.kind, "rewrite");
assert.equal(target.section, "Experience");
assert.deepEqual([...target.candidates], ["Built Python services."]);
assert.deepEqual([...target.anchors], ["Data Scientist"]);
assert.equal(target.rewrite.before, "Used Python.");
assert.equal(target.rewrite.after, "Built Python services.");
assert.throws(() => targetBuilder.build(), /requires a change object/);

console.log("Preview target tests passed");
