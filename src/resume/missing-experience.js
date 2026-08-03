(function attachMissingExperience(global) {
  "use strict";

  function create(dependencies) {
    const { normalize } = dependencies || {};
    if (typeof normalize !== "function") {
      throw new TypeError("Missing experience requires normalize().");
    }

    function buildQuestionSpecs(requirements) {
      const seen = new Set();
      const specs = [];

      for (const requirement of requirements || []) {
        const key = String(requirement?.key || "").trim();
        const label = String(requirement?.display || "").trim();
        const dedupeKey = normalize(key || label);
        if (!dedupeKey || !label || seen.has(dedupeKey)) continue;
        seen.add(dedupeKey);
        const promptText = key === "relevant-research-background"
          ? "Do you have research experience in Computer Science, Computer Engineering, Machine Learning, or a closely related field? If yes, briefly name the field and project."
          : `Do you have real, resume-worthy experience with ${label}?`;
        specs.push({
          key: dedupeKey,
          label,
          promptText,
          relatedRequirement: label,
          whyItMatters: "This concrete requirement appears in the target job but is not currently supported by the resume."
        });
      }

      return specs;
    }

    return Object.freeze({ buildQuestionSpecs });
  }

  global.RoleFitMissingExperience = Object.freeze({ create });
})(typeof window !== "undefined" ? window : globalThis);
