(function attachRoleFitPreviewTarget(global) {
  "use strict";

  function create(dependencies) {
    const { unique, stripHtmlTags } = dependencies || {};
    if (typeof unique !== "function" || typeof stripHtmlTags !== "function") {
      throw new TypeError("Preview target requires unique() and stripHtmlTags().");
    }

    function cleanText(value) {
      return stripHtmlTags(String(value || "")).replace(/\s+/g, " ").trim();
    }

    function cleanCandidates(candidates, minimumLength) {
      return unique((candidates || [])
        .map(cleanText)
        .filter((candidate) => candidate.length >= minimumLength));
    }

    function build({ change, placement = "", candidates = [], rewrite = null, anchors = [] } = {}) {
      if (!change || typeof change !== "object") {
        throw new TypeError("Preview target requires a change object.");
      }

      const before = cleanText(rewrite?.before || change.originalText);
      const after = cleanText(rewrite?.after || change.suggestedText);
      const isRewrite = change.mode === "replace" || change.type === "rewrite";
      const isRemoval = change.mode === "removeOrReplace"
        && (!after || /remove|deemphasize/i.test(after));
      const minimumLength = change.type === "spelling_check" || placement === "skills" ? 1 : 3;

      return Object.freeze({
        change: Object.freeze({ ...change }),
        placement,
        section: String(change.section || "").trim(),
        kind: isRemoval ? "removal" : isRewrite ? "rewrite" : "insertion",
        candidates: Object.freeze(cleanCandidates(candidates, minimumLength)),
        anchors: Object.freeze(cleanCandidates(anchors, minimumLength)),
        rewrite: Object.freeze({ before, after })
      });
    }

    return { build };
  }

  global.RoleFitPreviewTarget = { create };
})(window);
