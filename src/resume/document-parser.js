(function attachResumeDocumentParser(global) {
  "use strict";

  function create(dependencies) {
    const {
      extractYears,
      isDegreeLine,
      looksLikeCustomSectionHeaderLine,
      normalize,
      normalizeSectionLabel,
      removeResumePlaceholders,
      removeYears,
      stripLeadingBullet,
      titleCase
    } = dependencies || {};

    const required = {
      extractYears,
      isDegreeLine,
      looksLikeCustomSectionHeaderLine,
      normalize,
      normalizeSectionLabel,
      removeResumePlaceholders,
      removeYears,
      stripLeadingBullet,
      titleCase
    };

    for (const [name, dependency] of Object.entries(required)) {
      if (typeof dependency !== "function") {
        throw new TypeError(`Resume document parser requires ${name}().`);
      }
    }

    function getResumeSectionNames() {
      return new Set([
        "professional summary",
        "profile",
        "statement",
        "summary",
        "skills",
        "technical skills",
        "experience",
        "professional experience",
        "selected projects",
        "projects",
        "education",
        "publication",
        "publications",
        "patent",
        "patents",
        "certifications",
        "volunteer experience",
        "volunteer work",
        "volunteering",
        "language",
        "languages",
        "achievement",
        "achievements",
        "achievment",
        "achievments",
        "strengths",
        "user-confirmed additions"
      ]);
    }

    function canonicalSectionTitle(title) {
      const normalized = normalizeSectionLabel(title);
      if (["statement", "summary", "professional summary", "profile"].includes(normalized)) return "summary";
      if (["experience", "professional experience"].includes(normalized)) return "experience";
      if (normalized === "education") return "education";
      if (["skills", "technical skills"].includes(normalized)) return "skills";
      if (normalized === "publications" || normalized === "publication") return "publications";
      if (normalized === "patents" || normalized === "patent") return "patents";
      if (normalized === "strengths") return "strengths";
      if (["achievements", "achievement", "achievments", "achievment"].includes(normalized)) return "achievements";
      if (normalized === "languages" || normalized === "language") return "languages";
      if (normalized === "projects" || normalized === "selected projects") return "projects";
      if (normalized === "certifications" || normalized === "certification") return "certifications";
      if (["volunteer experience", "volunteer work", "volunteering"].includes(normalized)) return "volunteer_experience";
      if (normalized.includes("google scholar") || normalized.includes("portfolio") || normalized.includes("links")) return "links";
      return normalized;
    }

    function parseResumeText(text) {
      const lines = removeResumePlaceholders(text).split("\n").map((line) => line.trim()).filter(Boolean);
      const sectionNames = getResumeSectionNames();

      const headerLines = [];
      const sections = [];
      let currentSection = null;
      let firstSectionSeen = false;

      for (const line of lines) {
        const lower = line.toLowerCase();
        const isKnownSection = sectionNames.has(lower);
        const currentCanonical = currentSection ? canonicalSectionTitle(currentSection.title) : "";
        const previousSectionLine = currentSection?.lines[currentSection.lines.length - 1] || "";
        const followsEntryTitle = currentCanonical === "experience"
          ? Boolean(
            extractYears(previousSectionLine)
            // Short custom titles such as "C++ 2022" are valid Experience
            // entries too. Their following uppercase company line must not be
            // mistaken for a new custom section heading.
            && removeYears(previousSectionLine).trim().length <= 80
            && !/[.!?]$/.test(removeYears(previousSectionLine).trim())
          )
          : currentCanonical === "education" && isDegreeLine(previousSectionLine);
        const isUppercaseEntryContent = ["experience", "education"].includes(currentCanonical)
          && /^[A-Z][A-Z0-9&.' +#-]{1,45}$/.test(line)
          && followsEntryTitle
          && !isKnownSection;
        const isSection = isKnownSection || (firstSectionSeen && looksLikeCustomSectionHeaderLine(line) && !isUppercaseEntryContent);

        if (!firstSectionSeen && !isSection) {
          headerLines.push(line);
          continue;
        }

        if (isSection) {
          firstSectionSeen = true;
          currentSection = { title: titleCase(line), lines: [] };
          sections.push(currentSection);
          continue;
        }

        if (!currentSection) {
          currentSection = { title: "Summary", lines: [] };
          sections.push(currentSection);
        }

        currentSection.lines.push(line);
      }

      return { headerLines, sections };
    }

    function hasSectionContent(section) {
      return section.lines.some((line) => {
        const clean = stripLeadingBullet(line)
          .replace(/[-–—|•·]/g, "")
          .trim();
        return clean.length > 0;
      });
    }

    function removeEmptySections(sections) {
      return sections.filter(hasSectionContent);
    }

    function preferredSectionTitle(section) {
      const canonical = canonicalSectionTitle(section.title);
      const preferred = {
        summary: section.title,
        experience: "Experience",
        education: "Education",
        skills: "Skills",
        publications: "Publications",
        patents: "Patents",
        strengths: "Strengths",
        achievements: "Achievements",
        languages: "Languages",
        projects: "Selected Projects",
        "selected projects": "Selected Projects",
        certifications: "Certifications",
        volunteer_experience: "Volunteer Experience",
        links: section.title
      };
      return preferred[canonical] || section.title;
    }

    function mergeDuplicateSections(sections) {
      const merged = [];
      const byCanonical = new Map();

      for (const section of sections) {
        const canonical = canonicalSectionTitle(section.title);
        const existing = byCanonical.get(canonical);

        if (!existing) {
          const copy = {
            title: preferredSectionTitle(section),
            lines: [...section.lines]
          };
          merged.push(copy);
          byCanonical.set(canonical, copy);
          continue;
        }

        const existingLines = new Set(existing.lines.map((line) => normalize(line)));
        for (const line of section.lines) {
          if (existingLines.has(normalize(line))) continue;
          existing.lines.push(line);
          existingLines.add(normalize(line));
        }
      }

      return merged;
    }

    function orderSectionsForStructure(sections) {
      const fixedOrder = ["summary", "experience", "education"];
      const remaining = [...sections];
      const ordered = [];

      for (const key of fixedOrder) {
        const index = remaining.findIndex((section) => canonicalSectionTitle(section.title) === key);
        if (index !== -1) ordered.push(...remaining.splice(index, 1));
      }

      return [...ordered, ...remaining];
    }

    function serializeResumeText(headerLines, sections) {
      const blocks = [
        headerLines.join("\n"),
        ...sections.map((section) => [preferredSectionTitle(section).toUpperCase(), ...section.lines].join("\n"))
      ].filter((block) => block.trim());

      return blocks.join("\n\n").replace(/\n{3,}/g, "\n\n").trim();
    }

    return Object.freeze({
      canonicalSectionTitle,
      getResumeSectionNames,
      hasSectionContent,
      mergeDuplicateSections,
      orderSectionsForStructure,
      parseResumeText,
      preferredSectionTitle,
      removeEmptySections,
      serializeResumeText
    });
  }

  global.RoleFitResumeDocument = Object.freeze({ create });
})(typeof window !== "undefined" ? window : globalThis);
