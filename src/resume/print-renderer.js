function getResumeSectionNames() {
  return resumeDocumentParser.getResumeSectionNames();
}

function parseResumeText(text) {
  return resumeDocumentParser.parseResumeText(text);
}

function hasSectionContent(section) {
  return resumeDocumentParser.hasSectionContent(section);
}

function removeEmptySections(sections) {
  return resumeDocumentParser.removeEmptySections(sections);
}

function preferredSectionTitle(section) {
  return resumeDocumentParser.preferredSectionTitle(section);
}

function mergeDuplicateSections(sections) {
  return resumeDocumentParser.mergeDuplicateSections(sections);
}

function prepareSectionsForOutput(sections) {
  return orderSectionsForStructure(removeEmptySections(mergeDuplicateSections(sections).map(normalizeSectionForOutput)));
}

function normalizeSectionForOutput(section) {
  const normalizedLines = section.lines.map(normalizeYearRangesInLine);
  if (canonicalSectionTitle(section.title) !== "skills") {
    return {
      ...section,
      lines: normalizedLines
    };
  }

  const hasNamedGroups = normalizedLines.some((line) => /^[^:]{2,45}:\s*\S/.test(stripLeadingBullet(line)));
  if (hasNamedGroups) {
    return {
      ...section,
      title: section.title,
      lines: unique(normalizedLines.map((line) => stripLeadingBullet(line)).filter(Boolean))
    };
  }

  const items = unique(normalizedLines.flatMap(splitSkillItems).map(cleanSkillItem).filter(Boolean));
  return {
    ...section,
    title: "Skills",
    lines: items.length ? formatSkillsToInsert(items).split("\n") : []
  };
}

function normalizeYearRangesInLine(line) {
  if (/^https?:\/\//i.test(String(line || "").trim())) return line;
  return String(line || "")
    .replace(/\(\s*((?:19|20)\d{2}(?:\s*(?:-|–|—|to|\s)\s*(?:Present|present|(?:19|20)\d{2}))?)\s*\)/g, " $1")
    .replace(/\b((?:19|20)\d{2})\s+(Present|present|(?:19|20)\d{2})\b/g, (_, start, end) => `${start} - ${titleCase(end)}`)
    .replace(/\b((?:19|20)\d{2})\s*[–—-]\s*(Present|present|(?:19|20)\d{2})\b/g, (_, start, end) => `${start} - ${titleCase(end)}`)
    .replace(/\s{2,}/g, " ")
    .trim();
}

function serializeResumeText(headerLines, sections) {
  return resumeDocumentParser.serializeResumeText(headerLines, sections);
}

function normalizeFinalResumeText(text) {
  const parsed = parseResumeText(text);
  return serializeResumeText(parsed.headerLines, prepareSectionsForOutput(parsed.sections));
}

function renderResumeHeader(headerLines) {
  return headerLines.length
    ? `<header class="resume-header"><h1>${escapeHtml(headerLines[0])}</h1>${headerLines.slice(1).map((line) => `<p>${escapeHtml(line)}</p>`).join("")}</header>`
    : "";
}

function safeResumeHref(value) {
  const href = String(value || "").trim();
  return /^(?:https?:\/\/|mailto:|tel:)/i.test(href) ? href : "";
}

function renderAutoLinkedText(value) {
  const text = String(value || "");
  const tokenPattern = /(?:https?:\/\/[^\s<>()]+|(?:www\.|linkedin\.com\/|github\.com\/)[^\s<>()]+|[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})/gi;
  let html = "";
  let cursor = 0;

  for (const match of text.matchAll(tokenPattern)) {
    const token = match[0];
    const index = match.index || 0;
    html += escapeHtml(text.slice(cursor, index));
    const isEmail = token.includes("@") && !/^https?:/i.test(token);
    const href = isEmail ? `mailto:${token}` : (/^https?:\/\//i.test(token) ? token : `https://${token}`);
    html += `<a href="${escapeHtml(href)}">${escapeHtml(token)}</a>`;
    cursor = index + token.length;
  }

  return html + escapeHtml(text.slice(cursor));
}

function renderInlineLinks(value) {
  const text = String(value || "");
  const markdownLinkPattern = /\[([^\]\n]+)\]\(((?:https?:\/\/|mailto:|tel:)[^\s)]+)\)/gi;
  let html = "";
  let cursor = 0;

  for (const match of text.matchAll(markdownLinkPattern)) {
    const index = match.index || 0;
    html += renderAutoLinkedText(text.slice(cursor, index));
    const href = safeResumeHref(match[2]);
    html += href
      ? `<a href="${escapeHtml(href)}">${escapeHtml(match[1])}</a>`
      : escapeHtml(match[0]);
    cursor = index + match[0].length;
  }

  return html + renderAutoLinkedText(text.slice(cursor));
}

function modernContactParts(headerLines) {
  const contactPattern = /\[[^\]\n]+\]\((?:https?:\/\/|mailto:|tel:)[^\s)]+\)|Google Scholar|[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}|(?:https?:\/\/)?(?:www\.)?(?:linkedin\.com|github\.com)\/[^\s|]+|(?:\+?\d[\d() .-]{6,}\d)/gi;
  return headerLines.slice(1).flatMap((line) => {
    const explicitParts = String(line || "").split(/\s*\|\s*/).map((part) => part.trim()).filter(Boolean);
    if (explicitParts.length > 1) return explicitParts;
    const detectedParts = String(line || "").match(contactPattern) || [];
    return detectedParts.length > 1 ? detectedParts.map((part) => part.trim()) : explicitParts;
  });
}

function renderModernContactPart(part) {
  const value = String(part || "").trim();
  if (/^\+?\d[\d() .-]{6,}\d$/.test(value)) {
    const href = `tel:${value.replace(/[^\d+]/g, "")}`;
    return `<a href="${escapeHtml(href)}">${escapeHtml(value)}</a>`;
  }
  return renderInlineLinks(value);
}

function isSummaryLikeSection(title) {
  return ["statement", "summary", "professional summary", "profile"].includes(normalizeSectionLabel(title));
}

function renderParagraphSectionBody(lines) {
  const bullets = lines.filter((line) => /^[-*•]/.test(line));
  const prose = lines
    .filter((line) => !/^[-*•]/.test(line))
    .map((line) => line.trim())
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();

  return [
    prose ? `<p>${renderInlineLinks(prose)}</p>` : "",
    bullets.length ? `<ul>${bullets.map((line) => `<li>${renderInlineLinks(line.replace(/^[-*•]\s*/, ""))}</li>`).join("")}</ul>` : ""
  ].join("");
}

function renderSectionBody(lines, title = "") {
  if (isSummaryLikeSection(title)) {
    return renderParagraphSectionBody(lines);
  }

  let html = "";
  let openList = false;

  function closeList() {
    if (openList) {
      html += "</ul>";
      openList = false;
    }
  }

  for (const line of lines) {
    const isBullet = /^[-*•]/.test(line);

    if (isBullet) {
      if (!openList) {
        html += "<ul>";
        openList = true;
      }
      html += `<li>${renderInlineLinks(line.replace(/^[-*•]\s*/, ""))}</li>`;
    } else {
      closeList();
      html += `<p>${renderInlineLinks(line)}</p>`;
    }
  }

  closeList();
  return html;
}

function renderResumeSection(section) {
  if (!hasSectionContent(section)) return "";
  return `<section class="resume-section"><h2>${escapeHtml(section.title)}</h2>${renderSectionBody(section.lines, section.title)}</section>`;
}

function formatResumeForPrint(text) {
  const parsed = parseResumeText(text);
  const sections = prepareSectionsForOutput(parsed.sections);
  return `${renderResumeHeader(parsed.headerLines)}${sections.map(renderResumeSection).join("")}`;
}

function canonicalSectionTitle(title) {
  return resumeDocumentParser.canonicalSectionTitle(title);
}

function orderSectionsForStructure(sections) {
  return resumeDocumentParser.orderSectionsForStructure(sections);
}

function extractYears(text) {
  const match = String(text || "").match(/\b((?:19|20)\d{2})(?:\s*(?:-|–|—|to)?\s*(Present|present|(?:19|20)\d{2}))?\b/);
  if (!match) return "";
  return match[2] ? `${match[1]} - ${titleCase(match[2])}` : match[1];
}

function removeYears(text) {
  return text
    .replace(/\b(?:19|20)\d{2}(?:\s*(?:-|–|—|to)?\s*(?:Present|present|(?:19|20)\d{2}))?\b/g, "")
    .replace(/\s{2,}/g, " ")
    .replace(/\s*,\s*$/, "")
    .trim();
}

function cleanEntryTitle(text) {
  return String(text || "")
    .replace(/\(\s*\)/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function looksLikeInstitutionOrCompany(line) {
  return /\b(University|Institute|Technion|Research|Media|Inc|Ltd|LLC|Company|School|College|Academy)\b/i.test(line);
}

function stripLeadingBullet(line) {
  return line.replace(/^[-*•]\s*/, "").replace(/^b\s+(?=[A-Z])/i, "").trim();
}

function looksLikeSentence(line) {
  return /\b(and|with|in|to|for|of|the|a|an|by|on|across|during|using)\b/i.test(line) || /[.!?]$/.test(line);
}

const experienceParser = window.RoleFitExperienceParser.create({
  cleanEntryTitle,
  extractYears,
  looksLikeInstitutionOrCompany,
  looksLikeSentence,
  removeYears,
  stripLeadingBullet
});

function looksLikeJobTitle(line) {
  return experienceParser.looksLikeJobTitle(line);
}

function looksLikeCompanyLine(line) {
  return experienceParser.looksLikeCompanyLine(line);
}

function isLikelyExperienceRole(line, nextLine, current) {
  return experienceParser.isLikelyExperienceRole(line, nextLine, current);
}

function parseExperienceEntries(lines) {
  return experienceParser.parseExperienceEntries(lines);
}

function renderDesignedExperience(section) {
  const entries = parseExperienceEntries(section.lines);
  if (!entries.length) return "";

  return `
    <section class="resume-section designed-experience-section">
      <h2>${escapeHtml(section.title)}</h2>
      ${entries.map((entry) => `
        <article class="designed-entry">
          <div class="entry-main">
            <h3>${escapeHtml(entry.title)}</h3>
            ${entry.company ? `<p class="entry-company">${escapeHtml(entry.company)}</p>` : ""}
          </div>
          ${entry.years ? `<div class="entry-years">${escapeHtml(entry.years)}</div>` : ""}
          ${entry.bullets.length ? `<ul class="original-bullets">${entry.bullets.map((bullet) => `<li>${escapeHtml(bullet)}</li>`).join("")}</ul>` : ""}
        </article>
      `).join("")}
    </section>
  `;
}

function parsePublicationEntries(lines) {
  const entries = [];
  let current = null;

  function pushCurrent() {
    if (current && (current.name || current.details.length)) entries.push(current);
  }

  for (const line of lines) {
    if (/^https?:\/\//i.test(line) && current) {
      current.link = line;
      continue;
    }

    const year = extractYears(line);
    const withoutYear = removeYears(line);
    const looksLikeVenueLine = /\b(ACM|IEEE|Conference|Journal|Innovations|RecSys|CIKM|Big Data|International Conference)\b/i.test(line);

    if (current && year && !current.year && looksLikeVenueLine) {
      current.year = year;
      current.details.push(withoutYear || line);
      continue;
    }

    const startsNew = !current || (year && (current.year || !looksLikeVenueLine)) || (!year && current.link);

    if (startsNew) {
      pushCurrent();
      current = {
        name: withoutYear || line,
        year,
        rawLine: line,
        details: [],
        link: ""
      };
      continue;
    }

    current.details.push(line);
  }

  pushCurrent();
  return entries;
}

function renderDesignedPublications(section) {
  const entries = parsePublicationEntries(section.lines);
  if (!entries.length) return "";

  return `
    <section class="resume-section designed-publications-section">
      <h2>${escapeHtml(section.title)}</h2>
      ${entries.map((entry) => {
        const conferenceIndex = entry.details.findIndex((line) => /\b(ACM|IEEE|Conference|Journal|Innovations|RecSys|CIKM|Big Data)\b/i.test(line));
        const titleParts = conferenceIndex > 0 ? entry.details.slice(0, conferenceIndex) : [];
        const conference = conferenceIndex >= 0 ? entry.details[conferenceIndex] : "";
        const authors = (conferenceIndex >= 0 ? entry.details.slice(conferenceIndex + 1) : entry.details.slice(1))
          .filter((line) => !/^https?:\/\//i.test(line));
        const name = [entry.name, ...titleParts].join(" ").trim();
        return `
          <article class="designed-entry compact-entry">
            <div class="entry-main">
              <h3>${escapeHtml(name)}</h3>
              ${conference ? `<p class="entry-company">${escapeHtml(conference)}</p>` : ""}
              ${authors.length ? `<p class="entry-authors">${escapeHtml(authors.join(" "))}</p>` : ""}
              ${entry.link ? `<p class="entry-link">${escapeHtml(entry.link)}</p>` : ""}
            </div>
            ${entry.year ? `<div class="entry-years">${escapeHtml(entry.year)}</div>` : ""}
          </article>
        `;
      }).join("")}
    </section>
  `;
}

function parsePatentEntries(lines) {
  const entries = [];
  let current = null;
  let scholar = null;

  function pushCurrent() {
    if (current && (current.name || current.authors.length)) entries.push(current);
  }

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];

    if (/Google Scholar Page/i.test(line)) {
      const sameLineLink = line.match(/https?:\/\/\S+/i)?.[0] || "";
      const nextLine = lines[index + 1] || "";
      scholar = {
        label: "Google Scholar Page",
        link: sameLineLink || (/^https?:\/\//i.test(nextLine) ? nextLine : "")
      };
      if (!sameLineLink && /^https?:\/\//i.test(nextLine)) index += 1;
      continue;
    }

    if (/^https?:\/\//i.test(line)) {
      if (!scholar) {
        scholar = { label: "Google Scholar Page", link: line };
      }
      continue;
    }

    const year = extractYears(line);
    const status = extractPatentStatus(line);
    const withoutYear = removeYears(line)
      .replace(/\b(Pending|Active|Granted|Published|Filed|Issued|US\d+[A-Z0-9]*)\b/gi, "")
      .trim();

    const isWrappedContinuation = current && /[-–—]\s*$/.test(current.name || "");
    const startsNewUndatedPatent = current
      && !year
      && !status
      && current.year
      && !isWrappedContinuation
      && !looksLikeAuthorList(line)
      && !/^[-*•]/.test(line)
      && /^[A-Z][A-Za-z0-9()&/,\s-]{12,}$/.test(line)
      && !/[.!?]$/.test(line);

    if (year || !current) {
      const split = splitPatentNameAndAuthors(withoutYear || line);
      pushCurrent();
      current = {
        name: split.name,
        year,
        status,
        rawLine: line,
        authors: split.authors ? [split.authors] : []
      };
      continue;
    }

    if (startsNewUndatedPatent) {
      pushCurrent();
      const split = splitPatentNameAndAuthors(withoutYear || line);
      current = {
        name: split.name,
        year: "",
        status: "",
        rawLine: line,
        authors: split.authors ? [split.authors] : []
      };
      continue;
    }

    if (status && current && !current.status) {
      current.status = status;
    }

    if (/,/.test(line) || /\b[A-Z]\.\s/.test(line)) {
      current.authors.push(line.replace(/\b(Pending|Active|Granted|Published|Filed|Issued|US\d+[A-Z0-9]*)\b/gi, "").replace(/\s+-\s*$/i, "").trim());
    } else {
      current.name = `${current.name} ${line}`.replace(/-\s+/g, "-").trim();
    }
  }

  pushCurrent();
  return { entries, scholar };
}

function extractPatentStatus(line) {
  const statuses = line.match(/\b(Pending|Active|Granted|Published|Filed|Issued|US\d+[A-Z0-9]*)\b/gi) || [];
  return unique(statuses).join(" ");
}

function splitPatentNameAndAuthors(text) {
  const clean = text.replace(/\s+-\s*$/i, "").trim();
  const authorStart = clean.search(/\b[A-Z]\.\s+[A-Z][A-Za-z-]+/);
  if (authorStart > 12) {
    return {
      name: clean.slice(0, authorStart).replace(/[,\s-]+$/, "").trim(),
      authors: clean.slice(authorStart).trim()
    };
  }
  return { name: clean, authors: "" };
}

function renderDesignedPatents(section) {
  const { entries, scholar } = parsePatentEntries(section.lines);
  if (!entries.length && !scholar) return "";

  return `
    <section class="resume-section designed-patents-section">
      <h2>${escapeHtml(section.title)}</h2>
      ${entries.map((entry) => `
        <article class="designed-entry compact-entry">
          <div class="entry-main">
            <h3>${escapeHtml(entry.name)}</h3>
            ${renderPatentAuthorStatus(entry)}
          </div>
          ${entry.year ? `<div class="entry-years">${escapeHtml(entry.year)}</div>` : ""}
        </article>
      `).join("")}
      ${scholar ? `
        <article class="scholar-entry">
          <p class="scholar-label">${escapeHtml(scholar.label)}</p>
          ${scholar.link ? `<p class="entry-link">${escapeHtml(scholar.link)}</p>` : ""}
        </article>
      ` : ""}
    </section>
  `;
}

function renderPatentAuthorStatus(entry) {
  const authors = entry.authors.join(" ").trim();
  const authorStatus = [authors, entry.status].filter(Boolean).join(" - ");
  return authorStatus ? `<p class="entry-authors">${escapeHtml(authorStatus)}</p>` : "";
}

function isDegreeLine(line) {
  return /\b(B\.?Sc|M\.?Sc|Ph\.?D|MBA|Bachelor|Master|Doctor|Degree)\b/i.test(line);
}

function looksLikeEducationDetail(line) {
  return /\b(advised by|advisor|thesis|honors?|speciali[sz]ation|gpa|coursework|details?)\b/i.test(line);
}

function splitEducationDegreeAndInstitution(line) {
  const clean = removeYears(line);
  const separators = [",", "|"];

  for (const separator of separators) {
    const index = clean.lastIndexOf(separator);
    if (index === -1) continue;
    const degree = clean.slice(0, index).trim();
    const institution = clean.slice(index + separator.length).trim();
    if (degree && institution && looksLikeInstitutionOrCompany(institution)) {
      return { degree, institution };
    }
  }

  return { degree: clean, institution: "" };
}

function parseEducationEntries(lines) {
  const entries = [];
  let current = null;

  function pushCurrent() {
    if (current && (current.degree || current.institution || current.details.length)) entries.push(current);
  }

  for (const line of lines) {
    const clean = stripLeadingBullet(line);
    const startsEntry = !current || isDegreeLine(clean) || (extractYears(clean) && !looksLikeInstitutionOrCompany(clean));

    if (startsEntry) {
      pushCurrent();
      const split = splitEducationDegreeAndInstitution(clean);
      current = {
        degree: split.degree,
        institution: split.institution,
        years: extractYears(clean),
        rawLine: clean,
        details: []
      };
      continue;
    }

    if (extractYears(clean) && !current.years && removeYears(clean).length <= 4) {
      current.years = extractYears(clean);
      continue;
    }

    if (!current.institution && (looksLikeInstitutionOrCompany(clean) || !looksLikeEducationDetail(clean))) {
      current.institution = clean;
      continue;
    }

    current.details.push(clean);
  }

  pushCurrent();
  return entries;
}

function renderDesignedEducation(section) {
  const entries = parseEducationEntries(section.lines);
  if (!entries.length) return "";

  return `
    <section class="resume-section designed-education-section">
      <h2>${escapeHtml(section.title)}</h2>
      ${entries.map((entry) => `
        <article class="designed-entry compact-entry">
          <div class="entry-main">
            <h3>${escapeHtml(entry.degree)}</h3>
            ${entry.institution ? `<p class="entry-company">${escapeHtml(entry.institution)}</p>` : ""}
            ${entry.details.length ? `<p class="entry-authors">${escapeHtml(entry.details.join(" "))}</p>` : ""}
          </div>
          ${entry.years ? `<div class="entry-years">${escapeHtml(entry.years)}</div>` : ""}
        </article>
      `).join("")}
    </section>
  `;
}

function renderDesignedProjects(section) {
  const entries = parseProjectEntries(section.lines);
  if (!entries.length) return "";

  return `
    <section class="resume-section designed-projects-section">
      <h2>${escapeHtml(section.title)}</h2>
      ${entries.map((entry) => `
        <article class="designed-entry compact-entry">
          <div class="entry-main">
            <h3>${escapeHtml(entry.name)}</h3>
            ${entry.label ? `<p class="entry-company">${escapeHtml(entry.label)}</p>` : ""}
          </div>
          ${entry.year ? `<div class="entry-years">${escapeHtml(entry.year)}</div>` : ""}
          ${entry.bullets.length ? `<ul class="original-bullets">${entry.bullets.map((bullet) => `<li>${escapeHtml(bullet)}</li>`).join("")}</ul>` : ""}
        </article>
      `).join("")}
    </section>
  `;
}

function splitSkillItems(line) {
  const knownSkills = [
    "Machine Learning",
    "Statistical Analysis",
    "Big Data",
    "Business Oriented",
    "Deployment and Productionization",
    "A/B Testing",
    "Ethics and Privacy",
    "Multitasking",
    "Python",
    "C++",
    "C#",
    "C",
    "SQL",
    "Java/Scala",
    "Java",
    "Scala",
    "RAG",
    "NLP",
    "LLM",
    "Generative AI",
    "Recommendation Systems",
    "Model Evaluation",
    "Production ML",
    "Model Deployment",
    "Low-Latency Serving",
    "ML Pipelines",
    "Production Monitoring",
    "Distributed Computing",
    "Large-Scale Data Processing",
    "Research Practices",
    "Reproducible Experiments",
    "Literature Review",
    "Technical Writing",
    "Patent Filing",
    "Experiment Design",
    "Research",
    "Experimentation",
    "Dashboards"
  ].sort((a, b) => b.length - a.length);
  const normalized = cleanSkillItem(stripSkillCategoryPrefix(line)).replace(/\s*&\s*(?=Research|Experiment|A\/B|Production|Model|Machine|Statistical|Big|Python|SQL|Java|RAG|NLP|LLM)/gi, " • ");
  const items = [];

  for (const segment of normalized.split(/[,;•|:]/).map(cleanSkillItem).filter(Boolean)) {
    const matches = [];
    for (const skill of knownSkills) {
      const match = getSkillMatch(segment, skill);
      if (match) {
        matches.push(match);
      }
    }

    matches.sort((a, b) => a.start - b.start || b.end - b.start - (a.end - a.start));
    const accepted = [];
    for (const match of matches) {
      if (accepted.some((item) => match.start < item.end && match.end > item.start)) continue;
      accepted.push(match);
      const levelAwareSegment = normalizeSkillDisplayName(segment);
      const levelAwareBase = normalizeSkillForCompare(stripSkillLevel(levelAwareSegment));
      const matchedBase = normalizeSkillForCompare(match.skill);
      items.push(getSkillLevelValue(levelAwareSegment) && levelAwareBase === matchedBase ? levelAwareSegment : match.skill);
    }

    if (!accepted.length && segment.length > 2 && !/^[&:]+$/.test(segment)) {
      items.push(segment);
    }
  }

  return unique(items.map(cleanSkillItem).filter(Boolean));
}

function getSkillMatch(segment, skill) {
  const escaped = escapeRegExp(skill);
  const isPlainWordSkill = /^[A-Za-z0-9 ]+$/.test(skill);
  const pattern = isPlainWordSkill
    ? new RegExp(`\\b${escaped}\\b`, "i")
    : new RegExp(`(^|[^A-Za-z0-9+#])(${escaped})(?=$|[^A-Za-z0-9+#])`, "i");
  const match = segment.match(pattern);
  if (!match) return null;
  const prefixLength = isPlainWordSkill ? 0 : (match[1] || "").length;
  const matchedText = isPlainWordSkill ? match[0] : match[2];
  const start = (match.index || 0) + prefixLength;
  return {
    skill,
    start,
    end: start + matchedText.length
  };
}

function splitSidebarItems(section) {
  const items = [];

  if (section.title === "Strengths") {
    return groupWrappedSidebarItems(section.lines, section.title);
  }

  for (const line of section.lines) {
    const clean = stripLeadingBullet(line);
    if (!clean) continue;

    if (section.title === "Skills" || section.title === "Technical Skills") {
      items.push(...splitSkillItems(clean));
      continue;
    }

    if (section.title === "Languages") {
      items.push(clean);
      continue;
    }

    items.push(clean);
  }

  return items;
}

function startsNewSidebarItem(text, sectionTitle) {
  if (sectionTitle === "Achievements") {
    return /^(Led|Achieved|Delivered|Successfully|Contributed|A novel approach|Reduced|Improved|Increased|Built|Designed|Deployed)\b/i.test(text);
  }

  return /^(Strong|Effective|Proven|Excellent|Deep|Experienced|Skilled)\b/i.test(text);
}

function shouldMergeSidebarLine(current, next, sectionTitle) {
  if (!current) return false;
  if (/[,;:-]$/.test(current)) return true;
  if (current.split(/\s+/).length < 5) return true;
  if (!/[.!?]$/.test(current) && !startsNewSidebarItem(next, sectionTitle)) return true;
  return false;
}

function groupWrappedSidebarItems(lines, sectionTitle) {
  const groups = [];
  let current = null;

  function pushCurrent() {
    if (current) {
      groups.push(current);
    }
  }

  for (const line of lines) {
    const clean = stripLeadingBullet(line);
    if (!clean) continue;

    const startsNew = startsNewSidebarItem(clean, sectionTitle);

    if (!current) {
      current = clean;
      continue;
    }

    if (startsNew && !shouldMergeSidebarLine(current, clean, sectionTitle)) {
      pushCurrent();
      current = clean;
      continue;
    }

    current = `${current} ${clean}`;
  }

  pushCurrent();
  return groups.map((item) => item.replace(/-\s+/g, "-"));
}

function groupAchievementSubsections(lines) {
  const flatItems = groupWrappedSidebarItems(lines, "Achievements");
  const groups = [];
  let current = null;

  function pushCurrent() {
    if (current) groups.push(current);
  }

  for (const item of flatItems) {
    if (/^Led\b/i.test(item)) {
      pushCurrent();
      current = { title: item, bullets: [] };
      continue;
    }

    if (!current) {
      current = { title: "Selected impact", bullets: [] };
    }

    current.bullets.push(item);
  }

  pushCurrent();
  return groups;
}

function renderAchievementGroups(groups) {
  return `
    <div class="achievement-groups">
      ${groups.map((group) => `
        <div class="achievement-group">
          <p class="achievement-title">${escapeHtml(group.title)}</p>
          ${group.bullets.length ? `<ul>${group.bullets.map((bullet) => `<li>${escapeHtml(bullet)}</li>`).join("")}</ul>` : ""}
        </div>
      `).join("")}
    </div>
  `;
}

function parseLanguageLine(line) {
  const levels = ["Native", "Fluent", "Professional", "Conversational", "Basic", "Intermediate", "Advanced"];
  for (const level of levels) {
    const pattern = new RegExp(`\\b${level}\\b`, "i");
    if (pattern.test(line)) {
      return {
        language: line.replace(pattern, "").trim(),
        level
      };
    }
  }
  return { language: line, level: "" };
}

function renderSkillRows(items) {
  return `<p class="skill-row">${items.map(escapeHtml).join(" &bull; ")}</p>`;
}

function renderLanguageRows(items) {
  return `
    <div class="language-list">
      ${items.map((item) => {
        const parsed = parseLanguageLine(item);
        return `
          <div class="language-row">
            <span>${escapeHtml(parsed.language)}</span>
            <strong>${escapeHtml(parsed.level)}</strong>
          </div>
        `;
      }).join("")}
    </div>
  `;
}

function parseCertificationEntries(lines) {
  const entries = [];
  for (let index = 0; index < lines.length; index += 1) {
    const clean = stripLeadingBullet(lines[index] || "").trim();
    if (!clean) continue;
    const year = extractYears(clean);
    const name = removeYears(clean).trim();
    const issuer = stripLeadingBullet(lines[index + 1] || "").trim();
    if (issuer && !extractYears(issuer)) index += 1;
    entries.push({
      name: name || clean,
      year,
      issuer: issuer && !extractYears(issuer) ? issuer : ""
    });
  }
  return entries;
}

function renderCertificationRows(lines) {
  const entries = parseCertificationEntries(lines);
  return `
    <div class="certification-list">
      ${entries.map((entry) => `
        <div class="certification-row">
          <div>
            <strong>${escapeHtml(entry.name)}</strong>
            ${entry.issuer ? `<span>${escapeHtml(entry.issuer)}</span>` : ""}
          </div>
          ${entry.year ? `<em>${escapeHtml(entry.year)}</em>` : ""}
        </div>
      `).join("")}
    </div>
  `;
}

function renderDesignedSidebarSection(section) {
  if (!hasSectionContent(section)) return "";
  const items = splitSidebarItems(section);
  let body = items.length ? `<ul>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>` : renderSectionBody(section.lines);

  if (section.title === "Achievements") {
    const groups = groupAchievementSubsections(section.lines);
    body = groups.length ? renderAchievementGroups(groups) : renderSectionBody(section.lines);
  }

  if (section.title === "Skills" || section.title === "Technical Skills") {
    body = items.length ? renderSkillRows(items) : renderSectionBody(section.lines);
  }

  if (section.title === "Languages") {
    body = items.length ? renderLanguageRows(items) : renderSectionBody(section.lines);
  }

  if (section.title === "Certifications") {
    body = renderCertificationRows(section.lines);
  }

  return `
    <section class="resume-section sidebar-bullet-section">
      <h2>${escapeHtml(section.title)}</h2>
      ${body}
    </section>
  `;
}

function renderDesignedSection(section) {
  const canonical = canonicalSectionTitle(section.title);
  if (canonical === "experience" || canonical === "volunteer_experience") {
    return renderDesignedExperience(section);
  }
  if (canonical === "education") {
    return renderDesignedEducation(section);
  }
  if (canonical === "publications") {
    return renderDesignedPublications(section);
  }
  if (canonical === "patents") {
    return renderDesignedPatents(section);
  }
  if (canonical === "projects") {
    return renderDesignedProjects(section);
  }
  return renderResumeSection(section);
}

function isCompactOptionalSection(section) {
  return new Set(["strengths", "achievements", "skills", "technical skills", "languages", "language", "certifications", "awards", "honors"])
    .has(normalizeSectionLabel(section.title));
}

function isContinuationSection(section) {
  const canonical = canonicalSectionTitle(section.title);
  return canonical === "publications" || canonical === "patents" || canonical === "links";
}

function estimateSectionPrintWeight(section) {
  const canonical = canonicalSectionTitle(section.title);
  const lineCount = section.lines.length;
  const textWeight = Math.ceil(section.lines.join(" ").length / 85);
  const base = canonical === "experience" ? 10 : canonical === "education" ? 6 : 4;
  return base + lineCount + textWeight;
}

const DESIGNED_MAIN_PAGE_WEIGHT = 72;
const DESIGNED_SIDEBAR_WEIGHT = 42;

function isSidebarEligibleSection(section) {
  if (isCompactOptionalSection(section)) return true;

  const canonical = canonicalSectionTitle(section.title);
  const hasStructuredDates = section.lines.some((line) => Boolean(extractYears(line)));
  const hasBullets = section.lines.some((line) => /^[-*•]/.test(line));
  return !["summary", "experience", "education", "projects", "volunteer_experience"].includes(canonical)
    && section.lines.length <= 3
    && !hasStructuredDates
    && !hasBullets;
}

function getDesignedPageBudgetPlan(text) {
  const parsed = parseResumeText(text);
  const orderedSections = prepareSectionsForOutput(parsed.sections);
  const continuationSections = orderedSections.filter(isContinuationSection);
  let mainSections = orderedSections.filter((section) => !isContinuationSection(section));
  const sidebarSections = [];
  let mainWeight = mainSections.reduce((sum, section) => sum + estimateSectionPrintWeight(section), 0);
  let sidebarWeight = 0;

  // Give the final compact optional section the side column when it fits. It
  // keeps the reading order clear while using the designed layout efficiently.
  for (let index = mainSections.length - 1; index >= 0; index -= 1) {
    const section = mainSections[index];
    if (!isSidebarEligibleSection(section)) continue;
    const weight = estimateSectionPrintWeight(section) * 0.65;
    if (weight <= DESIGNED_SIDEBAR_WEIGHT) {
      sidebarSections.unshift(section);
      mainSections.splice(index, 1);
      mainWeight -= estimateSectionPrintWeight(section);
      sidebarWeight += weight;
    }
    break;
  }

  // Keep section anatomy intact. Starting at the end means the final compact
  // section moves to the side column only when that helps the first page fit.
  for (let index = mainSections.length - 1; index >= 0 && mainWeight > DESIGNED_MAIN_PAGE_WEIGHT; index -= 1) {
    const section = mainSections[index];
    if (!isSidebarEligibleSection(section)) continue;
    const weight = estimateSectionPrintWeight(section) * 0.65;
    if (sidebarWeight + weight > DESIGNED_SIDEBAR_WEIGHT) continue;
    sidebarSections.unshift(section);
    mainSections.splice(index, 1);
    mainWeight -= estimateSectionPrintWeight(section);
    sidebarWeight += weight;
  }

  const continuationWeight = continuationSections.reduce((sum, section) => sum + estimateSectionPrintWeight(section), 0);
  const continuationFitsOnPageOne = Boolean(continuationSections.length)
    && mainWeight + continuationWeight <= DESIGNED_MAIN_PAGE_WEIGHT;
  const renderedMainSections = continuationFitsOnPageOne
    ? [...mainSections, ...continuationSections]
    : mainSections;
  const renderedContinuationSections = continuationFitsOnPageOne ? [] : continuationSections;

  return {
    parsed,
    mainSections: renderedMainSections,
    sidebarSections,
    continuationSections: renderedContinuationSections,
    mainWeight,
    sidebarWeight,
    continuationWeight,
    overBudget: mainWeight > DESIGNED_MAIN_PAGE_WEIGHT || sidebarWeight > DESIGNED_SIDEBAR_WEIGHT
  };
}

function formatDesignedResumeForPrint(text) {
  const plan = getDesignedPageBudgetPlan(text);
  const { parsed, mainSections, sidebarSections, continuationSections } = plan;

  return `
    <div class="designed-resume designed-compact-layout" data-page-budget="${plan.overBudget ? "over" : "fit"}">
      <main class="designed-main">
        ${renderResumeHeader(parsed.headerLines)}
        ${mainSections.map(renderDesignedSection).join("")}
      </main>
      <aside class="designed-sidebar">
        ${sidebarSections.map(renderDesignedSidebarSection).join("")}
      </aside>
    </div>
    ${continuationSections.length ? `
      <div class="designed-continuation">
        ${continuationSections.map(renderDesignedSection).join("")}
      </div>
    ` : ""}
  `;
}

function renderModernResumeHeader(headerLines) {
  if (!headerLines.length) return "";
  const contactParts = modernContactParts(headerLines);
  return `
    <header class="modern-resume-header">
      <h1>${escapeHtml(headerLines[0])}</h1>
      ${contactParts.length ? `
        <p class="modern-contact-row">
          ${contactParts.map((part) => `<span>${renderModernContactPart(part)}</span>`).join('<span class="modern-contact-separator" aria-hidden="true">|</span>')}
        </p>
      ` : ""}
    </header>
  `;
}

function splitModernExperienceSubsections(lines) {
  const selectedProjectsIndex = lines.findIndex((line) => /^selected (?:research )?projects\s*:?$/i.test(line));
  if (selectedProjectsIndex === -1) {
    return { mainLines: lines, projectLines: [], earlierLines: [] };
  }
  const earlierIndex = lines.findIndex((line, index) => index > selectedProjectsIndex && /^earlier technical experience\s*:?$/i.test(line));
  return {
    mainLines: lines.slice(0, selectedProjectsIndex),
    projectLines: lines.slice(selectedProjectsIndex + 1, earlierIndex === -1 ? lines.length : earlierIndex),
    earlierLines: earlierIndex === -1 ? [] : lines.slice(earlierIndex + 1)
  };
}

function groupModernSubsectionItems(lines) {
  const items = [];
  for (const line of lines) {
    const clean = stripLeadingBullet(line);
    const startsNamedItem = /^[^:]{2,90}:\s*\S/.test(clean);
    if (!items.length || startsNamedItem) {
      items.push(clean);
    } else {
      items[items.length - 1] = `${items[items.length - 1]} ${clean}`.replace(/\s+/g, " ").trim();
    }
  }
  return items.filter(Boolean);
}

function renderModernProjectItem(item) {
  const match = String(item || "").match(/^([^:]{2,90}:)(.*)$/);
  if (!match) return renderInlineLinks(item);
  return `<strong>${renderInlineLinks(match[1])}</strong>${renderInlineLinks(match[2])}`;
}

function renderModernExperienceSubsections(projectLines, earlierLines) {
  const projectItems = groupModernSubsectionItems(projectLines);
  return `
    ${projectItems.length ? `
      <div class="modern-experience-subsection modern-project-subsection">
        <h4>Selected Research Projects</h4>
        <ul>${projectItems.map((item) => `<li>${renderModernProjectItem(item)}</li>`).join("")}</ul>
      </div>
    ` : ""}
    ${earlierLines.length ? `
      <div class="modern-experience-subsection modern-earlier-experience">
        <h4>Earlier Technical Experience</h4>
        ${earlierLines.map((line) => `<p>${renderInlineLinks(stripLeadingBullet(line))}</p>`).join("")}
      </div>
    ` : ""}
  `;
}

function getModernSectionTitle(title) {
  return isSummaryLikeSection(title) ? "Professional Summary" : title;
}

function renderModernExperience(section) {
  const { mainLines, projectLines, earlierLines } = splitModernExperienceSubsections(section.lines);
  const entries = parseExperienceEntries(mainLines);
  if (!entries.length) return "";
  return `
    <section class="resume-section modern-section modern-experience-section">
      <h2>${escapeHtml(getModernSectionTitle(section.title))}</h2>
      ${entries.map((entry, index) => `
        <article class="modern-entry">
          <div class="modern-entry-heading">
            <h3>${entry.company ? `${escapeHtml(entry.company)} <span aria-hidden="true">&middot;</span> ` : ""}${escapeHtml(entry.title)}</h3>
            ${entry.years ? `<time>${escapeHtml(entry.years)}</time>` : ""}
          </div>
          ${entry.bullets.length ? `<ul>${entry.bullets.map((bullet) => `<li>${renderInlineLinks(bullet)}</li>`).join("")}</ul>` : ""}
          ${index === entries.length - 1 ? renderModernExperienceSubsections(projectLines, []) : ""}
        </article>
      `).join("")}
      ${renderModernExperienceSubsections([], earlierLines)}
    </section>
  `;
}

function renderModernSkills(section) {
  const rows = section.lines.map((line) => {
    const clean = stripLeadingBullet(line);
    const match = clean.match(/^([^:]{2,45}):\s*(.+)$/);
    return match
      ? `<li><strong>${renderInlineLinks(match[1])}:</strong> <span>${renderInlineLinks(match[2])}</span></li>`
      : `<li><span>${renderInlineLinks(clean)}</span></li>`;
  }).join("");
  if (!rows) return "";
  return `
    <section class="resume-section modern-section modern-skills-section">
      <h2>${escapeHtml(getModernSectionTitle(section.title))}</h2>
      <ul class="modern-skill-groups">${rows}</ul>
    </section>
  `;
}

function renderModernEducation(section) {
  const entries = parseEducationEntries(section.lines);
  if (!entries.length) return "";
  return `
    <section class="resume-section modern-section modern-education-section">
      <h2>${escapeHtml(getModernSectionTitle(section.title))}</h2>
      ${entries.map((entry) => `
        <article class="modern-entry compact-entry">
          <div class="modern-entry-heading">
            <h3>${escapeHtml(entry.degree)}${entry.institution ? `, <span class="modern-entry-organization">${escapeHtml(entry.institution)}</span>` : ""}</h3>
            ${entry.years ? `<time>${escapeHtml(entry.years)}</time>` : ""}
          </div>
          ${entry.details.length ? `<p class="modern-entry-detail">${renderInlineLinks(entry.details.join(" "))}</p>` : ""}
        </article>
      `).join("")}
    </section>
  `;
}

function renderModernResearch(section) {
  const canonical = canonicalSectionTitle(section.title);
  const patentSummaryLines = canonical === "publications"
    ? section.lines.filter((line) => /^[-*•]?\s*Patents?\s*:/i.test(line))
    : [];
  const researchLines = patentSummaryLines.length
    ? section.lines.filter((line) => !patentSummaryLines.includes(line))
    : section.lines;
  const entries = canonical === "patents"
    ? parsePatentEntries(researchLines).entries.map((entry) => ({
      name: entry.name,
      year: entry.year,
      detail: [entry.authors.join(" "), entry.status].filter(Boolean).join(" - "),
      link: ""
    }))
    : parsePublicationEntries(researchLines).map((entry) => ({
      name: entry.name,
      year: entry.year,
      detail: entry.details.filter((line) => !/^https?:\/\//i.test(line)).join(" "),
      link: entry.link || ""
    }));
  if (!entries.length && !patentSummaryLines.length) return "";
  return `
    <section class="resume-section modern-section modern-research-section">
      <h2>${escapeHtml(getModernSectionTitle(section.title))}</h2>
      ${entries.length ? `<ul>
        ${entries.map((entry) => `
          <li class="modern-research-entry">
            <div>
              <strong>${renderInlineLinks(entry.name)}</strong>
              ${entry.detail ? `<span>${renderInlineLinks(entry.detail)}</span>` : ""}
              ${entry.link ? `<span class="modern-entry-link">${renderInlineLinks(entry.link)}</span>` : ""}
            </div>
            ${entry.year ? `<time>${escapeHtml(entry.year)}</time>` : ""}
          </li>
        `).join("")}
      </ul>` : ""}
      ${patentSummaryLines.map((line) => `<p class="modern-patent-summary">${renderInlineLinks(stripLeadingBullet(line))}</p>`).join("")}
    </section>
  `;
}

function renderModernSection(section) {
  const canonical = canonicalSectionTitle(section.title);
  if (canonical === "experience" || canonical === "volunteer_experience") return renderModernExperience(section);
  if (canonical === "education") return renderModernEducation(section);
  if (canonical === "publications" || canonical === "patents") return renderModernResearch(section);
  if (canonical === "skills") return renderModernSkills(section);
  return `
    <section class="resume-section modern-section modern-generic-section">
      <h2>${escapeHtml(getModernSectionTitle(section.title))}</h2>
      ${renderSectionBody(section.lines, section.title)}
    </section>
  `;
}

function formatModernBlueResumeForPrint(text) {
  const parsed = parseResumeText(text);
  const sections = prepareSectionsForOutput(parsed.sections);
  const contentWeight = sections.reduce((sum, section) => sum + estimateSectionPrintWeight(section), 0);
  const densityClass = contentWeight > 160 ? " modern-blue-dense" : contentWeight > 105 ? " modern-blue-compact" : "";
  return `
    <div class="modern-blue-resume${densityClass}" data-content-weight="${contentWeight}">
      ${renderModernResumeHeader(parsed.headerLines)}
      <main class="modern-resume-main">
        ${sections.map(renderModernSection).join("")}
      </main>
    </div>
  `;
}

function formatResumeForStyle(text, style) {
  if (style === "designed") return formatDesignedResumeForPrint(text);
  if (style === "modern-blue") return formatModernBlueResumeForPrint(text);
  return formatResumeForPrint(text);
}

function setPreviewTemplateClass(style) {
  pdfPreview.classList.toggle("designed-template", style === "designed");
  pdfPreview.classList.toggle("modern-blue-template", style === "modern-blue");
  pdfPreview.classList.toggle("ats-template", style !== "designed" && style !== "modern-blue");
}
