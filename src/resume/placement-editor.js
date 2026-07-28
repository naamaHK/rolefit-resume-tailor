function isSectionHeaderLine(line) {
  return getResumeSectionNames().has(line.trim().toLowerCase()) || looksLikeCustomSectionHeaderLine(line);
}

function looksLikeCustomSectionHeaderLine(line) {
  const clean = String(line || "").trim();
  if (!clean || clean.length > 42) return false;
  if (getResumeSectionNames().has(clean.toLowerCase())) return true;
  if (extractYears(clean)) return false;
  if (/[@:]|https?:\/\//i.test(clean)) return false;
  if (/^[-*•]/.test(clean)) return false;
  if (looksLikeSentence(clean)) return false;
  if (clean !== clean.toUpperCase()) return false;
  if (clean.split(/\s+/).length > 4) return false;
  return /^[A-Z][A-Z0-9 &/+.-]*$/.test(clean);
}

function normalizeSectionLabel(section) {
  return String(section || "")
    .trim()
    .toLowerCase()
    .replace(/^professional\s+/, "")
    .replace(/\s+/g, " ");
}

function isKnownResumeSection(section) {
  const normalized = normalizeSectionLabel(section);
  if (!normalized) return false;
  return getResumeSectionNames().has(normalized) || getResumeSectionAliases(normalized).length > 0;
}

function getResumeSectionAliases(section) {
  const normalized = normalizeSectionLabel(section);
  const aliases = {
    summary: ["professional summary", "summary", "profile", "statement"],
    statement: ["statement", "professional summary", "summary", "profile"],
    profile: ["profile", "professional summary", "summary", "statement"],
    skills: ["skills", "technical skills"],
    "technical skills": ["technical skills", "skills"],
    experience: ["experience", "professional experience"],
    education: ["education"],
    publications: ["publications", "publication"],
    publication: ["publication", "publications"],
    patents: ["patents", "patent"],
    patent: ["patent", "patents"],
    achievements: ["achievements", "achievement", "achievments", "achievment"],
    achievments: ["achievements", "achievement", "achievments", "achievment"],
    strengths: ["strengths"],
    languages: ["languages", "language"],
    projects: ["projects", "selected projects"],
    "selected projects": ["selected projects", "projects"],
    certifications: ["certifications", "certification"],
    certification: ["certification", "certifications"],
    "volunteer experience": ["volunteer experience", "volunteer work", "volunteering"],
    "volunteer work": ["volunteer work", "volunteer experience", "volunteering"],
    volunteering: ["volunteering", "volunteer experience", "volunteer work"]
  };
  return aliases[normalized] || (getResumeSectionNames().has(normalized) ? [normalized] : []);
}

function findSectionRange(lines, sectionCandidates) {
  const candidates = sectionCandidates.flatMap((section) => {
    const aliases = getResumeSectionAliases(section);
    return aliases.length ? aliases : [normalizeSectionLabel(section)];
  });
  const start = lines.findIndex((line) => candidates.includes(line.trim().toLowerCase()));
  if (start === -1) return null;

  let end = lines.length;
  for (let index = start + 1; index < lines.length; index += 1) {
    if (isSectionHeaderLine(lines[index]) && !isUppercaseEntryContentAt(lines, index, sectionCandidates)) {
      end = index;
      break;
    }
  }

  return { start, end };
}

function isUppercaseEntryContentAt(lines, index, sectionCandidates) {
  const line = String(lines[index] || "").trim();
  if (!line || getResumeSectionNames().has(line.toLowerCase())) return false;
  const section = canonicalSectionTitle(sectionCandidates[0] || "");
  const previous = String(lines[index - 1] || "").trim();

  if (section === "experience") {
    return /^[A-Z][A-Z0-9&.' +#-]{1,45}$/.test(line)
      && Boolean(extractYears(previous))
      && removeYears(previous).trim().length <= 80
      && !/[.!?]$/.test(removeYears(previous).trim());
  }

  if (section === "education") {
    return /^[A-Z][A-Z0-9&.' +#-]{1,45}$/.test(line) && isDegreeLine(previous);
  }

  return false;
}

function getSectionStartIndex(text, sectionCandidates) {
  const lines = text.split("\n");
  const range = findSectionRange(lines, sectionCandidates);
  return range ? range.start : -1;
}

function isSectionBefore(text, firstSection, secondSection) {
  const first = getSectionStartIndex(text, [firstSection]);
  const second = getSectionStartIndex(text, [secondSection]);
  return first !== -1 && second !== -1 && first < second;
}

function isSectionAfter(text, firstSection, secondSection) {
  const first = getSectionStartIndex(text, [firstSection]);
  const second = getSectionStartIndex(text, [secondSection]);
  return first !== -1 && second !== -1 && first > second;
}

function cleanConfirmedText(text) {
  return String(text || "").replace(/^[-*•]\s*/, "").trim();
}

function cleanSkillItem(text) {
  return String(text || "")
    .replace(/\([^)]*\bconfirm(?:ed|ation)?[^)]*\)/gi, "")
    .replace(/\[[^\]]*\b(confirm|confirmed|user input|ask user|tbd|to be|pending)[^\]]*\]/gi, "")
    .replace(/^[-*•]\s*/, "")
    .replace(/^[&:,\s•-]+/, "")
    .replace(/[&:,\s•-]+$/, "")
    .replace(/\s*&\s*$/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function parseStructuredFields(text) {
  const fields = {};
  const details = [];
  const bullets = [];

  for (const rawLine of String(text || "").split("\n")) {
    const line = rawLine.trim();
    if (!line) continue;

    const fieldMatch = line.match(/^([A-Za-z][A-Za-z /_-]{1,28})\s*:\s*(.+)$/);
    if (fieldMatch) {
      const key = normalizeSectionLabel(fieldMatch[1]).replace(/\s+/g, "_");
      fields[key] = fieldMatch[2].trim();
      continue;
    }

    if (/^[-*•]/.test(line)) {
      bullets.push(stripLeadingBullet(line));
    } else {
      details.push(line);
    }
  }

  return { fields, details, bullets };
}

function getFirstField(fields, names) {
  for (const name of names) {
    if (fields[name]) return fields[name];
  }
  return "";
}

function getDraftTextWithoutFieldValues(text, values) {
  const valueSet = new Set(values.filter(Boolean).map((value) => normalize(removeYears(value))));
  return String(text || "")
    .split("\n")
    .filter((line) => {
      const clean = normalize(removeYears(line.replace(/^[-*•]\s*/, "").replace(/^([A-Za-z][A-Za-z /_-]{1,28})\s*:\s*/, ""))).trim();
      return clean && !valueSet.has(clean);
    })
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

function makeResumeBullet(text) {
  const clean = cleanConfirmedText(text)
    .replace(/^bullets?\s*:\s*/i, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!clean) return "";
  return `- ${clean.replace(/[.;]\s*$/, "")}.`;
}

function getSkillDraft(change) {
  const text = buildSkillDraftText(change);
  const looksExplicit = looksLikeSkillList(text) || splitLines(text).every((line) => line.length < 80 && !/[?.]/.test(line));
  const hasLevelSyntax = /\b(expert|advanced|advance|proficient|working knowledge|intermediate|basic|beginner)\b/i.test(text);
  const typedSkills = looksExplicit
    ? (hasLevelSyntax ? splitExplicitSkillItems(text) : splitSkillItems(text))
    : [];
  const levelAwareSkills = typedSkills.length ? [] : extractSkillNamesWithLevels(text);
  const extractedSkills = typedSkills.length || levelAwareSkills.length ? [] : extractSkillNamesFromText(text);
  const skills = unique([
    ...levelAwareSkills,
    ...typedSkills,
    ...extractedSkills
  ]
    .map(cleanSkillItem)
    .filter((item) => item && item.length <= 48 && !/[?.]/.test(item)));
  return skills;
}

function buildSkillDraftText(change) {
  const skillText = change.skillDraftText || getDefaultSkillDraft(change) || change.suggestedText || "";
  const levelText = cleanConfirmedText(change.skillLevelText || "");
  if (!levelText) return skillText;

  const baseSkills = splitSkillItems(skillText);
  const levelItems = splitExplicitSkillItems(levelText);
  const levelBySkill = new Map();

  for (const item of levelItems) {
    const level = getSkillLevelValue(item);
    if (!level) continue;
    levelBySkill.set(normalizeSkillForCompare(stripSkillLevel(item)), level);
  }

  const plainLevel = getPlainSkillLevel(levelText);
  if (!baseSkills.length) return levelText;

  const merged = baseSkills.map((skill) => {
    if (getSkillLevelValue(skill)) return skill;
    const base = normalizeSkillDisplayName(skill);
    const level = levelBySkill.get(normalizeSkillForCompare(base)) || (baseSkills.length === 1 ? plainLevel : "");
    return level ? `${stripSkillLevel(base)} (${level})` : base;
  });

  for (const item of levelItems) {
    if (getPlainSkillLevel(item)) continue;
    const base = stripSkillLevel(item);
    if (!base || merged.some((skill) => normalizeSkillForCompare(stripSkillLevel(skill)) === normalizeSkillForCompare(base))) continue;
    merged.push(item);
  }

  return merged.join(", ");
}

function getPlainSkillLevel(text) {
  const match = cleanConfirmedText(text).match(/^(expert|advanced|advance|proficient|working knowledge|intermediate|basic|beginner)$/i);
  return match ? normalizeSkillLevel(match[1]) : "";
}

function getSkillLevelValue(skill) {
  const match = String(skill || "").match(/\((expert|advanced|advance|proficient|working knowledge|intermediate|basic|beginner)\)$/i);
  return match ? normalizeSkillLevel(match[1]) : "";
}

function stripSkillLevel(skill) {
  return String(skill || "").replace(/\s*\((expert|advanced|advance|proficient|working knowledge|intermediate|basic|beginner)\)\s*$/i, "").trim();
}

function normalizeSkillLevel(level) {
  const clean = cleanConfirmedText(level).toLowerCase();
  return clean === "advance" ? "advanced" : clean;
}

function getProjectDraft(change) {
  if (change.projectName || change.projectYear || change.projectDetails) {
    const bullet = makeResumeBullet(change.projectDetails || "");
    return {
      name: cleanEntryTitle(change.projectName || ""),
      year: extractYears(change.projectYear || "") || cleanConfirmedText(change.projectYear || ""),
      label: cleanConfirmedText(change.projectLabel || ""),
      bullets: bullet ? [bullet] : []
    };
  }
  const parsed = parseStructuredFields(change.suggestedText);
  const name = getFirstField(parsed.fields, ["project", "project_name", "name", "title"]) || removeYears(parsed.details[0] || "");
  const year = getFirstField(parsed.fields, ["year", "years", "date", "dates"]) || extractYears(change.suggestedText);
  const label = getFirstField(parsed.fields, ["label", "type", "context"]) || "";
  const detailText = parsed.bullets.join(" ") || getDraftTextWithoutFieldValues(change.suggestedText, [name, year, label]);
  const bullet = makeResumeBullet(detailText);
  return { name: cleanEntryTitle(name), year, label, bullets: bullet ? [bullet] : [] };
}

function getEducationDraft(change) {
  if (change.educationProgram || change.educationInstitution || change.educationYear || change.educationDetails) {
    return {
      program: cleanEntryTitle(change.educationProgram || ""),
      institution: cleanEntryTitle(change.educationInstitution || ""),
      year: extractYears(change.educationYear || "") || cleanConfirmedText(change.educationYear || ""),
      detail: cleanConfirmedText(change.educationDetails || "")
    };
  }
  const parsed = parseStructuredFields(change.suggestedText);
  const program = getFirstField(parsed.fields, ["program", "course", "degree", "education", "title", "name"]) || removeYears(parsed.details[0] || "");
  const institution = getFirstField(parsed.fields, ["institution", "provider", "school", "university", "organization"]) || parsed.fields.issuer || "";
  const year = getFirstField(parsed.fields, ["year", "years", "date", "dates"]) || extractYears(change.suggestedText);
  const detailText = parsed.bullets.join(" ") || getDraftTextWithoutFieldValues(change.suggestedText, [program, institution, year]);
  return { program: cleanEntryTitle(program), institution: cleanEntryTitle(institution), year, detail: detailText };
}

function getCertificationDraft(change) {
  if (change.certificationName || change.certificationIssuer || change.certificationYear || change.certificationCredentialId) {
    return {
      name: cleanEntryTitle(change.certificationName || ""),
      issuer: cleanEntryTitle(change.certificationIssuer || ""),
      year: extractYears(change.certificationYear || "") || cleanConfirmedText(change.certificationYear || ""),
      credentialId: cleanConfirmedText(change.certificationCredentialId || "")
    };
  }
  const parsed = parseStructuredFields(change.suggestedText);
  const name = getFirstField(parsed.fields, ["certification", "certificate", "name", "title"]) || removeYears(parsed.details[0] || "");
  const issuer = getFirstField(parsed.fields, ["issuer", "provider", "institution", "organization"]) || "";
  const year = getFirstField(parsed.fields, ["year", "years", "date", "dates"]) || extractYears(change.suggestedText);
  const credentialId = getFirstField(parsed.fields, ["credential_id", "credential id", "credential", "id"]) || "";
  return { name: cleanEntryTitle(name), issuer: cleanEntryTitle(issuer), year, credentialId: cleanConfirmedText(credentialId) };
}

function getExperienceDraft(change) {
  const parsed = parseStructuredFields(change.suggestedText);
  const role = getFirstField(parsed.fields, ["role", "job_title", "title", "position"]);
  const company = getFirstField(parsed.fields, ["company", "workplace", "employer", "organization"]);
  const years = getFirstField(parsed.fields, ["year", "years", "date", "dates"]) || extractYears(change.suggestedText);
  const detailText = parsed.bullets.join(" ") || getDraftTextWithoutFieldValues(change.suggestedText, [role, company, years]);
  const bullet = makeResumeBullet(detailText);
  return { role: cleanEntryTitle(role), company: cleanEntryTitle(company), years, bullets: bullet ? [bullet] : [] };
}

function getPreviewRequirementKey(change) {
  return [
    change.id,
    getSelectedPlacements(change).join(","),
    change.experienceEntryKey || "",
    getExperienceAction(change),
    change.experienceBulletIndex || "",
    cleanConfirmedText(change.experienceTargetTitle),
    cleanConfirmedText(change.experienceTargetCompany),
    cleanConfirmedText(change.experienceTargetYears),
    cleanConfirmedText(change.experienceOriginalBullet),
    cleanConfirmedText(change.experienceNewTitle),
    cleanConfirmedText(change.experienceNewCompany),
    cleanConfirmedText(change.experienceNewYears),
    cleanConfirmedText(change.suggestedText),
    cleanConfirmedText(change.skillDraftText),
    cleanConfirmedText(change.skillLevelText),
    cleanConfirmedText(change.experienceDraftText),
    cleanConfirmedText(change.projectAction),
    cleanConfirmedText(change.projectEntryKey),
    cleanConfirmedText(change.projectTargetName),
    cleanConfirmedText(change.projectTargetYear),
    cleanConfirmedText(change.projectBulletIndex),
    cleanConfirmedText(change.projectOriginalBullet),
    cleanConfirmedText(change.projectName),
    cleanConfirmedText(change.projectYear),
    cleanConfirmedText(change.projectLabel),
    cleanConfirmedText(change.projectDetails),
    cleanConfirmedText(change.educationProgram),
    cleanConfirmedText(change.educationInstitution),
    cleanConfirmedText(change.educationYear),
    cleanConfirmedText(change.educationAction),
    cleanConfirmedText(change.educationEntryKey),
    cleanConfirmedText(change.educationTargetDegree),
    cleanConfirmedText(change.educationTargetInstitution),
    cleanConfirmedText(change.educationTargetYears),
    cleanConfirmedText(change.educationDetailIndex),
    cleanConfirmedText(change.educationOriginalDetail),
    cleanConfirmedText(change.educationDetails),
    cleanConfirmedText(change.certificationName),
    cleanConfirmedText(change.certificationIssuer),
    cleanConfirmedText(change.certificationYear),
    cleanConfirmedText(change.certificationCredentialId),
    cleanConfirmedText(change.otherSectionName),
    cleanConfirmedText(change.otherAction),
    cleanConfirmedText(change.otherItemIndex),
    cleanConfirmedText(change.otherPlacementText),
    cleanConfirmedText(change.volunteerTitle),
    cleanConfirmedText(change.volunteerPlace),
    cleanConfirmedText(change.volunteerYears),
    cleanConfirmedText(change.volunteerDetails)
  ].join("|");
}

function getPreviewablePlacements(change) {
  return getSelectedPlacements(change).filter((placement) => placement !== "omit");
}

function getPlacementsToApply(change) {
  return placementFlow.getPlacementsToApply(change);
}

function getPlacementPreviewKey(change, placement) {
  return getPreviewRequirementKey({ ...change, placement, placements: [placement] });
}

function getPlacementSectionTitle(placement, change = {}) {
  const titles = {
    skills: "Skills",
    experience: "Experience",
    projects: "Selected Projects",
    education: "Education",
    certifications: "Certifications",
    other: normalizeCustomSectionTitle(change.otherSectionName || "") || "Other"
  };
  return titles[placement] || change.section || "Resume";
}

function hasSection(text, sectionCandidates) {
  return Boolean(findSectionRange(text.split("\n"), sectionCandidates));
}

function experienceCompanyExists(text, company) {
  if (!company) return false;
  const lines = String(text || "").split("\n");
  const range = findSectionRange(lines, ["experience", "professional experience"]);
  if (!range) return false;
  return lines.slice(range.start + 1, range.end).some((line) => normalize(line).includes(normalize(company)));
}

function validateConfirmedPlacement(change, resumeText) {
  const placements = getSelectedPlacements(change);
  if (!placements.length) return { error: "Choose at least one relevant section before previewing or accepting." };
  if (placements.includes("omit")) return {};

  if (placements.includes("other") && !cleanConfirmedText(change.otherSectionName)) {
    return { error: "Write the Other section name before saving it." };
  }

  const otherIsVolunteer = placements.includes("other") && isVolunteerSectionTitle(change.otherSectionName);
  if (otherIsVolunteer) {
    const draft = getVolunteerDraft(change);
    if (!draft.title || !draft.place || !draft.years || !draft.bullet) {
      return { error: "Volunteer Experience needs Volunteer title/role, Organization/place, Years, and one bullet." };
    }
  }

  if (placements.includes("other") && !otherIsVolunteer && !cleanConfirmedText(change.otherPlacementText)) {
    return { error: "Write what should be added or asked for this Other section." };
  }

  if (placements.includes("skills") && !getSkillDraft(change).length) {
    return { error: "List at least one concrete skill to add to Skills." };
  }

  if (placements.includes("experience")) {
    const evidence = cleanConfirmedText(change.experienceDraftText || change.suggestedText);
    const action = getExperienceAction(change, resumeText);
    if (action === "new_experience") {
      const draft = getNewExperienceDraft(change);
      if (!draft.role || !draft.company || !draft.years) {
        return { error: "New Experience needs Job title, Company, and Years." };
      }
      return {};
    }
    const target = getSelectedExperienceTarget(change, resumeText);
    if (!target) return { error: "Choose an existing Experience entry first, or choose Add new experience entry." };
    if (!evidence) return { error: "Write the short evidence for this role before previewing or accepting." };
    if (action === "enhance" && !target.bullets.length) {
      return { error: "This role has no parsed bullets. Add a new bullet instead." };
    }
  }

  if (placements.includes("projects")) {
    const action = getProjectAction(change);
    if (action === "new") {
      const draft = getProjectDraft(change);
      if (!draft.name || !draft.year) return { error: "Project placement needs at least Project name and Year. Example: Project: Resume Tailor / Year: 2026." };
    } else {
      const target = getSelectedProjectTarget(change, resumeText);
      if (!target) return { error: "Choose an existing Project first, or choose Add a new project." };
      if (!cleanConfirmedText(change.projectDetails || "")) return { error: "Write the project bullet before previewing or accepting." };
      if (action === "rewrite" && !target.bullets.length) {
        return { error: "This project has no parsed bullets. Add a new bullet instead." };
      }
    }
    if (action === "new" && !hasSection(resumeText, ["projects", "selected projects"])) {
      return { warning: "This will create a new Selected Projects section with one item. Use it only if the project is substantial." };
    }
  }

  if (placements.includes("education")) {
    const action = getEducationAction(change);
    if (action === "new") {
      const draft = getEducationDraft(change);
      if (!draft.program || !draft.institution || !draft.year) {
        return { error: "Education placement needs Program/Course, Institution/Provider, and Year." };
      }
    } else {
      const target = getSelectedEducationTarget(change, resumeText);
      if (!target) return { error: "Choose an existing Education entry, or choose Add a new education entry." };
      if (!cleanConfirmedText(change.educationDetails || "")) {
        return { error: "Write the education detail before previewing or accepting." };
      }
      if (action === "rewrite" && !target.details.length) {
        return { error: "This education entry has no parsed details. Add a new detail instead." };
      }
    }
  }

  if (placements.includes("certifications")) {
    const draft = getCertificationDraft(change);
    if (!draft.name || !draft.issuer || !draft.year) {
      return { error: "Certification placement needs Certification name, Issuer, and Year." };
    }
  }

  return {};
}

function isSkillConfirmation(change) {
  const text = normalize([change.section, change.missingTerm, change.promptText, change.suggestedText].filter(Boolean).join(" "));
  if (/\b(skills?|technical skills?|proficiency|working knowledge)\b/.test(text)) return true;
  if (/\b(project|develop|built|designed|evaluat|experiment|metric|judge|framework)\b/.test(text)) return false;
  return extractSkillNamesFromChange(change).length > 0;
}

function extractSkillNamesFromChange(change) {
  const answerSkillsWithLevels = extractSkillNamesWithLevels(change.suggestedText || "");
  if (answerSkillsWithLevels.length) return answerSkillsWithLevels;
  const answerSkills = extractSkillNamesFromText(change.suggestedText || "");
  if (answerSkills.length) return answerSkills;
  const text = [change.missingTerm, change.promptText].filter(Boolean).join(" ");
  return extractSkillNamesFromText(text);
}

function extractSkillNamesWithLevels(text) {
  const skillNames = extractSkillNamesFromText(text);
  const levels = ["expert", "advanced", "advance", "proficient", "working knowledge", "intermediate", "basic", "beginner"];
  const results = [];
  let foundAnyLevel = false;

  for (const skill of skillNames) {
    const skillPattern = escapeRegExp(skill).replace("\\/","/");
    const afterPattern = new RegExp(`${skillPattern}\\s*(?:-|:|\\(|,)?\\s*(${levels.join("|")})\\)?`, "i");
    const beforePattern = new RegExp(`(${levels.join("|")})\\s+(?:in\\s+)?${skillPattern}`, "i");
    const level = text.match(afterPattern)?.[1] || text.match(beforePattern)?.[1] || "";
    if (level) {
      foundAnyLevel = true;
      results.push(`${skill} (${level.toLowerCase()})`);
    } else {
      results.push(skill);
    }
  }

  return foundAnyLevel ? unique(results) : [];
}

function extractSkillNamesFromText(text) {
  const fromLexicon = specificTopicLexicon
    .filter((term) => textContainsTopicTerm(text, term))
    .map(titleCaseKnownTerm);
  const acronyms = (text.match(/\b(?:SQL|RAG|LLM|NLP|GenAI)\b/g) || []).map(titleCaseKnownTerm);
  const namedTools = extractProgrammingAndToolNames(text);

  return unique([...namedTools, ...acronyms, ...fromLexicon])
    .filter((term) => !ignoredExtractedTopics.has(term.toLowerCase()))
    .slice(0, 8);
}

function escapeRegExp(text) {
  return String(text).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function resumeCoversSkillTerm(resumeText, term) {
  const lower = normalize(resumeText);
  const normalizedTerm = normalize(term).trim();
  if (!normalizedTerm || ignoredExtractedTopics.has(normalizedTerm)) return true;

  const equivalents = {
    "ml": ["machine learning", "ml"],
    "machine learning": ["machine learning", "ml"],
    "a/b testing": ["a/b testing", "ab testing", "experimentation"],
    "experimentation": ["experimentation", "a/b testing", "ab testing"],
    "genai": ["genai", "generative ai"],
    "generative ai": ["generative ai", "genai"],
    "llm": ["llm", "large language model"],
    "rag": ["rag", "retrieval augmented generation", "retrieval-augmented generation"]
  };

  const candidates = equivalents[normalizedTerm] || [normalizedTerm];
  return candidates.some((candidate) => {
    if (/^[a-z0-9 ]+$/.test(candidate)) {
      return new RegExp(`\\b${escapeRegExp(candidate)}\\b`, "i").test(resumeText);
    }
    return lower.includes(candidate);
  });
}

function looksLikeSkillList(text) {
  const clean = String(text || "").trim();
  if (!clean) return false;
  const separators = (clean.match(/[•,;]/g) || []).length;
  return separators >= 2 && clean.length < 420 && !/[?]/.test(clean);
}

function getConfirmationSkillTerms(change) {
  const text = [
    change.missingTerm,
    change.promptText,
    change.originalText,
    change.suggestedText
  ].filter(Boolean).join(" ");
  return extractSkillNamesFromText(text);
}

function pruneCoveredConfirmation(change, resumeText) {
  if (change.requiresDateWording) return change;
  if (!change.requiresUserWording && change.type !== "add_keyword") return change;

  const semanticTopic = missingExperienceDedupeTopic(change);
  if (semanticTopic && resumeCoversMissingExperienceTopic(resumeText, semanticTopic)) return null;

  const terms = getConfirmationSkillTerms(change);
  if (!terms.length) return change;

  const uncoveredTerms = terms.filter((term) => !resumeCoversSkillTerm(resumeText, term));
  if (!uncoveredTerms.length) return null;
  if (uncoveredTerms.length === terms.length) return change;

  const pruned = {
    ...change,
    missingTerm: uncoveredTerms.map(titleCaseKnownTerm).join(", ")
  };

  if (looksLikeSkillList(pruned.promptText)) {
    pruned.promptText = uncoveredTerms.map(titleCaseKnownTerm).join(" • ");
  }

  if (looksLikeSkillList(pruned.originalText)) {
    pruned.originalText = uncoveredTerms.map(titleCaseKnownTerm).join(" • ");
  }

  return pruned;
}

function extractProgrammingAndToolNames(text) {
  const terms = [];
  const patterns = [
    [/(^|[^A-Za-z0-9+#])C\/C\+\+(?=$|[^A-Za-z0-9+#])/g, ["C", "C++"]],
    [/(^|[^A-Za-z0-9+#])C\+\+(?=$|[^A-Za-z0-9+#])/g, ["C++"]],
    [/(^|[^A-Za-z0-9+#])C#(?=$|[^A-Za-z0-9+#])/g, ["C#"]],
    [/(^|[^A-Za-z0-9+#])C(?=$|[^A-Za-z0-9+#])/g, ["C"]],
    [/\bPython\b/g, ["Python"]],
    [/\bJava\b/g, ["Java"]],
    [/\bPerl\b/g, ["Perl"]],
    [/\bJavaScript\b/g, ["JavaScript"]],
    [/\bTypeScript\b/g, ["TypeScript"]],
    [/\bScala\b/g, ["Scala"]],
    [/\bR\b/g, ["R"]],
    [/\bLangChain\b/g, ["LangChain"]],
    [/\bSpark\b/g, ["Spark"]],
    [/\bOpenAI\b/g, ["OpenAI"]],
    [/\bHugging Face\b/g, ["Hugging Face"]]
  ];

  for (const [pattern, names] of patterns) {
    if (pattern.test(text)) terms.push(...names);
  }

  return unique(terms);
}

function normalizeSkillDisplayName(skill) {
  const clean = String(skill || "").trim().replace(/^[-*•]\s*/, "");
  if (!clean) return "";

  const levelMatch = clean.match(/^(.+?)\s*\(([^)]+)\)$/);
  if (levelMatch) {
    const level = normalizeSkillLevel(levelMatch[2]);
    return level
      ? `${formatSkillTerm(levelMatch[1].trim())} (${level})`
      : `${formatSkillTerm(levelMatch[1].trim())} (${levelMatch[2].trim().toLowerCase()})`;
  }

  const delimitedLevelMatch = clean.match(/^(.+?)\s*(?:-|:)\s*(expert|advanced|advance|proficient|working knowledge|intermediate|basic|beginner)$/i);
  if (delimitedLevelMatch) {
    return `${formatSkillTerm(delimitedLevelMatch[1].trim())} (${normalizeSkillLevel(delimitedLevelMatch[2])})`;
  }

  return formatSkillTerm(clean);
}

function splitExplicitSkillItems(text) {
  return unique(String(text || "")
    .split(/[,;•|]+/)
    .map(normalizeSkillDisplayName)
    .filter(Boolean));
}

function normalizeSkillForCompare(skill) {
  return normalizeSkillDisplayName(skill).toLowerCase();
}

function uniqueSkills(items) {
  const seen = new Set();
  const result = [];
  for (const item of items.map(normalizeSkillDisplayName).filter(Boolean)) {
    const key = normalizeSkillForCompare(stripSkillLevel(item));
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(item);
  }
  return result;
}

function mergeSkillItems(existingItems, addedItems) {
  const order = [];
  const byBase = new Map();

  for (const item of existingItems.map(normalizeSkillDisplayName).filter(Boolean)) {
    const key = normalizeSkillForCompare(stripSkillLevel(item));
    if (!key) continue;
    if (!byBase.has(key)) order.push(key);
    byBase.set(key, item);
  }

  for (const item of addedItems.map(normalizeSkillDisplayName).filter(Boolean)) {
    const key = normalizeSkillForCompare(stripSkillLevel(item));
    if (!key) continue;
    if (!byBase.has(key)) order.push(key);
    const existing = byBase.get(key);
    byBase.set(key, getSkillLevelValue(item) || !existing ? item : existing);
  }

  return order.map((key) => byBase.get(key)).filter(Boolean);
}

function areSkillListsEquivalent(left, right) {
  const serialize = (items) => uniqueSkills(items).map(normalizeSkillForCompare).join("|");
  return serialize(left) === serialize(right);
}

function formatSkillTerm(term) {
  const known = titleCaseKnownTerm(term);
  if (known !== term) return known;
  if (/[A-Z]{2,}|[+/]/.test(term)) return term;
  return titleCase(term);
}

function getSkillSeparator(line) {
  if (line.includes("•")) return " • ";
  if (line.includes(";")) return "; ";
  return " • ";
}

function isProgrammingLanguageSkill(skill) {
  return /^(C|C\+\+|C#|Python|Java|Perl|JavaScript|TypeScript|Scala|R|SQL)$/i.test(normalizeSkillDisplayName(skill).replace(/\s*\([^)]*\)\s*$/, ""));
}

function stripSkillCategoryPrefix(line) {
  return String(line || "").replace(/^\s*(Programming\s+(?:Languages|&\s*Tools)|Tools|Languages)\s*:\s*/i, "");
}

function addSkillsToResume(text, skills) {
  const cleanSkills = uniqueSkills(skills);
  if (!cleanSkills.length) return text;

  const lines = text.split("\n");
  const range = findSectionRange(lines, ["skills", "technical skills"]);

  if (!range) {
    return `${text.trim()}\n\nSKILLS\n${formatSkillsToInsert(cleanSkills)}`;
  }

  const existingSkillItems = lines.slice(range.start + 1, range.end)
    .flatMap((line) => splitSkillItems(stripLeadingBullet(line)));
  const mergedSkills = mergeSkillItems(existingSkillItems, cleanSkills);
  if (areSkillListsEquivalent(existingSkillItems, mergedSkills)) return text;
  const replacementLines = formatSkillsToInsert(mergedSkills).split("\n");
  lines.splice(range.start + 1, range.end - range.start - 1, ...replacementLines);

  return lines.join("\n");
}

function formatSkillsToInsert(skills) {
  const programming = skills.filter(isProgrammingLanguageSkill);
  const other = skills.filter((skill) => !isProgrammingLanguageSkill(skill));
  if (programming.length >= 2 && other.length) {
    return `${other.join(" • ")}\nProgramming Languages: ${programming.join(" • ")}`;
  }
  if (programming.length >= 2) return `Programming Languages: ${programming.join(" • ")}`;
  return skills.join(" • ");
}

let sectionInserter;

function getSectionInserter() {
  if (sectionInserter) return sectionInserter;
  sectionInserter = window.RoleFitSectionInserter.create({
    extractYears,
    findSectionRange,
    stripLeadingBullet
  });
  return sectionInserter;
}

function insertBlockIntoSection(text, sectionCandidates, sectionTitle, blockLines) {
  return getSectionInserter().insertBlockIntoSection(text, sectionCandidates, sectionTitle, blockLines);
}

function getYearSortValue(text) {
  return getSectionInserter().getYearSortValue(text);
}

function isDatedEntryStartLine(line) {
  return getSectionInserter().isDatedEntryStartLine(line);
}

function insertDatedBlockIntoSection(text, sectionCandidates, sectionTitle, blockLines) {
  return getSectionInserter().insertDatedBlockIntoSection(text, sectionCandidates, sectionTitle, blockLines);
}

function getProjectBlock(change) {
  const draft = getProjectDraft(change);
  return [
    `${draft.name} ${draft.year}`.trim(),
    draft.label,
    ...draft.bullets
  ].filter(Boolean);
}

function addProjectToResume(text, change) {
  const action = getProjectAction(change, text);
  if (action === "new_bullet" || action === "rewrite") {
    return addProjectDetailToResume(text, change);
  }
  return insertBlockIntoSection(text, ["selected projects", "projects"], "Selected Projects", getProjectBlock(change));
}

function findProjectEntryBounds(lines, range, target) {
  if (!range || !target) return null;
  let entryIndex = -1;
  let start = -1;

  for (let index = range.start + 1; index < range.end; index += 1) {
    const line = lines[index] || "";
    if (!line.trim() || /^\s*[-*•]\s+/.test(line)) continue;
    entryIndex += 1;
    if (entryIndex === target.index) {
      start = index;
      break;
    }
  }

  if (start === -1) return null;
  let end = range.end;
  for (let index = start + 1; index < range.end; index += 1) {
    const line = lines[index] || "";
    if (!line.trim() || /^\s*[-*•]\s+/.test(line)) continue;
    if (!extractYears(line) && index === start + 1) continue;
    end = index;
    break;
  }

  // Keep a new bullet inside the project entry, before any separator blank line.
  while (end > start + 1 && !String(lines[end - 1] || "").trim()) {
    end -= 1;
  }

  return { start, end };
}

function addProjectDetailToResume(text, change) {
  const detail = cleanConfirmedText(change.projectDetails || "");
  if (!detail) return text;

  const lines = text.split("\n");
  const range = findSectionRange(lines, ["selected projects", "projects"]);
  const target = getSelectedProjectTarget(change, text);
  const bounds = findProjectEntryBounds(lines, range, target);
  if (!bounds) return text;

  const bullet = makeResumeBullet(detail);
  if (getProjectAction(change, text) === "rewrite" && target.bullets.length) {
    const originalBullet = getSelectedProjectBullet(change, text);
    for (let index = bounds.start + 1; index < bounds.end; index += 1) {
      if (normalizeBulletForMatch(lines[index]) !== normalizeBulletForMatch(originalBullet)) continue;
      lines[index] = bullet;
      return lines.join("\n");
    }

    // A rewrite must never silently become an added bullet if its selected
    // target is stale or no longer matches the current resume.
    return text;
  }

  lines.splice(bounds.end, 0, bullet);
  return lines.join("\n");
}

function getEducationBlock(change) {
  const draft = getEducationDraft(change);
  return [
    `${draft.program} ${draft.year}`.trim(),
    draft.institution,
    draft.detail
  ].filter(Boolean);
}

function findEducationEntryBounds(lines, range, target) {
  if (!range || !target) return null;
  let start = -1;
  for (let index = range.start + 1; index < range.end; index += 1) {
    const clean = stripLeadingBullet(lines[index]);
    if (normalize(removeYears(clean)) === normalize(target.degree)) {
      start = index;
      break;
    }
  }
  if (start === -1) return null;
  let end = range.end;
  for (let index = start + 1; index < range.end; index += 1) {
    const clean = stripLeadingBullet(lines[index]);
    if (!clean || isDegreeLine(clean) || (extractYears(clean) && !looksLikeInstitutionOrCompany(clean))) {
      end = index;
      break;
    }
  }
  return { start, end };
}

function addEducationDetailToResume(text, change) {
  const detail = cleanConfirmedText(change.educationDetails || "");
  if (!detail) return text;

  const lines = text.split("\n");
  const range = findSectionRange(lines, ["education"]);
  const target = getSelectedEducationTarget(change, text);
  const bounds = findEducationEntryBounds(lines, range, target);
  if (!bounds) return text;

  if (getEducationAction(change) === "rewrite" && target.details.length) {
    const originalDetail = getSelectedEducationDetail(change, text);
    for (let index = bounds.start + 1; index < bounds.end; index += 1) {
      if (normalize(stripLeadingBullet(lines[index])) !== normalize(stripLeadingBullet(originalDetail))) continue;
      lines[index] = detail;
      return lines.join("\n");
    }
  }

  lines.splice(bounds.end, 0, detail);
  return lines.join("\n");
}

function addEducationToResume(text, change) {
  const action = getEducationAction(change, text);
  if (action === "existing" || action === "rewrite") {
    return addEducationDetailToResume(text, change);
  }
  return insertDatedBlockIntoSection(text, ["education"], "Education", getEducationBlock(change));
}

function getCertificationBlock(change) {
  const draft = getCertificationDraft(change);
  const issuerLine = [draft.issuer, draft.credentialId ? `Credential ID: ${draft.credentialId}` : ""]
    .filter(Boolean)
    .join(" | ");
  return [
    `${draft.name} ${draft.year}`.trim(),
    issuerLine
  ];
}

function addCertificationToResume(text, change) {
  return insertBlockIntoSection(text, ["certifications"], "Certifications", getCertificationBlock(change));
}

function normalizeCustomSectionTitle(title) {
  const clean = cleanConfirmedText(title)
    .replace(/[:#]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!clean) return "";
  if (isVolunteerSectionTitle(clean)) return "Volunteer Experience";
  if (/^achiev?ments?$/i.test(clean)) return "Achievements";
  return titleCase(clean);
}

function getVolunteerDraft(change) {
  const title = cleanEntryTitle(change.volunteerTitle || "");
  const place = cleanEntryTitle(change.volunteerPlace || "");
  const years = extractYears(change.volunteerYears || "") || cleanConfirmedText(change.volunteerYears || "");
  const detail = cleanConfirmedText(change.volunteerDetails || change.otherPlacementText || "");
  return {
    title,
    place,
    years,
    bullet: detail ? makeResumeBullet(detail) : ""
  };
}

function getVolunteerExperienceBlock(change) {
  const draft = getVolunteerDraft(change);
  return [
    `${draft.title} ${draft.years}`.trim(),
    draft.place,
    draft.bullet
  ].filter(Boolean);
}

function getOtherSectionBlock(change) {
  const text = cleanConfirmedText(change.otherPlacementText || "");
  if (!text) return [];
  if (/^[-*•]\s*/.test(text)) return [makeResumeBullet(text)];
  return [makeResumeBullet(text)];
}

function replaceOtherSectionItem(text, change) {
  const title = normalizeCustomSectionTitle(change.otherSectionName || "");
  const replacement = getOtherSectionBlock(change)[0];
  if (!title || !replacement) return text;

  const lines = text.split("\n");
  const items = getEditableSectionItems(title, text);
  const index = Number(change.otherItemIndex || 0);
  const selected = items[Number.isFinite(index) ? index : 0] || items[0];
  if (!selected) return text;

  lines[selected.index] = replacement;
  return lines.join("\n");
}

function addOtherSectionToResume(text, change) {
  const title = normalizeCustomSectionTitle(change.otherSectionName || "");
  if (!title) return text;
  if (isVolunteerSectionTitle(title)) {
    return insertDatedBlockIntoSection(
      text,
      ["volunteer experience", "volunteer work", "volunteering"],
      "Volunteer Experience",
      getVolunteerExperienceBlock(change)
    );
  }
  const action = change.otherAction || "new";
  if (action === "enhance" && getEditableSectionItems(title, text).length) {
    return replaceOtherSectionItem(text, change);
  }
  return insertBlockIntoSection(text, [title], title, getOtherSectionBlock(change));
}

function isLikelyExperienceEntryLine(line) {
  const clean = stripLeadingBullet(line);
  if (!clean || /^[-*•]/.test(line)) return false;
  return Boolean(extractYears(clean) || looksLikeJobTitle(clean));
}

function findExperienceInsertIndex(lines, range, suggestedText) {
  const lowerSuggested = normalize(suggestedText);
  let targetStart = range.start + 1;

  for (let index = range.start + 1; index < range.end; index += 1) {
    const clean = stripLeadingBullet(lines[index]);
    if (clean.length >= 4 && lowerSuggested.includes(normalize(clean))) {
      targetStart = index;
      break;
    }
  }

  for (let index = targetStart + 1; index < range.end; index += 1) {
    if (isLikelyExperienceEntryLine(lines[index])) return index;
  }

  return range.end;
}

function findExperienceCompanyInsertIndex(lines, range, company) {
  if (!company) return -1;
  for (let index = range.start + 1; index < range.end; index += 1) {
    if (!normalize(lines[index]).includes(normalize(company))) continue;
    for (let next = index + 1; next < range.end; next += 1) {
      if (!lines[next].trim()) return next;
      if (isLikelyExperienceEntryLine(lines[next])) return next;
    }
    return range.end;
  }
  return -1;
}

function normalizeBulletForMatch(text) {
  return normalize(stripLeadingBullet(text)).replace(/[.;]\s*$/, "");
}

function makeEnhancedExperienceBullet(originalBullet, evidenceText) {
  const original = stripLeadingBullet(originalBullet).replace(/[.;]\s*$/, "").trim();
  const evidence = cleanConfirmedText(evidenceText).replace(/^[-*•]\s*/, "").replace(/[.;]\s*$/, "").trim();
  if (!original) return makeResumeBullet(evidence);
  if (!evidence) return `- ${original}.`;
  return `- ${original}. ${evidence}.`;
}

function makeRewrittenExperienceBullet(text) {
  return makeResumeBullet(text);
}

function getNewExperienceDraft(change) {
  return {
    role: cleanEntryTitle(change.experienceNewTitle || ""),
    company: cleanEntryTitle(change.experienceNewCompany || ""),
    years: extractYears(change.experienceNewYears || "") || cleanConfirmedText(change.experienceNewYears || ""),
    bullets: cleanConfirmedText(change.experienceDraftText || "") ? [makeResumeBullet(change.experienceDraftText)] : []
  };
}

function replaceExperienceBullet(text, originalBullet, replacementBullet) {
  const lines = text.split("\n");
  const target = normalizeBulletForMatch(originalBullet);
  const replacement = replacementBullet || makeResumeBullet(originalBullet);

  for (let index = 0; index < lines.length; index += 1) {
    if (normalizeBulletForMatch(lines[index]) !== target) continue;
    lines[index] = replacement;
    return lines.join("\n");
  }

  return text;
}

function findSelectedExperienceEntryBounds(lines, range, target) {
  if (!range || !target) return null;
  let entryIndex = -1;
  let start = -1;

  for (let index = range.start + 1; index < range.end; index += 1) {
    const startsEntry = index === range.start + 1 || isLikelyExperienceRole(lines[index], lines[index + 1] || "", null);
    if (!startsEntry) continue;
    entryIndex += 1;
    if (entryIndex === target.index) {
      start = index;
      break;
    }
  }

  if (start === -1) return null;
  let end = range.end;
  for (let index = start + 1; index < range.end; index += 1) {
    if (!lines[index].trim()) {
      end = index;
      break;
    }
    if (isLikelyExperienceRole(lines[index], lines[index + 1] || "", null)) {
      end = index;
      break;
    }
  }

  return { start, end };
}

function getExperienceBulletLineGroups(lines, bounds, target) {
  if (!bounds) return [];
  const groups = [];
  const company = normalizeEntryAnchorForComparison(target?.company || "");
  let current = null;

  function pushCurrent() {
    if (!current?.text) return;
    groups.push(current);
    current = null;
  }

  for (let index = bounds.start + 1; index < bounds.end; index += 1) {
    const raw = lines[index] || "";
    const clean = stripLeadingBullet(raw);
    if (!clean) continue;
    if (company && normalizeEntryAnchorForComparison(clean) === company) continue;

    const startsExplicitBullet = /^\s*[-*•]\s+/.test(raw);
    const continuesCurrent = current
      && !/[.!?]$/.test(current.text)
      && !startsExplicitBullet;

    if (continuesCurrent) {
      current.text = `${current.text} ${clean}`.replace(/\s+/g, " ").trim();
      current.end = index + 1;
      continue;
    }

    pushCurrent();
    current = { start: index, end: index + 1, text: clean };
  }

  pushCurrent();
  return groups;
}

function replaceExperienceBulletInTarget(text, target, originalBullet, replacementBullet) {
  const lines = text.split("\n");
  const range = findSectionRange(lines, ["experience", "professional experience"]);
  const bounds = findSelectedExperienceEntryBounds(lines, range, target);
  const normalizedOriginal = normalizeBulletForMatch(originalBullet);
  const replacement = replacementBullet || makeResumeBullet(originalBullet);
  if (!bounds || !normalizedOriginal || !replacement) return text;

  for (const group of getExperienceBulletLineGroups(lines, bounds, target)) {
    if (normalizeBulletForMatch(group.text) !== normalizedOriginal) continue;
    lines.splice(group.start, group.end - group.start, replacement);
    return lines.join("\n");
  }

  for (let index = bounds.start + 1; index < bounds.end; index += 1) {
    if (normalizeBulletForMatch(lines[index]) !== normalizedOriginal) continue;
    lines[index] = replacement;
    return lines.join("\n");
  }

  return text;
}

function addBulletToSelectedExperience(text, target, bullet) {
  const lines = text.split("\n");
  const range = findSectionRange(lines, ["experience", "professional experience"]);
  if (!range || !target || !bullet) return text;

  const bounds = findSelectedExperienceEntryBounds(lines, range, target);
  if (!bounds) return text;
  lines.splice(bounds.end, 0, bullet);
  return lines.join("\n");
}

function removeExperienceEntry(text, entry) {
  const lines = text.split("\n");
  const range = findSectionRange(lines, ["experience", "professional experience"]);
  const bounds = findSelectedExperienceEntryBounds(lines, range, entry);
  if (!bounds) return text;

  lines.splice(bounds.start, bounds.end - bounds.start);
  while (lines[range.start + 1] === "") lines.splice(range.start + 1, 1);
  return lines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

function findExperienceEntryBoundsByTitle(lines, range, originalText) {
  if (!range) return null;

  // A suggestion can preserve the extracted date style while the current draft
  // uses the normalized display style (for example, "2013 2016" vs "2013 - 2016").
  // Match the role title directly so Preview and Accept resolve the same entry.
  const originalTitle = stripLeadingBullet(getFirstNonEmptyLine(originalText));
  const targetTitle = normalizeEntryAnchorForComparison(removeYears(originalTitle));
  if (!targetTitle || !looksLikeJobTitle(originalTitle)) return null;

  for (let index = range.start + 1; index < range.end; index += 1) {
    const line = stripLeadingBullet(lines[index] || "");
    const lineTitle = normalizeEntryAnchorForComparison(removeYears(line));
    const sameTitle = lineTitle === targetTitle
      || (lineTitle.length >= 8 && targetTitle.length >= 8
        && (lineTitle.includes(targetTitle) || targetTitle.includes(lineTitle)));
    if (!sameTitle || !isLikelyExperienceRole(lines[index], lines[index + 1] || "", null)) continue;

    let end = range.end;
    for (let cursor = index + 1; cursor < range.end; cursor += 1) {
      if (!lines[cursor].trim() || isLikelyExperienceRole(lines[cursor], lines[cursor + 1] || "", null)) {
        end = cursor;
        break;
      }
    }
    return { start: index, end };
  }

  return null;
}

function removeExperienceEntryByTitle(text, originalText) {
  const lines = text.split("\n");
  const range = findSectionRange(lines, ["experience", "professional experience"]);
  const bounds = findExperienceEntryBoundsByTitle(lines, range, originalText);
  if (!bounds) return text;

  lines.splice(bounds.start, bounds.end - bounds.start);
  while (lines[range.start + 1] === "") lines.splice(range.start + 1, 1);
  return lines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

function applyRemovalChange(output, change) {
  const experienceEntry = getRemovalExperienceEntry(output, change);
  if (experienceEntry && !experienceEntry.matchesBullet) {
    const removed = removeExperienceEntry(output, experienceEntry.entry);
    if (removed !== output) return removed;
  }

  const direct = applyReplaceChange(output, { ...change, suggestedText: "" });
  if (direct !== output) return direct;

  if (canonicalSectionTitle(change.section) === "experience") {
    return removeExperienceEntryByTitle(output, change.originalText);
  }

  return output;
}

function addExperienceToResume(text, change) {
  const action = getExperienceAction(change, text);
  if (action === "new_experience") {
    const draft = getNewExperienceDraft(change);
    if (!draft.role || !draft.company || !draft.years) return text;
    const block = [
      `${draft.role} ${draft.years}`,
      draft.company,
      ...draft.bullets
    ];
    return insertDatedBlockIntoSection(text, ["experience", "professional experience"], "Experience", block);
  }

  const target = getSelectedExperienceTarget(change, text);
  if (target) {
    const evidence = cleanConfirmedText(change.experienceDraftText || change.suggestedText || change.userDraftText || "");
    if (!evidence) return text;

    if (action === "enhance" && target.bullets.length) {
      const bulletIndex = Number(change.experienceBulletIndex || 0);
      const originalBullet = change.experienceOriginalBullet || target.bullets[Number.isFinite(bulletIndex) ? bulletIndex : 0] || target.bullets[0];
      return replaceExperienceBulletInTarget(text, target, originalBullet, makeRewrittenExperienceBullet(evidence));
    }

    return addBulletToSelectedExperience(text, target, makeResumeBullet(evidence));
  }

  const draft = getExperienceDraft(change);
  const lines = text.split("\n");
  const range = findSectionRange(lines, ["experience", "professional experience"]);

  if (draft.role && draft.company && draft.years) {
    const block = [
      `${draft.role} ${draft.years}`,
      draft.company,
      ...draft.bullets
    ];
    return insertDatedBlockIntoSection(text, ["experience", "professional experience"], "Experience", block);
  }

  if (!range) return text;
  const bullet = draft.bullets[0] || makeResumeBullet(change.suggestedText);
  if (!bullet) return text;
  const insertAt = findExperienceCompanyInsertIndex(lines, range, draft.company);
  if (insertAt === -1) return text;
  lines.splice(insertAt, 0, bullet);
  return lines.join("\n");
}

function appendConfirmedExperience(text, confirmedText) {
  const clean = cleanConfirmedText(confirmedText);
  if (!clean) return text;
  const bullet = `- ${clean}`;
  const lines = text.split("\n");
  const range = findSectionRange(lines, ["selected projects", "projects"]);

  if (range) {
    lines.splice(range.end, 0, bullet);
    return lines.join("\n");
  }

  return `${text.trim()}\n\nSELECTED PROJECTS\n${bullet}`;
}

function applyDateConfirmation(text, change) {
  const dateText = cleanConfirmedText(change.suggestedText);
  if (!dateText || !/\b(?:19|20)\d{2}\b/.test(dateText)) return text;
  if (!change.originalText || extractYears(change.originalText)) return text;

  const replacement = `${change.originalText} ${dateText}`;
  const lines = text.split("\n");
  const range = findSectionRange(lines, [change.section]);

  if (range) {
    for (let index = range.start + 1; index < range.end; index += 1) {
      if (lines[index].trim() === change.originalText.trim()) {
        lines[index] = replacement;
        return lines.join("\n");
      }
    }

    const sectionText = lines.slice(range.start, range.end).join("\n");
    const sectionReplacement = replaceIgnoringWhitespace(sectionText, change.originalText, replacement);
    if (sectionReplacement !== sectionText) {
      lines.splice(range.start, range.end - range.start, ...sectionReplacement.split("\n"));
      return lines.join("\n");
    }
  }

  if (text.includes(change.originalText)) {
    return text.replace(change.originalText, replacement);
  }

  return replaceIgnoringWhitespace(text, change.originalText, replacement);
}

function applyHeaderConfirmation(text, change) {
  const value = cleanConfirmedText(change.suggestedText);
  if (!value) return text;

  const parsed = parseResumeText(text);
  const headerLines = [...parsed.headerLines];
  const field = change.headerField;

  if (field === "name") {
    const firstContactIndex = headerLines.findIndex((line) => looksLikePhone(line) || looksLikeEmail(line) || looksLikeUrl(line));
    const candidateIndex = headerLines.findIndex((line, index) =>
      (firstContactIndex === -1 || index < firstContactIndex)
      && looksLikePartialNameLine(line)
    );
    if (candidateIndex !== -1) {
      headerLines[candidateIndex] = value;
      return serializeResumeText(headerLines, prepareSectionsForOutput(parsed.sections));
    }

    const contactStart = headerLines.findIndex((line) => looksLikePhone(line) || looksLikeEmail(line) || looksLikeUrl(line));
    if (contactStart === -1) headerLines.unshift(value);
    else headerLines.splice(contactStart, 0, value);
  } else if (field === "phone" || field === "email") {
    headerLines.push(value);
  }

  return serializeResumeText(headerLines, prepareSectionsForOutput(parsed.sections));
}

function insertAfterEntryLine(text, section, originalText, value) {
  const lines = text.split("\n");
  const range = findSectionRange(lines, [section]);
  if (!range) return text;

  const original = String(originalText || "").trim();
  const originalAnchor = normalizeEntryAnchorForComparison(original);
  for (let index = range.start + 1; index < range.end; index += 1) {
    const line = lines[index].trim();
    const lineAnchor = normalizeEntryAnchorForComparison(line);
    const isExactAnchor = entryAnchorMatches(line, originalText);
    const isCompatibleAnchor = Boolean(
      lineAnchor
      && originalAnchor
      && (lineAnchor.startsWith(`${originalAnchor} `) || originalAnchor.startsWith(`${lineAnchor} `))
    );
    if (!isExactAnchor && !isCompatibleAnchor) continue;

    if (normalizeEntryAnchorForComparison(lines[index + 1] || "") === normalizeEntryAnchorForComparison(value)) {
      return text;
    }

    const dateMatch = line.match(/\b(?:19|20)\d{2}(?:\s*(?:-|–|—|to)\s*(?:Present|present|(?:19|20)\d{2}))?/);
    if (dateMatch) {
      const prefixEnd = (dateMatch.index || 0) + dateMatch[0].length;
      const roleLine = line.slice(0, prefixEnd).trim();
      let remainder = line.slice(prefixEnd).trim();
      const valuePattern = new RegExp(`^${escapeRegExp(String(value || "").trim())}\\b\\s*`, "i");
      remainder = remainder.replace(valuePattern, "").trim();
      lines.splice(index, 1, roleLine, value, ...(remainder ? [remainder] : []));
      return lines.join("\n");
    }

    if (isExactAnchor) {
      lines.splice(index + 1, 0, value);
      return lines.join("\n");
    }

    if (original && line.startsWith(original) && line.length > original.length) {
      let remainder = line.slice(original.length).trim();
      const valuePattern = new RegExp(`^${escapeRegExp(String(value || "").trim())}\\b\\s*`, "i");
      remainder = remainder.replace(valuePattern, "").trim();
      lines.splice(index, 1, original, value, ...(remainder ? [remainder] : []));
      return lines.join("\n");
    }
  }

  return text;
}

function insertPublicationAuthors(text, section, originalText, value) {
  const lines = text.split("\n");
  const range = findSectionRange(lines, [section]);
  if (!range) return text;

  for (let index = range.start + 1; index < range.end; index += 1) {
    if (!entryAnchorMatches(lines[index], originalText)) continue;

      let insertAt = index + 1;
      for (let next = index + 1; next < range.end; next += 1) {
        const line = lines[next].trim();
        if (extractYears(line) && next !== index + 1) break;
        if (/^https?:\/\//i.test(line)) break;
        if (/\b(ACM|IEEE|Conference|Journal|Innovations|RecSys|CIKM|Big Data)\b/i.test(line)) {
          insertAt = next + 1;
          break;
        }
      }

      lines.splice(insertAt, 0, value);
      return lines.join("\n");
  }

  return text;
}

function replaceEntryLine(text, section, originalText, value) {
  const lines = text.split("\n");
  const range = findSectionRange(lines, [section]);
  if (!range) return text;

  for (let index = range.start + 1; index < range.end; index += 1) {
    if (entryAnchorMatches(lines[index], originalText)) {
      lines[index] = value;
      return lines.join("\n");
    }
  }

  return text;
}

function applyRequiredFieldConfirmation(text, change) {
  const value = cleanConfirmedText(change.suggestedText);
  if (!value) return text;

  const field = change.requiredField;
  if (["job_title", "degree", "paper_title", "patent_name"].includes(field)) {
    return replaceEntryLine(text, change.section, change.originalText, value);
  }

  if (field === "authors" && canonicalSectionTitle(change.section) === "publications") {
    return insertPublicationAuthors(text, change.section, change.originalText, value);
  }

  if (["company", "institution", "authors"].includes(field)) {
    return insertAfterEntryLine(text, change.section, change.originalText, value);
  }

  return text;
}

function applyUserConfirmedChange(output, change) {
  if (change.requiresHeaderWording) {
    return applyHeaderConfirmation(output, change);
  }

  if (change.requiresRequiredFieldWording) {
    return applyRequiredFieldConfirmation(output, change);
  }

  if (change.requiresDateWording) {
    return applyDateConfirmation(output, change);
  }

  const placements = getPlacementsToApply(change);

  if (placements.includes("omit")) {
    return output;
  }

  let updated = output;

  if (placements.includes("skills")) {
    updated = addSkillsToResume(updated, getSkillDraft(change));
  }

  if (placements.includes("experience")) {
    updated = addExperienceToResume(updated, change);
  }

  if (placements.includes("projects")) {
    updated = addProjectToResume(updated, change);
  }

  if (placements.includes("education")) {
    updated = addEducationToResume(updated, change);
  }

  if (placements.includes("certifications")) {
    updated = addCertificationToResume(updated, change);
  }

  if (placements.includes("other")) {
    updated = addOtherSectionToResume(updated, change);
  }

  return updated;
}

function replaceResumeSection(output, section, replacementText) {
  return resumeTextEditor.replaceResumeSection(output, section, replacementText);
}

function compactTextWithMap(text) {
  return resumeTextEditor.compactTextWithMap(text);
}

function replaceIgnoringWhitespace(output, originalText, suggestedText) {
  return resumeTextEditor.replaceIgnoringWhitespace(output, originalText, suggestedText);
}

function stripSectionHeaderFromReplacement(section, text) {
  return resumeTextEditor.stripSectionHeaderFromReplacement(section, text);
}

function replaceSectionBody(output, section, replacementText) {
  return resumeTextEditor.replaceSectionBody(output, section, replacementText);
}

function getFirstNonEmptyLine(text) {
  return String(text || "").split("\n").map((line) => line.trim()).find(Boolean) || "";
}

function findEducationRewriteBounds(lines, range, change) {
  if (!range || canonicalSectionTitle(change.section) !== "education") return null;
  const originalDegree = getFirstNonEmptyLine(change.originalText);
  const suggestedDegree = getFirstNonEmptyLine(change.suggestedText);
  if (!isDegreeLine(originalDegree) || !isDegreeLine(suggestedDegree)) return null;

  const originalAnchor = normalizeEntryAnchorForComparison(removeYears(originalDegree));
  if (!originalAnchor) return null;

  for (let index = range.start + 1; index < range.end; index += 1) {
    const candidate = stripLeadingBullet(lines[index] || "");
    if (!isDegreeLine(candidate)) continue;
    const candidateAnchor = normalizeEntryAnchorForComparison(removeYears(candidate));
    if (!candidateAnchor || !(candidateAnchor.includes(originalAnchor) || originalAnchor.includes(candidateAnchor))) continue;

    let end = range.end;
    for (let next = index + 1; next < range.end; next += 1) {
      const nextLine = stripLeadingBullet(lines[next] || "");
      if (isDegreeLine(nextLine) || (extractYears(nextLine) && !looksLikeInstitutionOrCompany(nextLine))) {
        end = next;
        break;
      }
    }
    return { start: index, end };
  }

  return null;
}

function applyStructuredEducationRewrite(output, change) {
  const lines = output.split("\n");
  const range = findSectionRange(lines, ["education"]);
  const bounds = findEducationRewriteBounds(lines, range, change);
  if (!bounds) return output;

  const suggestedDegree = getFirstNonEmptyLine(change.suggestedText);
  const sourceYears = extractYears(lines[bounds.start] || "");
  const replacementDegree = [removeYears(suggestedDegree).trim(), sourceYears].filter(Boolean).join(" ").trim();
  if (!replacementDegree) return output;

  lines[bounds.start] = replacementDegree;
  const originalText = normalizeEntryAnchorForComparison(change.originalText);
  const suggestedText = normalizeEntryAnchorForComparison(change.suggestedText);
  for (let index = bounds.end - 1; index > bounds.start; index -= 1) {
    const detail = stripLeadingBullet(lines[index] || "");
    const detailAnchor = normalizeEntryAnchorForComparison(detail);
    if (!looksLikeEducationDetail(detail) || !detailAnchor) continue;
    if (originalText.includes(detailAnchor) && !suggestedText.includes(detailAnchor)) {
      lines.splice(index, 1);
    }
  }

  return lines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

function applyReplaceChange(output, change) {
  if (!change.originalText || change.suggestedText == null) return output;
  if (looksLikeRemovalInstructionOnly(change.suggestedText)) {
    return applyReplaceChange(output, { ...change, suggestedText: "" });
  }

  if (change.type === "spelling_check") {
    return applySpellingCheckChange(output, change);
  }

  if (canonicalSectionTitle(change.section) === "education") {
    const structuredEducationRewrite = applyStructuredEducationRewrite(output, change);
    if (structuredEducationRewrite !== output) return structuredEducationRewrite;
  }

  if (output.includes(change.originalText)) {
    return output.replace(change.originalText, change.suggestedText);
  }

  const flexibleOutput = replaceIgnoringWhitespace(output, change.originalText, change.suggestedText);
  if (flexibleOutput !== output) return flexibleOutput;

  if (isSummaryLikeSection(change.section)) {
    return replaceSectionBody(output, change.section, change.suggestedText);
  }

  if (isWholeSectionReplacementFallback(change)) {
    return replaceSectionBody(output, change.section, change.suggestedText);
  }

  return output;
}

function applySpellingCheckChange(output, change) {
  const before = cleanConfirmedText(change.spellingBefore || "");
  const after = cleanConfirmedText(change.spellingAfter || "");
  if (!before || !after) return output;

  const lines = output.split("\n");
  const range = findSectionRange(lines, [change.section]);
  const start = range ? range.start + 1 : 0;
  const end = range ? range.end : lines.length;
  for (let index = start; index < end; index += 1) {
    if (lines[index].trim() === String(change.originalText || "").trim()) {
      lines[index] = change.suggestedText;
      return lines.join("\n");
    }
    const corrected = applySingleSpellingFix(lines[index], before, after);
    if (corrected === lines[index]) continue;
    lines[index] = corrected;
    return lines.join("\n");
  }

  return output;
}

function isWholeSectionReplacementFallback(change) {
  const canonical = canonicalSectionTitle(change.section);
  return new Set(["skills", "publications", "patents", "strengths", "achievements", "languages", "links"]).has(canonical)
    && change.suggestedText
    && !looksLikeInstructionOnly(change.suggestedText);
}

function getMovingSectionCandidates(change) {
  const declaredSection = canonicalSectionTitle(change.section || "");
  if (declaredSection === "skills") return ["skills", "technical skills"];
  if (declaredSection === "education") return ["education"];
  if (declaredSection === "publications") return ["publications"];
  if (declaredSection === "patents") return ["patents"];
  if (declaredSection === "achievements") return ["achievements"];
  if (declaredSection === "strengths") return ["strengths"];
  if (declaredSection === "languages") return ["languages"];
  if (declaredSection === "experience") return ["experience", "professional experience"];

  const instruction = normalize([change.section, change.suggestedText, change.whyItHelps].filter(Boolean).join(" "));
  if (instruction.includes("skill")) return ["skills", "technical skills"];
  if (instruction.includes("education")) return ["education"];
  if (instruction.includes("publication")) return ["publications"];
  if (instruction.includes("patent")) return ["patents"];
  if (instruction.includes("achievement")) return ["achievements"];
  if (instruction.includes("strength")) return ["strengths"];
  if (instruction.includes("language")) return ["languages"];
  if (instruction.includes("experience")) return ["experience", "professional experience"];
  return [change.section];
}

function isReorderAlreadySatisfied(output, change) {
  const instruction = normalize([change.section, change.suggestedText, change.whyItHelps].filter(Boolean).join(" "));
  const moving = getMovingSectionCandidates(change)[0];

  if (/after (professional )?experience/.test(instruction)) {
    return isSectionAfter(output, moving, "experience");
  }

  if (/before (professional )?experience/.test(instruction)) {
    return isSectionBefore(output, moving, "experience");
  }

  if (/after (professional )?(summary|profile|statement)/.test(instruction) || /immediately follow/.test(instruction)) {
    return isSectionAfter(output, moving, "summary");
  }

  if (/before education/.test(instruction)) {
    return isSectionBefore(output, moving, "education");
  }

  if (/after education/.test(instruction)) {
    return isSectionAfter(output, moving, "education");
  }

  return false;
}

function violatesFixedSectionOrder(change) {
  const instruction = normalize([change.section, change.suggestedText, change.whyItHelps].filter(Boolean).join(" "));
  const moving = canonicalSectionTitle(getMovingSectionCandidates(change)[0]);
  const optionalSections = new Set(["skills", "publications", "patents", "strengths", "achievements", "languages", "links"]);

  if (optionalSections.has(moving) && /after (professional )?(summary|profile|statement)|before (professional )?experience|before education|higher|top/i.test(instruction)) {
    return true;
  }

  if (moving === "education" && /before (professional )?experience|before (professional )?(summary|profile|statement)/i.test(instruction)) {
    return true;
  }

  if (moving === "experience" && /before (professional )?(summary|profile|statement)|after education/i.test(instruction)) {
    return true;
  }

  return false;
}

function applyReorderSectionChange(output, change) {
  const instruction = normalize([change.section, change.suggestedText, change.whyItHelps].filter(Boolean).join(" "));
  const movingSection = getMovingSectionCandidates(change);
  const lines = output.split("\n");
  const movingRange = findSectionRange(lines, movingSection);
  if (!movingRange) return output;
  if (isReorderAlreadySatisfied(output, change)) return output;

  const sectionBlock = lines.splice(movingRange.start, movingRange.end - movingRange.start);
  const insertAfterSummary = /summary|profile|statement/.test(instruction);
  const insertBeforeExperience = /before experience|before professional experience/.test(instruction);
  const insertAfterExperience = /after experience|after professional experience/.test(instruction);
  const insertBeforeEducation = /before education/.test(instruction);
  const insertAfterEducation = /after education/.test(instruction);

  let insertAt = lines.length;
  if (insertAfterSummary) {
    const summaryRange = findSectionRange(lines, ["professional summary", "summary", "profile", "statement"]);
    if (summaryRange) insertAt = summaryRange.end;
  } else if (insertBeforeExperience) {
    const experienceRange = findSectionRange(lines, ["professional experience", "experience"]);
    if (experienceRange) insertAt = experienceRange.start;
  } else if (insertAfterExperience) {
    const experienceRange = findSectionRange(lines, ["professional experience", "experience"]);
    if (experienceRange) insertAt = experienceRange.end;
  } else if (insertBeforeEducation) {
    const educationRange = findSectionRange(lines, ["education"]);
    if (educationRange) insertAt = educationRange.start;
  } else if (insertAfterEducation) {
    const educationRange = findSectionRange(lines, ["education"]);
    if (educationRange) insertAt = educationRange.end;
  }

  while (insertAt > 0 && lines[insertAt - 1] === "") insertAt -= 1;
  lines.splice(insertAt, 0, "", ...sectionBlock, "");
  return lines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

function looksLikeInstructionOnly(text) {
  return /^(move|remove|delete|deemphasize|reorder|place|reformat|format|organize|update|revise|compress)\b/i.test(String(text || "").trim());
}

function looksLikeRemovalInstructionOnly(text) {
  return /^(consider\s+)?(remove|delete|deemphasize|condense|compress|shorten)\b/i.test(String(text || "").trim())
    || /\b(to free space|free up space|not necessary|less relevant)\b/i.test(String(text || ""));
}

function applySingleChange(output, change) {
  if (change.mode === "replace") {
    return applyReplaceChange(output, change);
  }

  if (change.mode === "insertAfterHeader") {
    const lines = output.split("\n");
    const insertAt = Math.min(3, lines.length);
    lines.splice(insertAt, 0, "", change.suggestedText);
    return lines.join("\n");
  }

  if (change.mode === "append") {
    return `${output.trim()}\n\n${change.suggestedText}`;
  }

  if (change.mode === "appendUserConfirmed" || change.mode === "dateConfirmation" || change.mode === "headerConfirmation" || change.mode === "requiredFieldConfirmation") {
    return applyUserConfirmedChange(output, change);
  }

  if (change.mode === "reorderSection") {
    return applyReorderSectionChange(output, change);
  }

  if (change.mode === "replaceSection") {
    return replaceResumeSection(output, change.section, change.suggestedText);
  }

  if (change.mode === "removeOrReplace" && change.originalText) {
    return !String(change.suggestedText || "").trim() || looksLikeRemovalInstructionOnly(change.suggestedText) || looksLikeInstructionOnly(change.suggestedText)
      ? applyRemovalChange(output, change)
      : applyReplaceChange(output, change);
  }

  return output;
}

function applyAcceptedChanges() {
  finalResume.value = materializeAcceptedResumeText();
  pageBudgetOverride = false;
  refreshAiAnalysisForCurrentResume();
}

function ensureFinalResumeText() {
  if (!finalResume.value.trim()) {
    applyAcceptedChanges();
  }

  const text = normalizeFinalResumeText(finalResume.value.trim() || resumeInput.value.trim());
  if (!text) {
    throw new Error("Add or generate a final resume draft before exporting.");
  }

  const missingHeader = collectMissingHeaderQuestions(text);
  const missingRequiredFields = collectMissingRequiredFieldQuestions(text);
  const missingDates = collectMissingDateQuestions(text);
  const missingCards = prepareActionableChanges(text, [...missingHeader, ...missingRequiredFields, ...missingDates]);
  const unreviewedMissingCards = missingCards.filter((change) => !dismissedChangeKeys.has(getDismissalKey(change)));
  if (unreviewedMissingCards.length) {
    mergeCleanupCards(unreviewedMissingCards, text);
    activePass = PASS_CLEANUP;
    renderChanges();
    setAiStatus("The resume still has missing essential fields. You can export anyway, but review the mandatory cards first.", "error");
  } else if (missingCards.length) {
    setAiStatus("Some essential fields are still missing, but you already reviewed or dismissed those cards. Exporting anyway.", "neutral");
  }

  finalResume.value = text;
  return text;
}

