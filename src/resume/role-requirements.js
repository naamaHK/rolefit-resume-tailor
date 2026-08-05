(function attachRoleRequirements(global) {
  "use strict";

  function create(dependencies) {
    const {
      cleanConfirmedText,
      extractMissingExperienceTopics,
      genericQuestionTopics,
      hasSection,
      normalize,
      resumeCoversSkillTerm,
      splitLines,
      stringifyAnalysisItem,
      textContainsTopicTerm
    } = dependencies || {};

    const required = {
      cleanConfirmedText,
      extractMissingExperienceTopics,
      hasSection,
      normalize,
      resumeCoversSkillTerm,
      splitLines,
      stringifyAnalysisItem,
      textContainsTopicTerm
    };

    for (const [name, dependency] of Object.entries(required)) {
      if (typeof dependency !== "function") {
        throw new TypeError(`Role requirements require ${name}().`);
      }
    }

    const ignoredTopics = genericQuestionTopics instanceof Set ? genericQuestionTopics : new Set();

    function normalizeKey(term) {
      const value = normalize(String(term || ""))
        .replace(/[–—]/g, "-")
        .replace(/\s+/g, " ")
        .trim();
      if (/^(?:c\s*\/\s*c\+\+|c and c\+\+|c\+\+ and c)$/.test(value)) return "c/c++";
      if (/\bcommunication\b/.test(value) && /\bcollaboration\b/.test(value)) return "communication-and-collaboration";
      if (/^communication(?:\s+skills?)?$/.test(value)) return "communication";
      if (/^collaboration(?:\s+skills?)?$/.test(value)) return "collaboration";
      if (/\btop-tier\b.*\bpeer-reviewed\b|\bpeer-reviewed\b.*\b(?:conferences?|journals?)\b/.test(value)) return "peer-reviewed-research-output";
      if (value === "ml") return "machine learning";
      if (value === "cs") return "computer science";
      if (value === "ce") return "computer engineering";
      if (/^tableau(?:\s+dashboards?)?$/.test(value)) return "tableau";
      if (/^(?:apache\s+)?airflow$/.test(value)) return "apache-airflow";
      if (/^(?:master'?s degree|msc|m\.sc\.?)$/.test(value)) return "master's degree";
      return value;
    }

    function isAbstract(term) {
      const key = normalizeKey(term);
      return ignoredTopics.has(key)
        || /^(?:required|preferred|minimum|basic)?\s*qualifications?$/.test(key)
        || /^(?:strong|excellent|good|effective)$/.test(key)
        || /^(?:dashboard(?:s)?|reporting|decision(?:s)?|customer data)$/.test(key)
        || /^(?:related|relevant)\s+(?:(?:field\s+)?research|field|background)(?:\s+(?:experience|work))?$/.test(key)
        || /\bjob\s+description\b/.test(key)
        || /^(?:description|details?|requirements?)$/.test(key);
    }

    function display(term) {
      const value = cleanConfirmedText(typeof term === "string" ? term : stringifyAnalysisItem(term));
      const key = normalizeKey(value);
      const preferred = {
        "c/c++": "C/C++",
        "communication-and-collaboration": "Communication and collaboration",
        communication: "Communication",
        collaboration: "Collaboration",
        "peer-reviewed-research-output": "Peer-reviewed research output",
        "machine learning": "Machine Learning",
        "computer science": "Computer Science",
        "computer engineering": "Computer Engineering",
        tableau: "Tableau",
        "apache-airflow": "Apache Airflow",
        dbt: "dbt",
        "master's degree": "Master's degree",
        python: "Python",
        java: "Java",
        perl: "Perl",
        patents: "Patents",
        publications: "Publications"
      };
      return preferred[key] || value;
    }

    function durationRequirement(term) {
      const value = cleanConfirmedText(String(term || "")).replace(/^[-*•]\s*/, "");
      const match = value.match(/\b(\d+)\s*\+?\s*(?:years?|yrs?)(?:\s+of)?\s+(.{0,90}?\bexperience\b)/i);
      if (!match) return null;
      const minimumYears = Number(match[1]);
      const description = cleanConfirmedText(match[2]).replace(/[.;:,]+$/, "");
      if (!Number.isFinite(minimumYears) || minimumYears < 1 || !description) return null;
      const keyDescription = normalize(description).replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
      return {
        key: `experience-years-${minimumYears}-${keyDescription}`,
        display: `${minimumYears}+ years of ${description}`,
        minimumYears
      };
    }

    function visibleExperienceYears(resumeText) {
      const lines = splitLines(resumeText);
      const start = lines.findIndex((line) => /^(?:professional\s+)?experience\s*:?$/i.test(line));
      if (start === -1) return 0;
      const experienceLines = [];
      for (let index = start + 1; index < lines.length; index += 1) {
        const line = lines[index];
        if (/^[A-Z][A-Z &/]+$/.test(line)) break;
        experienceLines.push(line);
      }

      const coveredYears = new Set();
      const currentYear = new Date().getFullYear();
      for (const line of experienceLines) {
        const matches = String(line).matchAll(/\b((?:19|20)\d{2})\s*(?:-|–|—|to)\s*(Present|present|(?:19|20)\d{2})\b/g);
        for (const match of matches) {
          const startYear = Number(match[1]);
          const endYear = /^present$/i.test(match[2]) ? currentYear : Number(match[2]);
          if (!Number.isFinite(startYear) || !Number.isFinite(endYear) || endYear < startYear) continue;
          for (let year = startYear; year <= endYear; year += 1) coveredYears.add(year);
        }
      }
      return coveredYears.size;
    }

    function groupForJob(term, jobText = "") {
      const key = normalizeKey(term);
      const job = normalize(String(jobText || "")).replace(/\s+/g, " ");
      const duration = durationRequirement(term);
      if (duration && qualificationLines(jobText).some((line) => durationRequirement(line)?.key === duration.key)) {
        return duration;
      }

      if (key === "tableau" && /\btableau\s+dashboards?\b/.test(job)) {
        return { key: "tableau", display: "Tableau dashboards" };
      }

      if (
        ["c", "c++", "c/c++"].includes(key)
        && /\bc\s*\/\s*c\+\+(?=$|[^A-Za-z0-9+#])/.test(job)
      ) return { key: "c/c++", display: "C/C++" };

      if (
        ["phd", "ph.d", "doctorate", "doctoral degree", "master's degree"].includes(key)
        && /\bph\.?d\.?\b.{0,60}\bor\b.{0,40}\bmaster'?s\b|\bmaster'?s\b.{0,60}\bor\b.{0,40}\bph\.?d\.?\b/.test(job)
      ) return { key: "advanced-degree", display: "PhD or Master's degree" };

      if (
        ["computer science", "computer engineering", "machine learning"].includes(key)
        && /\b(?:cs|computer science)\b.{0,70}\b(?:ce|computer engineering)\b.{0,70}\b(?:ml|machine learning)\b.{0,70}\brelated field\b/.test(job)
      ) return { key: "relevant-research-background", display: "Relevant CS/CE/ML research background" };

      if (
        /\b(?:computer science|computer engineering|computer information systems|information systems)\b/.test(key)
        && /\b(?:bachelor'?s|b\.?\s*sc\.?|degree)\b[\s\S]{0,90}\b(?:computer science|computer engineering|related field|closely related)\b|\b(?:computer science|computer engineering|related field|closely related)\b[\s\S]{0,90}\b(?:bachelor'?s|b\.?\s*sc\.?|degree)\b/.test(job)
      ) return { key: "related-computing-degree", display: "Computer Science or closely related degree" };

      if (
        ["patents", "publications", "peer-reviewed-research-output"].includes(key)
        && /\bpatents?\b.{0,45}\bor\b.{0,45}\bpublications?\b|\bpublications?\b.{0,45}\bor\b.{0,45}\bpatents?\b/.test(job)
      ) return { key: "patents-or-publications", display: "Patents or peer-reviewed publications" };

      if (
        ["communication", "collaboration", "communication-and-collaboration"].includes(key)
        && /\bcommunication\b.{0,60}\bcollaboration\b|\bcollaboration\b.{0,60}\bcommunication\b/.test(job)
      ) return { key: "communication-and-collaboration", display: "Communication and collaboration" };

      return { key, display: display(term) };
    }

    function isGroundedInJob(term, grouped, jobText = "") {
      const job = String(jobText || "");
      if (!job.trim()) return true;
      if (grouped.key.startsWith("experience-years-")) return true;
      if (["advanced-degree", "relevant-research-background", "patents-or-publications", "communication-and-collaboration"].includes(grouped.key)) {
        return true;
      }
      if (grouped.key === "related-computing-degree") return true;
      if (textContainsTopicTerm(job, term) || textContainsTopicTerm(job, grouped.display)) return true;
      const key = normalizeKey(term);
      if (key === "machine learning") return /\b(?:ML|machine learning)\b/i.test(job);
      if (key === "llm") return /\bLLMs?\b/i.test(job);
      if (key === "computer science") return /\b(?:CS|computer science)\b/i.test(job);
      if (key === "computer engineering") return /\b(?:CE|computer engineering)\b/i.test(job);
      if (key === "master's degree") return /\b(?:M\.?\s*Sc\.?|master'?s)\b/i.test(job);
      return false;
    }

    function resumeCovers(resumeText, requirement) {
      const key = normalizeKey(requirement);
      const durationMatch = key.match(/^experience-years-(\d+)-/);
      if (durationMatch) return visibleExperienceYears(resumeText) >= Number(durationMatch[1]);
      if (key === "advanced-degree") {
        return /\b(?:Ph\.?\s*D\.?|Doctorate|Doctoral degree|M\.?\s*Sc\.?|Master(?:'s)?(?:\s+degree)?)\b/i.test(resumeText);
      }
      if (key === "relevant-research-background") {
        return /\b(?:Computer Science|Computer Engineering|Data Science|Machine Learning|CS|CE|ML)\b/i.test(resumeText)
          && /\b(?:research|thesis|engineer|scientist)\b/i.test(resumeText);
      }
      if (key === "related-computing-degree") {
        return /\b(?:Computer Science|Computer Engineering|Computer Information Systems|Information Systems)\b/i.test(resumeText)
          && /\b(?:Bachelor'?s|B\.?\s*Sc\.?|degree)\b/i.test(resumeText);
      }
      if (key === "patents-or-publications") return hasSection(resumeText, ["patents", "patent", "publications", "publication"]);
      if (key === "peer-reviewed-research-output") {
        return hasSection(resumeText, ["publications", "publication"])
          || /\b(?:ACM|IEEE|conference|journal|peer-reviewed)\b/i.test(resumeText);
      }
      if (key === "communication-and-collaboration") {
        return /\bcommunicat(?:e|ed|es|ing|ion|ions)\b/i.test(resumeText)
          && /\b(?:collaborat(?:e|ed|es|ing|ion|ions|ive)|cross-functional|partnered|worked with)\b/i.test(resumeText);
      }
      if (key === "communication") return /\bcommunicat(?:e|ed|es|ing|ion|ions)\b/i.test(resumeText);
      if (key === "collaboration") return /\b(?:collaborat(?:e|ed|es|ing|ion|ions|ive)|cross-functional|partnered|worked with)\b/i.test(resumeText);
      if (key === "c/c++") {
        return textContainsTopicTerm(resumeText, "C/C++")
          || textContainsTopicTerm(resumeText, "C++")
          || textContainsTopicTerm(resumeText, "C");
      }
      if (key === "master's degree") return /\b(?:M\.?\s*Sc\.?|Master(?:'s)?(?:\s+degree)?)\b/i.test(resumeText);
      if (key === "computer science") return /\b(?:Computer Science|CS)\b/i.test(resumeText);
      if (key === "computer engineering") return /\b(?:Computer Engineering|CE)\b/i.test(resumeText);
      return resumeCoversSkillTerm(resumeText, key);
    }

    function qualificationLines(jobText = "") {
      const lines = splitLines(jobText);
      const qualificationHeader = /^(?:(?:basic|minimum|required|preferred|nice[-\s]+to[-\s]+have)\s+)?(?:qualifications?|requirements?)\s*:?$/i;
      const nextSectionHeader = /^(?:about(?:\s+the)?(?:\s+(?:role|team|company))?|responsibilities|what you(?:'|’)ll do|what you will do|benefits|compensation|equal opportunity|how to apply|application process|location|work arrangement)\s*:?$/i;
      let inQualifications = false;
      let foundQualificationSection = false;
      const qualificationItems = [];

      for (const line of lines) {
        if (qualificationHeader.test(line)) {
          inQualifications = true;
          foundQualificationSection = true;
          continue;
        }
        if (inQualifications && nextSectionHeader.test(line)) {
          inQualifications = false;
          continue;
        }
        if (inQualifications) qualificationItems.push(line);
      }

      // A normally formatted job posting separates qualifications from its
      // narrative. Restrict local extraction to those sections so prose such
      // as the company description cannot become a question. Older free-form
      // postings retain the broad fallback for backwards compatibility.
      return foundQualificationSection ? qualificationItems : lines;
    }

    function collect(data, jobText = "") {
      const job = data?.job_analysis || {};
      const finalChecks = data?.final_checks || {};
      const modeledRequirementTerms = [
        ...(job.required_skills || []),
        ...(job.preferred_skills || [])
      ];
      const localTerms = qualificationLines(jobText).flatMap((line) => extractMissingExperienceTopics(line));
      const localDurationTerms = qualificationLines(jobText)
        .map((line) => durationRequirement(line)?.display || "")
        .filter(Boolean);
      const fallbackTerms = [
        ...(finalChecks.keywords_covered || []),
        ...(finalChecks.keywords_missing || [])
      ];
      // Providers can omit a plainly stated Basic Qualification. Keep their
      // useful interpretation, but merge it with concrete terms extracted from
      // the job's qualification sections so those requirements still receive a
      // grounded confirmation question.
      const rawTerms = [
        ...modeledRequirementTerms,
        ...localTerms,
        ...localDurationTerms
      ];
      const termsToCollect = rawTerms.length ? rawTerms : fallbackTerms;
      const byKey = new Map();

      for (const item of termsToCollect) {
        const label = display(item);
        const grouped = groupForJob(label, jobText);
        if (
          !grouped.key
          || grouped.key.length > 90
          || isAbstract(label)
          || !isGroundedInJob(label, grouped, jobText)
          || byKey.has(grouped.key)
        ) continue;
        byKey.set(grouped.key, grouped.display);
      }

      return Array.from(byKey, ([key, display]) => ({ key, display }));
    }

    function buildCoverageState(data, currentResume, baselineResume, jobText = "") {
      const covered = [];
      const missing = [];

      for (const term of collect(data, jobText)) {
        if (!resumeCovers(currentResume, term.key)) {
          missing.push(term);
          continue;
        }
        covered.push({
          ...term,
          newlyCovered: !resumeCovers(baselineResume, term.key)
        });
      }

      const coveredKeys = new Set(covered.map((term) => term.key));
      return {
        covered,
        missing: missing.filter((term) => !coveredKeys.has(term.key))
      };
    }

    return Object.freeze({
      buildCoverageState,
      collect,
      display,
      getMissingRequirements(data, resumeText, jobText = "") {
        return buildCoverageState(data, resumeText, resumeText, jobText).missing;
      },
      groupForJob,
      isAbstract,
      isGroundedInJob,
      normalizeKey,
      qualificationLines,
      resumeCovers
    });
  }

  global.RoleFitRoleRequirements = Object.freeze({ create });
})(typeof window !== "undefined" ? window : globalThis);
