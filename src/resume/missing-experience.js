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
        specs.push({
          key: dedupeKey,
          label,
          promptText: `Do you have real, resume-worthy experience with ${label}?`,
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
