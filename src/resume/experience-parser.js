(function attachExperienceParser(global) {
  "use strict";

  function create(dependencies) {
    const {
      cleanEntryTitle,
      extractYears,
      looksLikeInstitutionOrCompany,
      looksLikeSentence,
      removeYears,
      stripLeadingBullet
    } = dependencies || {};

    const required = {
      cleanEntryTitle,
      extractYears,
      looksLikeInstitutionOrCompany,
      looksLikeSentence,
      removeYears,
      stripLeadingBullet
    };

    for (const [name, dependency] of Object.entries(required)) {
      if (typeof dependency !== "function") {
        throw new TypeError(`Experience parser requires ${name}().`);
      }
    }

    function splitTitleAndCompany(line) {
      const cleaned = removeYears(String(line || "").replace(/^[-*•]\s*/, ""));
      if (cleaned.includes("|")) {
        const [title, ...companyParts] = cleaned.split("|");
        return {
          title: cleanEntryTitle(title),
          company: companyParts.join("|").trim()
        };
      }
      if (cleaned.includes(",")) {
        const [title, ...companyParts] = cleaned.split(",");
        return {
          title: cleanEntryTitle(title),
          company: companyParts.join(",").trim()
        };
      }
      return { title: cleanEntryTitle(cleaned), company: "" };
    }

    function looksLikeJobTitle(line) {
      const clean = removeYears(stripLeadingBullet(String(line || "")));
      if (!clean || clean.length > 80) return false;
      if (looksLikeInstitutionOrCompany(clean)) return false;
      if (/[.!?]$/.test(clean)) return false;
      return /\b(Engineer|Scientist|Assistant|Intern|Developer|Programmer|Researcher|Analyst|Manager|Lead|Director|Student)\b/i.test(clean);
    }

    function looksLikeCompanyLine(line) {
      const clean = stripLeadingBullet(String(line || ""));
      if (!clean || extractYears(clean)) return false;
      if (looksLikeInstitutionOrCompany(clean)) return true;
      return clean.length <= 45 && !looksLikeSentence(clean) && /^[A-Z0-9][A-Za-z0-9\s.&+#-]+$/.test(clean);
    }

    function addEntryBullet(entry, line) {
      const clean = String(line || "").replace(/^[-*•]\s*/, "").trim();
      if (!clean) return;

      const last = entry.bullets[entry.bullets.length - 1];
      const shouldMerge = last && !/[.!?]$/.test(last) && !/^[-*•]/.test(line);

      if (shouldMerge) {
        entry.bullets[entry.bullets.length - 1] = `${last} ${clean}`;
      } else {
        entry.bullets.push(clean);
      }
    }

    function isLikelyExperienceRole(line, nextLine) {
      const clean = stripLeadingBullet(String(line || ""));
      if (!clean) return false;
      if (extractYears(clean) && /\b(Engineer|Scientist|Assistant|Intern|Developer|Programmer|Researcher|Analyst|Manager|Lead|Director|Student)\b/i.test(clean)) return true;
      if (
        extractYears(clean)
        && nextLine
        && looksLikeCompanyLine(nextLine)
        && !looksLikeSentence(removeYears(clean))
      ) {
        return true;
      }
      if (looksLikeJobTitle(clean) && extractYears(clean)) return true;
      if (looksLikeJobTitle(clean) && nextLine && (extractYears(nextLine) || looksLikeCompanyLine(nextLine))) return true;
      if (clean.includes(",") && nextLine && extractYears(nextLine) && !looksLikeSentence(clean)) return true;
      return false;
    }

    function parseExperienceEntries(lines) {
      const entries = [];
      let current = null;

      function pushCurrent() {
        if (current && (current.title || current.company || current.bullets.length)) {
          entries.push(current);
        }
      }

      for (let index = 0; index < lines.length; index += 1) {
        const line = lines[index];
        const nextLine = lines[index + 1] || "";
        const cleanLine = stripLeadingBullet(line);

        if (!current || isLikelyExperienceRole(line, nextLine)) {
          pushCurrent();
          const split = splitTitleAndCompany(cleanLine);
          current = {
            title: split.title,
            company: split.company,
            years: extractYears(cleanLine),
            rawLine: cleanLine,
            bullets: []
          };
          continue;
        }

        if (extractYears(cleanLine) && !current.years && removeYears(cleanLine).length <= 4) {
          current.years = extractYears(cleanLine);
          continue;
        }

        if (!current.company && looksLikeCompanyLine(cleanLine)) {
          current.company = cleanLine;
          continue;
        }

        addEntryBullet(current, cleanLine);
      }

      pushCurrent();
      return entries;
    }

    return Object.freeze({
      isLikelyExperienceRole,
      looksLikeCompanyLine,
      looksLikeJobTitle,
      parseExperienceEntries
    });
  }

  global.RoleFitExperienceParser = Object.freeze({ create });
})(typeof window !== "undefined" ? window : globalThis);
