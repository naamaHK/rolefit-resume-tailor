(function attachResumeSectionInserter(global) {
  "use strict";

  function create(dependencies) {
    const { extractYears, findSectionRange, stripLeadingBullet } = dependencies || {};
    const required = { extractYears, findSectionRange, stripLeadingBullet };

    for (const [name, dependency] of Object.entries(required)) {
      if (typeof dependency !== "function") {
        throw new TypeError(`Section inserter requires ${name}().`);
      }
    }

    function cleanBlock(blockLines) {
      return (blockLines || []).map((line) => String(line || "").trim()).filter(Boolean);
    }

    function getYearSortValue(text) {
      const raw = String(text || "");
      if (/\bPresent\b/i.test(raw)) return 9999;
      const years = Array.from(raw.matchAll(/\b((?:19|20)\d{2})\b/g)).map((match) => Number(match[1]));
      return years.length ? Math.max(...years) : -Infinity;
    }

    function isDatedEntryStartLine(line) {
      const clean = stripLeadingBullet(String(line || ""));
      return Boolean(clean && !/^[-*•]/.test(line) && extractYears(clean));
    }

    function insertBlockIntoSection(text, sectionCandidates, sectionTitle, blockLines) {
      const lines = String(text || "").split("\n");
      const range = findSectionRange(lines, sectionCandidates);
      const clean = cleanBlock(blockLines);
      if (!clean.length) return text;

      if (range) {
        lines.splice(range.end, 0, ...clean);
        return lines.join("\n");
      }

      const educationRange = findSectionRange(lines, ["education"]);
      const insertAt = educationRange ? educationRange.end : lines.length;
      lines.splice(insertAt, 0, "", String(sectionTitle || "").toUpperCase(), ...clean, ...(insertAt < lines.length ? [""] : []));
      return lines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
    }

    function insertDatedBlockIntoSection(text, sectionCandidates, sectionTitle, blockLines) {
      const lines = String(text || "").split("\n");
      const range = findSectionRange(lines, sectionCandidates);
      const clean = cleanBlock(blockLines);
      if (!clean.length) return text;
      if (!range) return insertBlockIntoSection(text, sectionCandidates, sectionTitle, clean);

      const newSort = getYearSortValue(clean[0]);
      let insertAt = range.end;
      for (let index = range.start + 1; index < range.end; index += 1) {
        if (!isDatedEntryStartLine(lines[index])) continue;
        if (newSort > getYearSortValue(lines[index])) {
          insertAt = index;
          break;
        }
      }

      lines.splice(insertAt, 0, ...clean);
      return lines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
    }

    return Object.freeze({
      getYearSortValue,
      insertBlockIntoSection,
      insertDatedBlockIntoSection,
      isDatedEntryStartLine
    });
  }

  global.RoleFitSectionInserter = Object.freeze({ create });
})(typeof window !== "undefined" ? window : globalThis);
