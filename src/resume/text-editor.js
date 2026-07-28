(function attachResumeTextEditor(global) {
  "use strict";

  function create(dependencies) {
    const {
      findSectionRange,
      getResumeSectionAliases,
      looksLikeInstructionOnly,
      normalizeSectionLabel,
      titleCase
    } = dependencies || {};

    const required = {
      findSectionRange,
      getResumeSectionAliases,
      looksLikeInstructionOnly,
      normalizeSectionLabel,
      titleCase
    };

    for (const [name, dependency] of Object.entries(required)) {
      if (typeof dependency !== "function") {
        throw new TypeError(`Resume text editor requires ${name}().`);
      }
    }

    function compactTextWithMap(text) {
      const source = String(text || "");
      const chars = [];
      const map = [];

      for (let index = 0; index < source.length; index += 1) {
        const char = source[index];
        if (/\s/.test(char)) continue;
        chars.push(char.toLowerCase());
        map.push(index);
      }

      return { text: chars.join(""), map };
    }

    function replaceIgnoringWhitespace(output, originalText, suggestedText) {
      const source = String(output || "");
      const haystack = compactTextWithMap(source);
      const needle = compactTextWithMap(originalText).text;
      if (!needle) return source;

      const compactIndex = haystack.text.indexOf(needle);
      if (compactIndex === -1) return source;

      const start = haystack.map[compactIndex];
      const end = haystack.map[compactIndex + needle.length - 1] + 1;
      return `${source.slice(0, start)}${String(suggestedText ?? "")}${source.slice(end)}`;
    }

    function stripSectionHeaderFromReplacement(section, text) {
      const aliases = getResumeSectionAliases(section);
      const lines = String(text || "").split("\n").map((line) => line.trim()).filter(Boolean);
      if (lines.length && aliases.includes(normalizeSectionLabel(lines[0]))) {
        return lines.slice(1).join("\n").trim();
      }
      return String(text || "").trim();
    }

    function replaceSectionBody(output, section, replacementText) {
      const source = String(output || "");
      const cleanReplacement = stripSectionHeaderFromReplacement(section, replacementText);
      if (!cleanReplacement) return source;

      const lines = source.split("\n");
      const range = findSectionRange(lines, [section]);
      if (!range) return source;

      lines.splice(range.start + 1, range.end - range.start - 1, ...cleanReplacement.split("\n"));
      return lines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
    }

    function replaceResumeSection(output, section, replacementText) {
      const source = String(output || "");
      const cleanReplacement = String(replacementText || "").trim();
      if (!cleanReplacement || looksLikeInstructionOnly(cleanReplacement)) return source;

      const lines = source.split("\n");
      const range = findSectionRange(lines, [section]);
      const sectionTitle = titleCase(getResumeSectionAliases(section)[0] || section);
      const replacementLines = cleanReplacement.split("\n").map((line) => line.trimEnd());
      const startsWithHeader = replacementLines[0]
        && normalizeSectionLabel(replacementLines[0]) === normalizeSectionLabel(sectionTitle);
      const block = startsWithHeader ? replacementLines : [sectionTitle.toUpperCase(), ...replacementLines];

      if (!range) {
        return `${source.trim()}\n\n${block.join("\n")}`;
      }

      lines.splice(range.start, range.end - range.start, ...block);
      return lines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
    }

    return Object.freeze({
      compactTextWithMap,
      replaceIgnoringWhitespace,
      replaceResumeSection,
      replaceSectionBody,
      stripSectionHeaderFromReplacement
    });
  }

  global.RoleFitResumeTextEditor = Object.freeze({ create });
})(typeof window !== "undefined" ? window : globalThis);
