(function attachResumePlacementTargets(global) {
  "use strict";

  function create(dependencies) {
    const {
      extractYears,
      findSectionRange,
      normalize,
      parseEducationEntries,
      parseExperienceEntries,
      removeYears,
      stripLeadingBullet
    } = dependencies || {};

    const required = {
      extractYears,
      findSectionRange,
      normalize,
      parseEducationEntries,
      parseExperienceEntries,
      removeYears,
      stripLeadingBullet
    };

    for (const [name, dependency] of Object.entries(required)) {
      if (typeof dependency !== "function") {
        throw new TypeError(`Placement targets require ${name}().`);
      }
    }

    function getSectionLines(resumeText, sectionCandidates) {
      const lines = String(resumeText || "").split("\n");
      const range = findSectionRange(lines, sectionCandidates);
      return range ? lines.slice(range.start + 1, range.end) : [];
    }

    function getExperienceTargets(resumeText) {
      return parseExperienceEntries(getSectionLines(resumeText, ["experience", "professional experience"])).map((entry, index) => ({
        key: `experience-${index}`,
        index,
        title: entry.title || "Untitled role",
        company: entry.company || "Unknown company",
        years: entry.years || "",
        bullets: entry.bullets || [],
        label: [entry.title || "Untitled role", entry.company || "Unknown company", entry.years].filter(Boolean).join(" - ")
      }));
    }

    function getEducationTargets(resumeText) {
      return parseEducationEntries(getSectionLines(resumeText, ["education"])).map((entry, index) => ({
        key: `education-${index}`,
        index,
        degree: entry.degree || "Untitled education",
        institution: entry.institution || "",
        years: entry.years || "",
        details: entry.details || [],
        label: [entry.degree || "Untitled education", entry.institution, entry.years].filter(Boolean).join(" - ")
      }));
    }

    function parseProjectEntries(lines) {
      const entries = [];
      let current = null;

      function pushCurrent() {
        if (current) entries.push(current);
        current = null;
      }

      for (const rawLine of lines || []) {
        const line = String(rawLine || "").trim();
        if (!line) continue;
        if (/^\s*[-*•]\s+/.test(line)) {
          const clean = stripLeadingBullet(line);
          const colon = clean.indexOf(":");
          const name = colon > 0 ? clean.slice(0, colon).trim() : "";
          const detail = colon > 0 ? clean.slice(colon + 1).trim() : "";
          if (name && detail && name.length <= 100) {
            pushCurrent();
            current = { name: removeYears(name).trim() || name, year: extractYears(name), label: "", bullets: [detail], rawLine: line };
            continue;
          }
          if (!current) current = { name: "Project", year: "", label: "", bullets: [], rawLine: "" };
          current.bullets.push(clean);
          continue;
        }

        if (/^(?:Context|Type|Source)\s*:\s*/i.test(line)) {
          if (!current) current = { name: "Project", year: "", label: "", bullets: [], rawLine: "" };
          current.label = line.replace(/^(?:Context|Type|Source)\s*:\s*/i, "").trim();
          continue;
        }

        if (current?.bullets.length && (!/[.!?]$/.test(current.bullets.at(-1)) || /^[a-z0-9]/.test(line))) {
          current.bullets[current.bullets.length - 1] = `${current.bullets.at(-1)} ${line}`.replace(/\s+/g, " ").trim();
          continue;
        }

        if (current && !current.label && !current.bullets.length && !extractYears(line)) {
          current.label = line;
          continue;
        }

        pushCurrent();
        current = {
          name: removeYears(line).trim() || line,
          year: extractYears(line),
          label: "",
          bullets: [],
          rawLine: line
        };
      }

      pushCurrent();
      return entries;
    }

    function getProjectTargets(resumeText) {
      return parseProjectEntries(getSectionLines(resumeText, ["selected research projects", "selected projects", "projects"])).map((entry, index) => ({
        key: `project-${index}`,
        index,
        name: entry.name || "Untitled project",
        year: entry.year || "",
        label: entry.label || "",
        bullets: entry.bullets || [],
        rawLine: entry.rawLine || "",
        labelText: [entry.name || "Untitled project", entry.year].filter(Boolean).join(" - ")
      }));
    }

    function findBySnapshot(targets, snapshot, fields) {
      const expected = Object.fromEntries(
        fields.map((field) => [field, normalize(snapshot?.[field] || "")])
      );
      if (!Object.values(expected).some(Boolean)) return null;

      return (targets || []).find((target) => fields.every((field) => (
        !expected[field] || normalize(target?.[field] || "") === expected[field]
      ))) || null;
    }

    return Object.freeze({
      findBySnapshot,
      getEducationTargets,
      getExperienceTargets,
      getProjectTargets,
      parseProjectEntries
    });
  }

  global.RoleFitPlacementTargets = Object.freeze({ create });
})(typeof window !== "undefined" ? window : globalThis);
