function normalizeRoleRequirementKey(term) {
  return roleRequirements.normalizeKey(term);
}

function isAbstractRoleRequirement(term) {
  return roleRequirements.isAbstract(term);
}

function getJobAwareRoleRequirement(term, jobText = "") {
  return roleRequirements.groupForJob(term, jobText);
}

function roleRequirementIsGroundedInJob(term, grouped, jobText = "") {
  return roleRequirements.isGroundedInJob(term, grouped, jobText);
}

function displayRoleRequirement(term) {
  return roleRequirements.display(term);
}

function resumeCoversRoleRequirement(resumeText, requirement) {
  return roleRequirements.resumeCovers(resumeText, requirement);
}

function collectRoleRequirementTerms(data, jobText = "") {
  return roleRequirements.collect(data, jobText);
}

function buildRoleCoverageState(data, currentResume, baselineResume, jobText = "") {
  return roleRequirements.buildCoverageState(data, currentResume, baselineResume, jobText);
}

function buildMissingExperienceCardsFromRequirements(data, resumeText, jobText, offset = 0) {
  const missing = roleRequirements.getMissingRequirements(data, resumeText, jobText);
  return missingExperienceFlow.buildQuestionSpecs(missing).map((spec, index) => buildAiQuestionCard({
    id: `missing-requirement-${spec.key.replace(/[^a-z0-9]+/g, "-") || offset + index + 1}`,
    promptText: spec.promptText,
    relatedRequirement: spec.relatedRequirement,
    whyItMatters: spec.whyItMatters,
    missingTerm: spec.label,
    isDateQuestion: false,
    dateSection: "Missing Evidence"
  }));
}

function retainOnlyCanonicalMissingExperienceCards(cards, data, resumeText, jobText) {
  const allowed = new Set(roleRequirements
    .getMissingRequirements(data, resumeText, jobText)
    .map((requirement) => requirement.key));

  return (cards || []).filter((change) => {
    if (!isMissingExperienceChange(change)) return true;
    const topic = missingExperienceDedupeTopic(change);
    const candidates = topic
      ? [topic]
      : extractQuestionTopicTerms(change.missingTerm, change.promptText, change.evidence);
    return candidates.some((candidate) => allowed.has(roleRequirements.groupForJob(candidate, jobText).key));
  });
}

function renderRoleCoverageItems(items, { markNew = false } = {}) {
  if (!items.length) return "<li>None.</li>";
  return items.map((item) => `
    <li data-role-requirement="${escapeHtml(item.key)}">
      <span>${escapeHtml(item.display)}</span>
      ${markNew && item.newlyCovered ? `<span class="analysis-newly-covered">Added in this review</span>` : ""}
    </li>
  `).join("");
}

function renderAiAnalysis(data, options = {}) {
  const shouldStore = options.store !== false;
  if (shouldStore) {
    latestAiAnalysis = data;
    latestAiJobDescription = options.jobText ?? jobInput.value.trim();
    latestAiBaselineResume = options.baselineResume ?? (resumeInput.value.trim() || getWorkingResumeText());
  }
  const job = data.job_analysis || {};
  const resume = data.resume_analysis || {};
  const strategy = data.tailoring_strategy || {};
  const coverage = buildRoleCoverageState(
    data,
    options.currentResume || getWorkingResumeText(),
    latestAiBaselineResume || resumeInput.value.trim(),
    latestAiJobDescription
  );
  const blocks = [
    ["Target", [job.target_title, job.seniority].filter(Boolean)],
    ["Strong Resume Evidence", resume.strongest_relevant_evidence || []],
    ["Emphasize", strategy.emphasize || []],
    ["Initial Confirmation Cautions", strategy.do_not_claim_without_confirmation || []]
  ];

  matchScore.textContent = data.model ? `AI: ${data.model}` : "AI";
  const summaryHtml = blocks
    .filter(([, items]) => items.length)
    .map(([title, items]) => {
      const list = items.map((item) => `<li>${escapeHtml(typeof item === "string" ? item : JSON.stringify(item))}</li>`).join("");
      return `<section class="analysis-block"><h3>${escapeHtml(title)}</h3><ul>${list}</ul></section>`;
    })
    .join("");
  analysisOutput.innerHTML = `
    ${summaryHtml}
    <section class="analysis-block role-coverage-block covered">
      <h3>Requirements Covered in Current Resume</h3>
      <ul>${renderRoleCoverageItems(coverage.covered, { markNew: true })}</ul>
    </section>
    <section class="analysis-block role-coverage-block missing">
      <h3>Requirements Still Missing</h3>
      <ul>${renderRoleCoverageItems(coverage.missing)}</ul>
    </section>
  `;
}

function refreshAiAnalysisForCurrentResume() {
  if (!latestAiAnalysis) return;
  renderAiAnalysis(latestAiAnalysis, {
    store: false,
    currentResume: getWorkingResumeText()
  });
}

function inferSpecificQuestionTopic(...parts) {
  const text = parts.filter(Boolean).join(" ");
  if (/\bprogramming languages?\b/i.test(text)) return "Programming Languages";
  if (/\bpatents?\b/i.test(text)) return "Patents";
  if (/\b(publications?|peer-reviewed papers?|research papers?)\b/i.test(text)) return "Publications";
  if (/\b(ph\.?d\.?|doctorate|doctoral degree)\b/i.test(text)) return "PhD";
  if (/\bcommunication\b/i.test(text) && /\bcollaboration\b/i.test(text)) return "Communication and collaboration";
  if (/\bcommunication\b/i.test(text)) return "Communication";
  if (/\bcollaboration\b/i.test(text)) return "Collaboration";

  const directMatches = reduceMissingExperienceTopics(unique(
    specificTopicLexicon.filter((term) => textContainsTopicTerm(text, term))
  ));
  const acronymMatches = unique(
    (text.match(/\b[A-Z][A-Z0-9+-]{1,}\b/g) || [])
      .filter((term) => !ignoredExtractedTopics.has(term.toLowerCase()))
      .map((term) => term.trim())
  );
  const titleMatches = unique(
    (text.match(/\b(?:C\/C\+\+|C\+\+|C#|Python|Java|Perl|JavaScript|TypeScript|Scala|LangChain|Spark|GenAI|Generative AI|SQL|LLM|RAG)\b/g) || [])
      .map((term) => term.trim())
  );
  const matches = reduceMissingExperienceTopics(uniqueCanonicalTerms([...titleMatches, ...acronymMatches, ...directMatches]))
    .filter((term) => term.length > 1)
    .slice(0, 5);

  if (matches.length) {
    return matches.map(titleCaseKnownTerm).join(", ");
  }

  const roleContext = extractContextAnchorCandidates(text)
    .find((candidate) => /\b(Engineer|Scientist|Assistant|Intern|Developer|Programmer|Researcher|Analyst|Manager|Lead|Director|Student)\b/i.test(candidate));
  if (roleContext) return roleContext;

  const firstConcretePhrase = splitLines(text)
    .map((line) => line.replace(/^(the job requires|the role emphasizes|required|preferred)[:\s-]*/i, "").trim())
    .find((line) => isUsefulMissingExperienceLabel(line));

  return firstConcretePhrase || "Specific experience";
}

function isUsefulMissingExperienceLabel(value) {
  const line = cleanConfirmedText(value || "").replace(/^the\s+/i, "");
  if (/^(?:C|C\+\+|C\/C\+\+|C#|PhD|RAG|LLM|SQL)$/i.test(line)) return true;
  if (line.length < 4 || line.length > 48 || genericQuestionTopics.has(line.toLowerCase())) return false;
  if (/\b(?:the|a|an|in|at|for|with|of|to|from|and|or)\s*$/i.test(line)) return false;
  if (/\b(?:role|position|job|entry)\b[\s\S]*\b(?:lacks?|missing|details?|contributions?|responsibilities)\b/i.test(line)) return false;
  if (/\b(?:specific|additional|more)\s+(?:details?|contributions?|responsibilities|experience)\b/i.test(line)) return false;
  return !/[?.!]$/.test(line);
}

function uniqueCanonicalTerms(terms) {
  const seen = new Set();
  const result = [];

  for (const term of terms) {
    const canonical = titleCaseKnownTerm(term);
    const key = canonical.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(canonical);
  }

  return result;
}

function titleCaseKnownTerm(term) {
  const known = {
    llm: "LLM",
    rag: "RAG",
    sql: "SQL",
    nlp: "NLP",
    "c++": "C++",
    "c/c++": "C/C++",
    "c#": "C#",
    java: "Java",
    perl: "Perl",
    javascript: "JavaScript",
    typescript: "TypeScript",
    scala: "Scala",
    r: "R",
    genai: "GenAI",
    "generative ai": "Generative AI",
    python: "Python",
    langchain: "LangChain",
    spark: "Spark",
    tableau: "Tableau",
    "apache airflow": "Apache Airflow",
    airflow: "Apache Airflow",
    dbt: "dbt",
    "llm-as-judge": "LLM-as-judge",
    "llm evaluation": "LLM evaluation",
    "openai": "OpenAI"
  };
  return known[term.toLowerCase()] || term;
}

function firstDefined(object, keys, fallback = "") {
  for (const key of keys) {
    if (object?.[key] !== undefined && object[key] !== null) return object[key];
  }
  return fallback;
}

function firstArray(object, keys) {
  const value = firstDefined(object, keys, []);
  return Array.isArray(value) ? value : [];
}

function normalizeAiChangeMode(type, section, originalText, suggestedText, requiresUserWording) {
  if (type === "ask_date") return "dateConfirmation";
  if (requiresUserWording) return "appendUserConfirmed";
  if (type === "reorder_section") return "reorderSection";
  if (isKnownResumeSection(section) && suggestedText && !looksLikeInstructionOnly(suggestedText) && !originalText) return "replaceSection";
  if (type === "remove_or_deemphasize") return originalText ? "removeOrReplace" : "noteOnly";
  if (originalText && looksLikeRemovalInstructionOnly(suggestedText)) return "removeOrReplace";
  if (originalText) return "replace";
  if (suggestedText) return "append";
  return "noteOnly";
}

function looksLikeDateQuestion(text) {
  const value = String(text || "");
  if (!value.trim()) return false;
  if (/\b(project|tools|models|skills|methods|impact|metric|cover letter|summary)\b/i.test(value)) return false;
  if (/\b(publication|paper|patent)\b.{0,80}\b(years?|dates?)\b/i.test(value)) return true;
  if (/\b(years?|dates?)\b.{0,80}\b(publication|paper|patent)\b/i.test(value)) return true;

  return (
    /\b(missing|enter|add|provide|specify|confirm|fill)\b.{0,80}\b(years\/dates|dates?|date range|start and end|employment dates?|month\/year|mm\/yyyy)\b/i.test(value)
    || /\b(what|which)\b.{0,50}\b(start|end|employment)\b.{0,50}\b(dates?|years?)\b/i.test(value)
    || /\b(what|which)\b.{0,50}\b(years|dates?)\b.{0,50}\b(work|worked|employed|held|attended|published|filed|role|position|job|degree|publication|patent)\b/i.test(value)
  );
}

function isCoverLetterOnlySuggestion(change) {
  const text = [
    change.promptText,
    change.suggestedText,
    change.whyItHelps,
    change.evidence
  ].filter(Boolean).join(" ");

  if (change.type === "ask_user" && /\bcover letter\b/i.test(text)) return true;

  return /\bcover letter\b/i.test(text)
    && !/\b(resume|cv|statement|professional summary|summary)\b/i.test(text);
}

function inferDateQuestionLabel(...parts) {
  const text = parts.filter(Boolean).join(" ");
  const quoted = text.match(/(?:for|entry is missing years\/dates:)\s+([^?.]+?)(?:\?|\.|$)/i)?.[1];
  if (quoted) return quoted.replace(/\s*\(.*$/, "").trim();
  const role = text.match(/\b([A-Z][A-Za-z+-]+(?:\s+[A-Z][A-Za-z+-]+){0,4}\s+(?:Engineer|Scientist|Assistant|Intern|Developer|Programmer|Researcher|Analyst|Manager|Lead|Director|Student|position|role))\b/)?.[1];
  return role || "Entry";
}

function normalizeAiChangeCard(card, index) {
  const rawType = firstDefined(card, ["type", "change_type", "changeType"], "rewrite");
  const supportLevel = firstDefined(card, ["support_level", "supportLevel"], "resume_supported");
  const section = firstDefined(card, ["section", "resume_section", "resumeSection"], "Resume");
  const originalText = firstDefined(card, ["original_text", "originalText", "before"], "");
  const rawSuggestedText = firstDefined(card, ["suggested_text", "suggestedText", "after"], "");
  const rawPromptText = firstDefined(card, ["question"], "") || rawSuggestedText || originalText || firstDefined(card, ["why_it_helps", "whyItHelps", "why_it_matters", "whyItMatters", "why", "reason"], "");
  let type = rawType === "ask_user" && looksLikeDateQuestion(rawPromptText) ? "ask_date" : rawType;
  if (type === "remove_or_deemphasize" && originalText && rawSuggestedText && !looksLikeRemovalInstructionOnly(rawSuggestedText) && !looksLikeInstructionOnly(rawSuggestedText)) {
    type = "rewrite";
  }
  const requiresUserWording = type === "ask_user" || type === "ask_date" || supportLevel === "user_confirmation_needed";
  const promptText = requiresUserWording ? rawPromptText : "";
  const suggestedText = requiresUserWording ? "" : (rawSuggestedText || firstDefined(card, ["question"], ""));
  const relatedRequirement = firstDefined(card, ["related_job_requirement", "relatedJobRequirement"], "");
  const missingTerm = requiresUserWording
    ? (type === "ask_date"
      ? inferDateQuestionLabel(relatedRequirement, section, promptText, firstDefined(card, ["evidence"], ""))
      : inferSpecificQuestionTopic(relatedRequirement, section, promptText, firstDefined(card, ["evidence"], "")))
    : (relatedRequirement || section || "Resume");

  return {
    id: card.id || `ai-change-${index + 1}`,
    type,
    section,
    originalText,
    suggestedText,
    promptText,
    whyItHelps: firstDefined(card, ["why_it_helps", "whyItHelps", "why_it_matters", "whyItMatters", "why", "reason"], "Suggested by the AI analysis."),
    evidence: firstDefined(card, ["evidence"], "") || relatedRequirement,
    riskLevel: firstDefined(card, ["risk_level", "riskLevel"], requiresUserWording ? "high" : "medium"),
    supportLevel,
    status: "pending",
    mode: normalizeAiChangeMode(type, section, originalText, suggestedText, requiresUserWording),
    missingTerm,
    requiresUserWording,
    requiresDateWording: type === "ask_date"
  };
}

function normalizeAiQuestions(questions = [], offset = 0) {
  const cards = [];

  questions.forEach((question, index) => {
    const promptText = firstDefined(question, ["question", "prompt"], "");
    const isDateQuestion = looksLikeDateQuestion(promptText);
    const relatedRequirement = firstDefined(question, ["related_job_requirement", "relatedJobRequirement"], "");
    const whyItMatters = firstDefined(question, ["why_it_matters", "whyItMatters", "why_it_helps", "whyItHelps"], "");
    const dateSection = inferDateQuestionSection(relatedRequirement, promptText, whyItMatters);
    let singleTopicTerm = "";

    if (!isDateQuestion) {
      const topicTerms = reduceMissingExperienceTopics(
        extractQuestionTopicTerms(relatedRequirement, promptText)
      );
      if (topicTerms.length > 1) {
        topicTerms.forEach((term, termIndex) => {
          cards.push(buildAiQuestionCard({
            id: question.id ? `${question.id}-${normalizeSectionLabel(term)}` : `ai-question-${offset + cards.length + 1}`,
            promptText: `Do you have experience with ${term}?`,
            relatedRequirement,
            whyItMatters,
            missingTerm: term,
            isDateQuestion: false,
            dateSection,
            index: offset + index + termIndex
          }));
        });
        return;
      }
      singleTopicTerm = topicTerms[0] || "";
    }

    cards.push(buildAiQuestionCard({
      id: question.id || `ai-question-${offset + cards.length + 1}`,
      promptText,
      relatedRequirement,
      whyItMatters,
      missingTerm: isDateQuestion
        ? inferDateQuestionLabel(relatedRequirement, promptText, whyItMatters)
        : singleTopicTerm || inferSpecificQuestionTopic(relatedRequirement, promptText),
      isDateQuestion,
      dateSection,
      index: offset + index
    }));
  });

  return cards;
}

function extractQuestionTopicTerms(...parts) {
  const text = parts.filter(Boolean).join(" ");
  return uniqueCanonicalTerms([
    ...extractProgrammingAndToolNames(text),
    ...specificTopicLexicon.filter((term) => textContainsTopicTerm(text, term))
  ]).filter((term) => !genericQuestionTopics.has(term.toLowerCase()));
}

function buildAiQuestionCard({ id, promptText, relatedRequirement, whyItMatters, missingTerm, isDateQuestion, dateSection }) {
  return {
      id,
      type: isDateQuestion ? "ask_date" : "ask_user",
      section: isDateQuestion ? dateSection : "Missing Evidence",
      originalText: "",
      suggestedText: "",
      promptText: isDateQuestion ? promptText : getSpecificConfirmationPrompt(missingTerm, promptText),
      whyItHelps: whyItMatters || "This may improve role fit, but should only be added if true.",
      evidence: relatedRequirement || "",
      riskLevel: "high",
      supportLevel: "user_confirmation_needed",
      status: "pending",
      mode: isDateQuestion ? "dateConfirmation" : "appendUserConfirmed",
      missingTerm,
      requiresUserWording: true,
      requiresDateWording: isDateQuestion
    };
}

function stringifyAnalysisItem(item) {
  if (typeof item === "string") return item;
  if (!item || typeof item !== "object") return "";
  return [
    item.skill,
    item.keyword,
    item.requirement,
    item.signal,
    item.topic,
    item.reason,
    item.text,
    item.description
  ].filter(Boolean).join(" ");
}

function extractMissingExperienceTopics(text) {
  const value = String(text || "");
  if (isNonActionableAnalysisNote(value)) return [];
  const explicitTerms = reduceMissingExperienceTopics(extractQuestionTopicTerms(value));
  if (explicitTerms.length) return explicitTerms;

  if (/\b(?:specific|additional|more)\s+(?:details?|contributions?|responsibilities|experience)\b/i.test(value)) return [];

  if (/\bpatents?\b/i.test(value)) return ["Patents"];
  if (/\b(publications?|peer-reviewed papers?|research papers?)\b/i.test(value)) return ["Publications"];
  if (/\b(ph\.?d\.?|doctorate|doctoral degree)\b/i.test(value)) return ["PhD"];

  const topic = inferSpecificQuestionTopic(value);
  if (!topic || genericQuestionTopics.has(topic.toLowerCase()) || isOrganizationOnlyTopic(topic)) return [];
  return [topic];
}

function isNonActionableAnalysisNote(text) {
  const value = normalize(text);
  return /\b(seniority signal|could be stronger|stronger in (?:the )?(?:summary|resume)|clearer seniority|summary could be|resume could be|more senior)\b/.test(value)
    || /\b(role|position|job|entry)\b.{0,80}\blacks?\b.{0,80}\b(dates?|details?|contributions?|responsibilities)\b/.test(value);
}

function reduceMissingExperienceTopics(terms) {
  const broadModifiers = new Set([
    "production",
    "deployment",
    "product",
    "engineering",
    "stakeholder",
    "cross-functional"
  ]);
  const normalizedTerms = combineRelatedProgrammingTopics(uniqueCanonicalTerms(terms));
  const withoutContainedSubterms = normalizedTerms.filter((term) => {
    const key = normalize(term);
    if (broadModifiers.has(key) && normalizedTerms.length > 1) return false;
    return !normalizedTerms.some((other) =>
      other !== term
      && other.length > term.length
      && textContainsTopicTerm(other, term)
    );
  });
  return withoutContainedSubterms;
}

function combineRelatedProgrammingTopics(terms) {
  const values = uniqueCanonicalTerms(terms);
  const hasC = values.includes("C");
  const hasCpp = values.includes("C++");

  // A job description often spells this requirement as C/C++. Present one
  // confirmation card for the combined requirement instead of an ambiguous
  // C card that silently also covers C++.
  if (!hasC || !hasCpp) return values;

  const firstIndex = Math.min(values.indexOf("C"), values.indexOf("C++"));
  const withoutPair = values.filter((term) => term !== "C" && term !== "C++");
  withoutPair.splice(firstIndex, 0, "C/C++");
  return withoutPair;
}

function buildMissingExperienceCardsFromAiAnalysis(data, offset = 0) {
  const sources = [
    ...(data?.resume_analysis?.weak_or_missing_signals || []),
    ...(data?.tailoring_strategy?.do_not_claim_without_confirmation || []),
    ...(data?.final_checks?.keywords_missing || [])
  ];
  const cards = [];
  const seen = new Set();

  for (const item of sources) {
    const text = stringifyAnalysisItem(item).trim();
    if (!text) continue;

    for (const topic of extractMissingExperienceTopics(text)) {
      const missingTerm = titleCaseKnownTerm(topic);
      const key = normalize(missingTerm);
      if (!key || seen.has(key) || genericQuestionTopics.has(key)) continue;
      seen.add(key);
      cards.push(buildAiQuestionCard({
        id: `ai-analysis-missing-${offset + cards.length + 1}`,
        promptText: `Do you have real, resume-worthy experience with ${missingTerm}?`,
        relatedRequirement: text,
        whyItMatters: "The role analysis marked this as missing or not safe to claim without confirmation.",
        missingTerm,
        isDateQuestion: false,
        dateSection: "Missing Evidence"
      }));
    }
  }

  return cards;
}

function inferDateQuestionSection(...parts) {
  const text = normalize(parts.filter(Boolean).join(" "));
  if (/\b(publication|paper|conference|journal|cikm|ieee|acm|recsys|big data)\b/.test(text)) return "Publications";
  if (/\b(patent|inventor)\b/.test(text)) return "Patents";
  if (/\b(education|degree|msc|m\.sc|bsc|b\.sc|course|university|institution)\b/.test(text)) return "Education";
  return "Experience";
}

function buildDateConfirmationCard(sectionTitle, entryLabel, originalText, index) {
  return {
    id: `missing-date-${normalizeSectionLabel(sectionTitle)}-${index}`,
    type: "ask_date",
    section: sectionTitle,
    originalText,
    suggestedText: "",
    promptText: `This ${sectionTitle.toLowerCase()} entry is missing years/dates: ${entryLabel}. Enter the exact years to keep this section consistent.`,
    whyItHelps: "Entries in the same resume section should use the same date format; missing years look incomplete.",
    evidence: originalText,
    riskLevel: "medium",
    supportLevel: "user_confirmation_needed",
    status: "pending",
    mode: "dateConfirmation",
    missingTerm: entryLabel,
    requiresUserWording: true,
    requiresDateWording: true
  };
}

function getSpecificConfirmationPrompt(missingTerm, promptText = "") {
  const topic = normalize(String(missingTerm || ""));
  if (/^(?:ph\.?d\.?|doctorate|doctoral degree)$/.test(topic)) {
    return "Do you hold a PhD?";
  }
  if (/^(?:master'?s degree|m\.?sc\.?)$/.test(topic)) {
    return "Do you hold a Master's degree?";
  }
  return promptText;
}

function buildRequiredFieldCard(sectionTitle, field, entryLabel, originalText, index) {
  const fieldLabel = titleCase(field.replaceAll("_", " "));
  return {
    id: `missing-required-${normalizeSectionLabel(sectionTitle)}-${field}-${index}`,
    type: "ask_required",
    section: sectionTitle,
    originalText,
    suggestedText: "",
    promptText: `This ${sectionTitle.toLowerCase()} entry is missing a mandatory field: ${fieldLabel}. Enter the correct ${fieldLabel.toLowerCase()} for "${entryLabel}".`,
    whyItHelps: "This field is mandatory in the resume structure rules and should be filled by the user, not guessed.",
    evidence: originalText || entryLabel,
    riskLevel: "high",
    supportLevel: "user_confirmation_needed",
    status: "pending",
    mode: "requiredFieldConfirmation",
    missingTerm: fieldLabel,
    requiresUserWording: true,
    requiresRequiredFieldWording: true,
    requiredField: field,
    entryLabel
  };
}

function looksLikePhone(text) {
  return /(?:\+?\d[\d\s().-]{6,}\d)/.test(String(text || ""));
}

function looksLikeEmail(text) {
  return /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i.test(String(text || ""));
}

function looksLikeUrl(text) {
  return /\b(?:https?:\/\/|www\.|linkedin\.com|github\.com)\S+/i.test(String(text || ""));
}

function looksLikePersonName(text) {
  const clean = String(text || "").trim();
  if (!clean || looksLikePhone(clean) || looksLikeEmail(clean) || looksLikeUrl(clean)) return false;
  if (clean.length > 70) return false;
  return /^[A-Z][A-Za-z' -]+(?:\s+[A-Z][A-Za-z' -]+)+$/.test(clean) || /^[A-Z][A-Z' -]+(?:\s+[A-Z][A-Z' -]+)+$/.test(clean);
}

function buildHeaderConfirmationCard(field, index) {
  const labels = {
    name: "full name",
    phone: "phone number",
    email: "email address"
  };
  return {
    id: `missing-header-${field}-${index}`,
    type: "ask_header",
    section: "Header",
    originalText: "",
    suggestedText: "",
    promptText: `The resume header is missing the ${labels[field]}. Enter it exactly as it should appear on the resume.`,
    whyItHelps: "Name, phone number, and email address are essential resume header fields.",
    evidence: "Missing from header.",
    riskLevel: "high",
    supportLevel: "user_confirmation_needed",
    status: "pending",
    mode: "headerConfirmation",
    missingTerm: labels[field],
    requiresUserWording: true,
    requiresHeaderWording: true,
    headerField: field
  };
}

function collectMissingHeaderQuestions(resumeText) {
  const parsed = parseResumeText(resumeText);
  const headerText = parsed.headerLines.join(" ");
  const hasName = parsed.headerLines.some(looksLikePersonName);
  const cards = [];

  if (!hasName) cards.push(buildHeaderConfirmationCard("name", cards.length + 1));
  if (!looksLikePhone(headerText)) cards.push(buildHeaderConfirmationCard("phone", cards.length + 1));
  if (!looksLikeEmail(headerText)) cards.push(buildHeaderConfirmationCard("email", cards.length + 1));

  return cards;
}

function looksLikePartialNameLine(line) {
  const clean = String(line || "").trim();
  if (!clean || looksLikePhone(clean) || looksLikeEmail(clean) || looksLikeUrl(clean)) return false;
  if (looksLikePersonName(clean)) return true;
  if (clean.length > 35) return false;
  return /^[A-Z][A-Za-z' -]+$/.test(clean) || /^[A-Z][A-Z' -]+$/.test(clean);
}

function collectMissingDateQuestions(resumeText) {
  const parsed = parseResumeText(resumeText);
  const cards = [];

  for (const section of parsed.sections) {
    const canonical = canonicalSectionTitle(section.title);
    let entries = [];

    if (canonical === "experience") entries = parseExperienceEntries(section.lines);
    if (canonical === "education") entries = parseEducationEntries(section.lines);
    if (canonical === "publications") entries = parsePublicationEntries(section.lines);
    if (canonical === "patents") entries = parsePatentEntries(section.lines).entries;

    for (const entry of entries) {
      if (entry.year || entry.years) continue;
      const label = entry.title || entry.degree || entry.name || entry.company || "entry";
      const originalText = entry.rawLine || label;
      cards.push(buildDateConfirmationCard(section.title, label, originalText, cards.length + 1));
    }
  }

  return cards;
}

function looksLikeAuthorList(line) {
  return /,/.test(line) || /\b[A-Z]\.\s*[A-Z][A-Za-z-]+/.test(line) || /\band\b/i.test(line);
}

function getPublicationAuthors(entry) {
  return entry.details.filter((line) =>
    looksLikeAuthorList(line)
    && !/^https?:\/\//i.test(line)
    && !/\b(ACM|IEEE|Conference|Journal|Innovations|RecSys|CIKM|Big Data)\b/i.test(line)
  );
}

function collectMissingRequiredFieldQuestions(resumeText) {
  const parsed = parseResumeText(resumeText);
  const cards = [];

  function add(sectionTitle, field, entryLabel, originalText) {
    cards.push(buildRequiredFieldCard(sectionTitle, field, entryLabel || "entry", originalText || entryLabel || "", cards.length + 1));
  }

  for (const section of parsed.sections) {
    const canonical = canonicalSectionTitle(section.title);

    if (canonical === "experience") {
      for (const entry of parseExperienceEntries(section.lines)) {
        const label = entry.title || entry.company || entry.rawLine || "experience entry";
        if (!entry.title) add(section.title, "job_title", label, entry.rawLine);
        if (!entry.company) add(section.title, "company", label, entry.rawLine);
      }
    }

    if (canonical === "education") {
      for (const entry of parseEducationEntries(section.lines)) {
        const label = entry.degree || entry.institution || entry.rawLine || "education entry";
        if (!entry.degree) add(section.title, "degree", label, entry.rawLine);
        if (!entry.institution) add(section.title, "institution", label, entry.rawLine);
      }
    }

    if (canonical === "publications") {
      for (const entry of parsePublicationEntries(section.lines)) {
        const label = entry.name || entry.rawLine || "publication entry";
        if (!entry.name) add(section.title, "paper_title", label, entry.rawLine);
        if (!getPublicationAuthors(entry).length) add(section.title, "authors", label, entry.rawLine);
      }
    }

    if (canonical === "patents") {
      for (const entry of parsePatentEntries(section.lines).entries) {
        const label = entry.name || entry.rawLine || "patent entry";
        if (!entry.name) add(section.title, "patent_name", label, entry.rawLine);
        if (!entry.authors.length) add(section.title, "authors", label, entry.rawLine);
      }
    }
  }

  return cards;
}

function prepareActionableChanges(resumeText, changes) {
  const deduped = [];
  const seenIds = new Set();
  const seenQuestions = new Set();
  const removalExperienceTargets = collectRemovalExperienceTargets(changes);

  for (let change of changes) {
    if (!change) continue;
    if (!change.id || change.original_text != null || change.suggested_text != null || change.support_level != null || change.risk_level != null) {
      change = normalizeAiChangeCard(change, deduped.length);
    }
    if (seenIds.has(change.id)) continue;
    seenIds.add(change.id);
    change = pruneCoveredConfirmation(change, resumeText);
    if (!change) continue;
    if (isMalformedEmptyRewrite(change)) continue;
    if (isCoverLetterOnlySuggestion(change)) continue;

    if (change.type === "ask_user" || change.type === "ask_date" || change.type === "ask_header" || change.type === "ask_required") {
      if (isUnhelpfulMissingExperienceQuestion(change)) continue;
      if (isMissingExperienceQuestionForRemoval(change, removalExperienceTargets)) continue;
      const isModelDateQuestion = change.type === "ask_date" && !change.originalText;
      if (isModelDateQuestion) continue;
      const hasLocalDateQuestion = deduped.some((item) =>
        item.type === "ask_date"
        && item.originalText
        && canonicalSectionTitle(item.section) === canonicalSectionTitle(change.section)
      );
      if (isModelDateQuestion && hasLocalDateQuestion) continue;

      const key = questionDedupeKey(change);
      const missingTopic = missingExperienceDedupeTopic(change);
      if (missingTopic && resumeCoversMissingExperienceTopic(resumeText, missingTopic)) continue;
      if (seenQuestions.has(key)) continue;
      seenQuestions.add(key);
      deduped.push(change);
      continue;
    }

    if (change.mode === "reorderSection" && isReorderAlreadySatisfied(resumeText, change)) {
      continue;
    }

    if (change.mode === "reorderSection" && violatesFixedSectionOrder(change)) {
      continue;
    }

    if (change.mode === "noteOnly") {
      continue;
    }

    if (change.mode === "append" && looksLikeInstructionOnly(change.suggestedText)) {
      continue;
    }

    if (isNoOpChange(change) || isRenderedEquivalentChange(change)) {
      continue;
    }

    if (isSpellingOnlyRewrite(change)) {
      continue;
    }

    if (overlapsResumeCheckSpellingFix(change)) {
      continue;
    }

    if (removesMandatoryDatedSectionYear(change)) {
      continue;
    }

    if (removesCompletedDegreeEntry(change)) {
      continue;
    }

    if (
      isDateStyleOnlyChange(change)
      || isFormattingOnlyChange(change)
      || isStructureOnlyRewriteChange(change)
      || isExistingStructuredContentReorder(resumeText, change)
    ) {
      continue;
    }

    deduped.push(change);
  }

  return deduped;
}

function isMalformedEmptyRewrite(change) {
  if (!change || change.requiresUserWording || change.requiresDateWording) return false;
  if (!change.originalText || String(change.suggestedText || "").trim()) return false;

  // A deliberate removal is represented by removeOrReplace. A plain rewrite
  // with an empty After value is a provider failure and must never become a
  // card the user can accept.
  return change.type === "rewrite" || change.mode === "replace" || change.type === "replace";
}

function normalizedChangeTextForComparison(text) {
  return normalize(String(text || "")
    .replace(/[•*-]\s*/g, " ")
    .replace(/[–—]/g, "-")
    .replace(/\s+/g, " "));
}

function isNoOpChange(change) {
  if (!change || !change.originalText || change.suggestedText == null) return false;
  if (change.requiresUserWording || change.requiresDateWording || change.requiresRequiredFieldWording || change.requiresHeaderWording) return false;
  if (change.mode === "append" || change.mode === "insertAfterHeader" || change.mode === "replaceSection") return false;
  return normalizedChangeTextForComparison(change.originalText) === normalizedChangeTextForComparison(change.suggestedText);
}

function canonicalRenderedChangeText(text) {
  return normalizeDateStyleForComparison(text)
    .replace(/[^a-z0-9+#/]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isRenderedEquivalentChange(change) {
  if (!change?.originalText || !change?.suggestedText) return false;
  if (change.type === "spelling_check") return false;
  if (change.requiresUserWording || change.requiresDateWording || change.requiresRequiredFieldWording || change.requiresHeaderWording) return false;
  if (change.mode === "append" || change.mode === "insertAfterHeader" || change.mode === "replaceSection") return false;
  return canonicalRenderedChangeText(change.originalText) === canonicalRenderedChangeText(change.suggestedText);
}

function questionDedupeKey(change) {
  if (change.requiresHeaderWording) return `header-${change.headerField}`;
  if (change.requiresRequiredFieldWording) return `required-${canonicalSectionTitle(change.section)}-${change.requiredField}-${normalize(change.entryLabel || change.originalText || "")}`;
  if (change.requiresDateWording || change.type === "ask_date" || looksLikeDateQuestion(change.promptText)) {
    return `date-${normalize([change.section, change.missingTerm, change.originalText, change.evidence].filter(Boolean).join(" "))}`;
  }

  const missingExperienceTopic = missingExperienceDedupeTopic(change);
  if (missingExperienceTopic) return `missing-experience-${missingExperienceTopic}`;

  const text = normalize([change.missingTerm, change.promptText, change.evidence].filter(Boolean).join(" "));
  const programmingTerms = extractProgrammingAndToolNames([change.missingTerm, change.promptText, change.evidence].filter(Boolean).join(" "));
  if (programmingTerms.length >= 2) return "programming-languages";
  if (/\b(genai|generative ai|llm|rag|agentic|agent|prompt engineering|fine-tuning|fine tuning)\b/.test(text)) return "genai-llm";
  if (/\b(model evaluation|evaluation|metric|llm-as-judge|judge|human evaluation)\b/.test(text)) return "evaluation";
  if (/\b(programming languages?|basic qualifications?|c\/c\+\+|c\+\+|python|java|perl|sql|spark|langchain)\b/.test(text)) {
    return "programming-languages";
  }
  return text
    .replace(/\b(have you|do you|can you|any|experience|projects?|worked|with|in|the|a|an|or|and|that|demonstrate|capacity)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
}

function missingExperienceDedupeTopic(change) {
  if (!isMissingExperienceChange(change)) return "";
  const topic = cleanConfirmedText(change.missingTerm || "");
  const genericTopic = !topic || /^(specific experience|missing skill|programming languages?|skills?|experience)$/i.test(topic);
  const normalizedTopic = normalize(topic);
  const topicText = normalize([topic, change.promptText, change.evidence].filter(Boolean).join(" "));

  // Providers sometimes describe the same missing area once as a sentence and
  // once as a short label. Only normalize the card's own label here: supporting
  // evidence often mentions broad research language shared by unrelated cards.
  if (/\bcommunication\b/.test(normalizedTopic) && /\bcollaboration\b/.test(normalizedTopic)) return "communication-and-collaboration";
  if (/\bcommunication\b/.test(normalizedTopic)) return "communication";
  if (/\b(?:collaboration|cross functional|cross-functional)\b/.test(normalizedTopic)) return "collaboration";
  if (/\b(?:research areas?|research details?|research background)\b/.test(normalizedTopic)) return "research details";
  if (/^tableau(?:\s+dashboards?)?$/.test(normalizedTopic)) return "tableau";
  if (topic && !genericTopic && !topic.includes(",")) {
    if (/\bpatents?\b/.test(normalizedTopic)) return "patents";
    if (/\b(publications?|peer reviewed papers?|research papers?)\b/.test(normalizedTopic)) return "publications";
    if (/\b(phd|ph\.d|doctorate|doctoral degree)\b/.test(normalizedTopic)) return "phd";
    return normalizedTopic;
  }
  if (/\bpatents?\b/.test(topicText)) return "patents";
  if (/\b(publications?|peer reviewed papers?|research papers?)\b/.test(topicText)) return "publications";
  if (/\b(phd|ph\.d|doctorate|doctoral degree)\b/.test(topicText)) return "phd";
  const terms = extractQuestionTopicTerms(change.missingTerm, change.promptText, change.evidence);
  return terms.length === 1 ? normalize(terms[0]) : "";
}

function isUnhelpfulMissingExperienceQuestion(change) {
  if (!isMissingExperienceChange(change)) return false;
  const topic = normalize(change.missingTerm || "");
  const semanticTopic = missingExperienceDedupeTopic(change);
  const hasConcreteSemanticTopic = ["collaboration", "research details", "patents", "publications", "phd"].includes(semanticTopic)
    || extractQuestionTopicTerms(change.missingTerm, change.promptText, change.evidence).length > 0;
  const fullText = [change.missingTerm, change.promptText, change.whyItHelps, change.evidence]
    .filter(Boolean)
    .join(" ");
  const asksToExpandExistingRole = /\b(?:for your|from your time as|as a)\b[\s\S]{0,100}\b(role|position|job)\b/i.test(fullText)
    && /\b(details?|responsibilities|contributions|accomplishments)\b/i.test(fullText)
    && !extractQuestionTopicTerms(fullText).length;
  const genericRoleDetail = /\b(role|position|job|entry)\b[\s\S]{0,100}\b(lacks?|details?|responsibilities|contributions|accomplishments)\b/i.test(fullText)
    && !extractQuestionTopicTerms(fullText).length;
  return !topic
    || /^(specific|relevant|targeted)( research)? experience$/.test(topic)
    || /^(?:related|relevant)\s+(?:(?:field\s+)?research|field|background)(?:\s+(?:experience|work))?$/.test(topic)
    || /^(experience|skills?|projects?|missing evidence)$/.test(topic)
    || isAbstractRoleRequirement(topic)
    || isOrganizationOnlyTopic(topic)
    || asksToExpandExistingRole
    || genericRoleDetail
    || (!hasConcreteSemanticTopic && !isUsefulMissingExperienceLabel(change.missingTerm || ""));
}

function isOrganizationOnlyTopic(topic) {
  const value = String(topic || "").trim();
  if (!value) return false;
  if (/\b(University|Institute|Google|Microsoft|Amazon|Meta|Company|College|School)\b/i.test(value)) {
    return !/\b(Engineer|Scientist|Assistant|Intern|Developer|Programmer|Researcher|Analyst|Manager|Lead|Director|Student)\b/i.test(value);
  }
  return false;
}

function collectRemovalExperienceTargets(changes) {
  const targets = [];

  for (const rawChange of changes || []) {
    const change = rawChange?.id && rawChange.originalText != null
      ? rawChange
      : normalizeAiChangeCard(rawChange || {}, 0);
    if (canonicalSectionTitle(change.section) !== "experience") continue;
    if (change.mode !== "removeOrReplace" && change.type !== "remove_or_deemphasize") continue;

    const firstLine = String(change.originalText || "").split("\n")[0] || "";
    const target = normalize(removeYears(firstLine).replace(/^[-*•]\s*/, "").trim());
    if (target.length >= 6) targets.push(target);
  }

  return unique(targets);
}

function isMissingExperienceQuestionForRemoval(change, removalTargets) {
  if (!isMissingExperienceChange(change) || !removalTargets.length) return false;
  const text = normalize([
    change.missingTerm,
    change.promptText,
    change.whyItHelps,
    change.evidence
  ].filter(Boolean).join(" "));

  return removalTargets.some((target) => text.includes(target));
}

function resumeCoversMissingExperienceTopic(resumeText, topicKey) {
  if (topicKey === "patents") return hasSection(resumeText, ["patents", "patent"]);
  if (topicKey === "publications") return hasSection(resumeText, ["publications", "publication"]);
  if (topicKey === "phd") return /\b(?:ph\.?d\.?|doctorate|doctoral degree)\b/i.test(resumeText);
  if (["communication", "collaboration", "communication-and-collaboration"].includes(topicKey)) {
    return resumeCoversRoleRequirement(resumeText, topicKey);
  }
  return resumeCoversSkillTerm(resumeText, topicKey);
}

function setAiStatus(message, kind = "neutral") {
  aiStatus.textContent = message;
  aiStatus.dataset.kind = kind;
}

function getWorkingResumeText() {
  return finalResume.value.trim() || resumeInput.value.trim();
}

function getAcceptedChangesInApplyOrder() {
  return currentChanges
    .map((change, index) => ({ change, index }))
    .filter(({ change }) => change.status === "accepted" || change.status === "edited" || change.status === "partial")
    .sort((left, right) => {
      const leftSequence = Number.isFinite(left.change.acceptanceSequence) ? left.change.acceptanceSequence : 0;
      const rightSequence = Number.isFinite(right.change.acceptanceSequence) ? right.change.acceptanceSequence : 0;
      if (leftSequence && rightSequence) return leftSequence - rightSequence;
      if (leftSequence) return 1;
      if (rightSequence) return -1;
      return left.index - right.index;
    })
    .map(({ change }) => change);
}

function materializeAcceptedResumeText() {
  let output = resumeInput.value;
  for (const change of getAcceptedChangesInApplyOrder()) {
    output = applySingleChange(output, change);
  }
  return normalizeFinalResumeText(output);
}

function getResumeForPlacementTargets() {
  const acceptedChanges = getAcceptedChangesInApplyOrder();
  if (!acceptedChanges.length) return getWorkingResumeText();

  // Follow-up cards must use the materialized accepted draft, even if a stale
  // preview was left in the final-resume field when the next card opens.
  const materialized = materializeAcceptedResumeText();
  if (materialized) finalResume.value = materialized;
  return materialized || getWorkingResumeText();
}

// Placement controls must always inspect the accepted draft, rather than a
// preview that happened to be rendered before a prior card was accepted.
function getPlacementTargetResume() {
  return getResumeForPlacementTargets();
}

function markChangeAcceptedNow(change) {
  if (Number.isFinite(change?.acceptanceSequence)) return;
  acceptanceSequence += 1;
  change.acceptanceSequence = acceptanceSequence;
}

function hasTargetJobDescription() {
  return Boolean(jobInput.value.trim());
}

function extractSpecificTechTerms(text) {
  const value = String(text || "");
  const terms = [
    ...extractProgrammingAndToolNames(value)
  ];
  const patterns = [
    [/\bSQL\b/i, "SQL"],
    [/\bRAG\b/i, "RAG"],
    [/\bLLM(?:s)?\b/i, "LLM"],
    [/\bNLP\b/i, "NLP"],
    [/\bGenAI\b|\bgenerative AI\b/i, "GenAI"],
    [/\bembeddings?\b/i, "Embeddings"],
    [/\bprompt engineering\b/i, "Prompt Engineering"],
    [/\bfine[- ]?tuning\b/i, "Fine-tuning"]
  ];

  for (const [pattern, label] of patterns) {
    if (pattern.test(value)) terms.push(label);
  }

  return unique(terms);
}

function addsNewSpecificTechTerm(change) {
  const originalTerms = extractSpecificTechTerms(change.originalText);
  const suggestedTerms = extractSpecificTechTerms([
    change.suggestedText,
    change.promptText,
    change.missingTerm
  ].filter(Boolean).join(" "));
  return suggestedTerms.some((term) => !originalTerms.some((existing) => normalize(existing) === normalize(term)));
}

function normalizeDateStyleForComparison(text) {
  return normalize(String(text || "")
    .replace(/\(\s*((?:19|20)\d{2}(?:\s*(?:-|–|—|to|\s)\s*(?:Present|present|(?:19|20)\d{2}))?)\s*\)/g, " $1 ")
    .replace(/\b((?:19|20)\d{2})\s*(?:-|–|—|to|\s)\s*(Present|present|(?:19|20)\d{2})\b/g, (_, start, end) => `${start} ${String(end).toLowerCase()}`)
    .replace(/[(),.;:|]/g, " ")
    .replace(/\s+/g, " "));
}

function normalizeEntryAnchorForComparison(text) {
  return normalizeDateStyleForComparison(String(text || "")
    .replace(/^[-*•]\s*/, "")
    .replace(/\s+/g, " ")
    .trim());
}

function entryAnchorMatches(line, originalText) {
  const lineAnchor = normalizeEntryAnchorForComparison(line);
  const originalAnchor = normalizeEntryAnchorForComparison(originalText);
  return Boolean(lineAnchor && originalAnchor && lineAnchor === originalAnchor);
}

function isDateStyleOnlyChange(change) {
  if (!change?.originalText || !change?.suggestedText) return false;
  const original = normalizeDateStyleForComparison(change.originalText);
  const suggested = normalizeDateStyleForComparison(change.suggestedText);
  return original && original === suggested && change.originalText !== change.suggestedText;
}

function extractYearsSet(text) {
  return new Set((String(text || "").match(/\b(?:19|20)\d{2}\b/g) || []));
}

function sameYearSet(left, right) {
  const leftYears = extractYearsSet(left);
  const rightYears = extractYearsSet(right);
  if (leftYears.size !== rightYears.size) return false;
  return [...leftYears].every((year) => rightYears.has(year));
}

function removesMandatoryDatedSectionYear(change) {
  if (!change?.originalText || !change?.suggestedText) return false;
  if (change.type === "spelling_check") return false;
  if (change.requiresUserWording || change.requiresDateWording || change.requiresRequiredFieldWording || change.requiresHeaderWording) return false;
  if (change.mode === "append" || change.mode === "insertAfterHeader") return false;

  const datedSections = new Set(["experience", "education", "publications", "patents", "certifications", "projects", "volunteer_experience"]);
  const canonical = canonicalSectionTitle(change.section);
  if (!datedSections.has(canonical)) return false;

  const originalYears = extractYearsSet(change.originalText);
  const suggestedYears = extractYearsSet(change.suggestedText);
  if (!originalYears.size) return false;
  return [...originalYears].some((year) => !suggestedYears.has(year));
}

function meaningfulContentTokens(text) {
  const stopWords = new Set([
    "and", "the", "with", "for", "from", "that", "this", "into", "role", "entry",
    "section", "resume", "date", "dates", "year", "years", "format", "formatted",
    "standard", "standardize", "standardized", "consistent", "consistency",
    "readability", "clarity", "consolidate", "consolidated", "organize", "organized",
    "thesis", "in", "of", "to", "by", "on", "at", "a", "an"
  ]);
  return unique(normalizeDateStyleForComparison(text)
    .replace(/\b(?:19|20)\d{2}\b/g, " ")
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 3 && !stopWords.has(token)));
}

function tokenOverlapRatio(sourceText, candidateText) {
  const source = new Set(meaningfulContentTokens(sourceText));
  const candidate = meaningfulContentTokens(candidateText);
  if (!candidate.length) return 1;
  const hits = candidate.filter((token) => source.has(token)).length;
  return hits / candidate.length;
}

function isFormattingOnlyChange(change) {
  if (!change?.originalText || !change?.suggestedText) return false;
  if (change.type === "spelling_check") return false;
  if (change.requiresUserWording || change.requiresDateWording || change.requiresRequiredFieldWording || change.requiresHeaderWording) return false;
  if (change.mode === "append" || change.mode === "insertAfterHeader") return false;
  if (addsNewSpecificTechTerm(change)) return false;

  const text = [change.type, change.section, change.whyItHelps, change.evidence, change.suggestedText].filter(Boolean).join(" ");
  const hasFormattingCue = /\b(format|reformat|standardi[sz]e|standard|consistent|consistency|date placement|date format|readability|clarity|consolidat|organize|layout)\b/i.test(text);
  if (!hasFormattingCue) return false;
  if (!sameYearSet(change.originalText, change.suggestedText)) return false;

  return tokenOverlapRatio(change.originalText, change.suggestedText) >= 0.85;
}

function removesCompletedDegreeEntry(change) {
  if (canonicalSectionTitle(change.section) !== "education") return false;
  if (change.mode !== "removeOrReplace") return false;

  const suggested = String(change.suggestedText || "").trim();
  if (suggested && !looksLikeRemovalInstructionOnly(suggested) && !looksLikeInstructionOnly(suggested)) {
    return false;
  }

  return String(change.originalText || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .some((line) => isDegreeLine(line));
}

function isStructureOnlyRewriteChange(change) {
  if (!change?.originalText || !change?.suggestedText) return false;
  if (change.type === "spelling_check") return false;
  if (change.requiresUserWording || change.requiresDateWording || change.requiresRequiredFieldWording || change.requiresHeaderWording) return false;
  if (change.mode === "append" || change.mode === "insertAfterHeader") return false;
  if (addsNewSpecificTechTerm(change)) return false;
  if (!sameYearSet(change.originalText, change.suggestedText)) return false;

  const section = canonicalSectionTitle(change.section);
  const text = [change.type, change.section, change.whyItHelps, change.evidence].filter(Boolean).join(" ");
  const isStructureSection = ["education", "experience", "publications", "patents", "certifications"].includes(section);
  const isStructureCue = /\b(format|reformat|standardi[sz]e|standard|consistent|consistency|date placement|date format|layout|structure|consolidat|organize)\b/i.test(text);
  if (!isStructureSection || !isStructureCue) return false;

  return tokenOverlapRatio(change.originalText, change.suggestedText) >= 0.78
    && tokenOverlapRatio(change.suggestedText, change.originalText) >= 0.78;
}

function isExistingStructuredContentReorder(resumeText, change) {
  if (!change?.originalText || !change?.suggestedText) return false;
  if (change.type === "spelling_check" || change.mode !== "replace") return false;
  if (change.requiresUserWording || change.requiresDateWording || change.requiresRequiredFieldWording || change.requiresHeaderWording) return false;
  if (addsNewSpecificTechTerm(change)) return false;

  const sectionName = canonicalSectionTitle(change.section);
  if (!["education", "experience", "publications", "patents", "certifications"].includes(sectionName)) return false;

  const explanation = [change.type, change.whyItHelps, change.evidence].filter(Boolean).join(" ");
  if (!/\b(reorder|rearrang|readability|format|layout|structure|consolidat|organize|first|placement)\b/i.test(explanation)) {
    return false;
  }
  if (!sameYearSet(change.originalText, change.suggestedText)) return false;

  const parsed = parseResumeText(resumeText);
  const section = parsed.sections.find((item) => canonicalSectionTitle(item.title) === sectionName);
  if (!section) return false;

  const availableTokens = new Set(meaningfulContentTokens(section.lines.join(" ")));
  const proposedTokens = meaningfulContentTokens(change.suggestedText);
  return proposedTokens.length > 0 && proposedTokens.every((token) => availableTokens.has(token));
}

function isConcreteChangeNoOpForResume(resumeText, change) {
  if (!change || !["replace", "removeOrReplace"].includes(change.mode)) return false;
  if (change.type === "spelling_check") return false;
  if (change.requiresUserWording || change.requiresDateWording || change.requiresRequiredFieldWording || change.requiresHeaderWording) return false;

  const before = normalizeFinalResumeText(resumeText);
  const after = normalizeFinalResumeText(applySingleChange(resumeText, change));
  return Boolean(before && before === after);
}

function isImportantGeneralWordingFix(change) {
  const text = [
    change.originalText,
    change.suggestedText,
    change.whyItHelps,
    change.evidence
  ].filter(Boolean).join(" ");

  if (isDateStyleOnlyChange(change)) return false;
  const hasObjectiveIssue = /\b(spelling|spell|typo|misspell|misspelled|pdf extraction|extraction artifact)\b/i.test(text);
  const hasSubjectiveOptimization = /\b(stronger|strengthen|action[- ]oriented|role[- ]fit|role[- ]relevant|role[- ]targeted|targeted role|impactful|impressive|emphasize|deemphasize|better signal|leadership signal|methodology|common data science|optimi[sz]e for|more relevant|general resume improvement|proven track record|expertise|leverages)\b/i.test(text);
  if (hasSubjectiveOptimization) return false;

  return hasObjectiveIssue;
}

function isGeneralResumeSuggestionAllowed(change) {
  if (!change) return false;
  if (getChangePriorityClass(change) === "mandatory") return true;

  const supportLevel = normalize(change.supportLevel || "");
  if (supportLevel === "user_confirmation_needed" || supportLevel === "unsupported") return false;
  if (change.requiresUserWording || change.type === "ask_user" || change.type === "add_keyword") return false;
  if (change.mode === "appendUserConfirmed" || change.mode === "dateConfirmation") return false;

  const concreteRewrite = (change.mode === "replace" || change.type === "rewrite")
    && change.originalText
    && change.suggestedText
    && !looksLikeInstructionOnly(change.suggestedText);
  const concreteSectionReplacement = change.mode === "replaceSection"
    && isKnownResumeSection(change.section)
    && change.suggestedText
    && !looksLikeInstructionOnly(change.suggestedText);
  const summaryInsertion = change.mode === "insertAfterHeader"
    && /\b(summary|statement|profile)\b/i.test(change.section || "")
    && change.suggestedText
    && !looksLikeInstructionOnly(change.suggestedText);
  const concreteRemoval = change.mode === "removeOrReplace"
    && change.originalText
    && !looksLikeInstructionOnly(change.suggestedText || "");

  if (!concreteRewrite && !concreteSectionReplacement && !summaryInsertion && !concreteRemoval) return false;
  if (addsNewSpecificTechTerm(change)) return false;
  if (!isImportantGeneralWordingFix(change)) return false;

  return true;
}

function buildLocalSuggestionFallbackCards(resumeText, jobText) {
  const hasJobDescription = Boolean(String(jobText || "").trim());
  const analysis = buildJobAnalysis(resumeText, jobText);
  const generated = prepareActionableChanges(resumeText, generateChanges(resumeText, analysis));
  const filteredGenerated = hasJobDescription ? generated : generated.filter(isGeneralResumeSuggestionAllowed);
  if (filteredGenerated.length) return filteredGenerated;
  const guaranteed = buildGuaranteedFallbackChange(resumeText, jobText);
  const guaranteedCards = guaranteed ? prepareActionableChanges(resumeText, [guaranteed]) : [];
  if (!hasJobDescription) return guaranteedCards.filter(isGeneralResumeSuggestionAllowed);
  const missingFallbacks = prepareActionableChanges(resumeText, buildSpecificMissingExperienceFallbacks(resumeText, analysis));
  return uniqueById([...guaranteedCards, ...missingFallbacks]);
}

function mergeLocallyDetectedMissingExperience(resumeText, jobText, cards) {
  if (!String(jobText || "").trim()) return cards;
  const locallyDetectedMissing = buildSpecificMissingExperienceFallbacks(resumeText, null, 50, jobText);
  return prepareActionableChanges(resumeText, [...cards, ...locallyDetectedMissing]);
}

async function analyzeWithAi(options = {}) {
  const resumeText = getWorkingResumeText();
  const jobText = jobInput.value.trim();
  const pageBudgetMode = Boolean(options.pageBudgetMode);

  if (!resumeText) {
    setAiStatus("Paste or upload a resume before using AI.", "error");
    return;
  }

  refreshResumeCheckPass(resumeText, { activate: false });
  markPassesLoading(pageBudgetMode ? [PASS_SUGGESTIONS] : [PASS_SUGGESTIONS, PASS_MISSING_EXPERIENCE]);
  analyzeAiBtn.disabled = true;
  const startedAt = Date.now();
  const baseStatus = pageBudgetMode
    ? "Calling OpenRouter for concise shortening suggestions"
    : jobText ? "Calling OpenRouter for role-specific tailoring" : "Calling OpenRouter for a general resume review";
  const elapsedSeconds = () => Math.max(0, Math.round((Date.now() - startedAt) / 1000));
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 180_000);
  const timerId = setInterval(() => {
    setAiStatus(`${baseStatus}... ${elapsedSeconds()}s elapsed`, "neutral");
  }, 1000);
  setAiStatus(`${baseStatus}... 0s elapsed`, "neutral");

  try {
    const response = await fetch("/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        resume: resumeText,
        jobDescription: jobText,
        pageBudgetMode
      })
    });

    const rawResponse = await response.text();
    let data;

    try {
      data = JSON.parse(rawResponse);
    } catch {
      if (rawResponse.trim().startsWith("<")) {
        throw new Error("AI backend returned HTML instead of JSON. Stop the Python static server and start the app with `node server.mjs`.");
      }
      throw new Error("AI backend returned invalid JSON.");
    }

    if (!response.ok) {
      throw new Error(data.error || "AI analysis failed.");
    }

    const rawChangeCards = firstArray(data, ["change_cards", "changeCards", "changes", "suggestions"]);
    const rawQuestions = firstArray(data, ["user_questions", "userQuestions", "questions"]);
    const aiCards = rawChangeCards.map(normalizeAiChangeCard);
    const questionCards = pageBudgetMode ? [] : normalizeAiQuestions(rawQuestions, aiCards.length);
    const analysisQuestionCards = pageBudgetMode
      ? []
      : buildMissingExperienceCardsFromRequirements(data, resumeText, jobText, aiCards.length + questionCards.length);
    const jobScopedCards = pageBudgetMode
      ? [...aiCards, ...questionCards]
      : retainOnlyCanonicalMissingExperienceCards([...aiCards, ...questionCards], data, resumeText, jobText);
    let actionableCards = prepareActionableChanges(resumeText, [...jobScopedCards, ...analysisQuestionCards]);
    if (!pageBudgetMode && jobText) {
      actionableCards = mergeLocallyDetectedMissingExperience(resumeText, jobText, actionableCards);
    }
    if (pageBudgetMode) {
      actionableCards = actionableCards.filter((change) => inferChangePass(change) === PASS_SUGGESTIONS);
    } else if (!jobText) {
      actionableCards = actionableCards.filter(isGeneralResumeSuggestionAllowed);
    }
    let fallbackUsed = false;

    if (!actionableCards.length) {
      const localFallback = pageBudgetMode
        ? []
        : buildLocalSuggestionFallbackCards(resumeText, jobText);
      if (localFallback.length) {
        actionableCards = localFallback;
        fallbackUsed = true;
      }
    }

    if (pageBudgetMode) {
      replacePassChanges(PASS_SUGGESTIONS, normalizeChangePasses(actionableCards), { activate: true });
      completedPasses.add(PASS_SUGGESTIONS);
      updatePassUi();
      renderNumberedCommentPreview();
      renderChanges();
    } else {
      setAiReviewPassChanges(actionableCards);
    }
    renderAiAnalysis(data, {
      baselineResume: resumeInput.value.trim() || resumeText,
      jobText
    });
    const rawCount = rawChangeCards.length + rawQuestions.length;
    const statusKind = actionableCards.length ? "success" : "error";
    const fallbackText = fallbackUsed ? " Used local fallback suggestions because the AI returned no actionable comments." : "";
    const emptyText = actionableCards.length
      ? `${actionableCards.length} comment${actionableCards.length === 1 ? "" : "s"} ready.`
      : pageBudgetMode
        ? "No safe shortening suggestions were produced. Your resume was left unchanged."
        : `No actionable comments were produced. Raw AI items: ${rawCount}. Try a stronger model or add a job description.`;
    setAiStatus(`AI analysis complete using ${data.model || "OpenRouter"} in ${elapsedSeconds()}s. ${emptyText}${fallbackText}`, statusKind);
  } catch (error) {
    const localFallback = pageBudgetMode ? [] : buildLocalSuggestionFallbackCards(resumeText, jobText);
    if (localFallback.length && /invalid JSON|returned invalid JSON|repair failed|malformed JSON/i.test(error.message || "")) {
      setAiReviewPassChanges(localFallback);
      latestAiAnalysis = null;
      latestAiJobDescription = "";
      latestAiBaselineResume = "";
      renderAnalysis(buildJobAnalysis(resumeText, jobText));
      setAiStatus(`AI returned malformed JSON, so I showed ${localFallback.length} local fallback comment${localFallback.length === 1 ? "" : "s"} instead. (${elapsedSeconds()}s elapsed)`, "success");
      return;
    }

    const message = error.name === "AbortError"
      ? "AI request timed out after 180s. The model may be stuck or overloaded."
      : (error.message || "Could not call OpenRouter.");
    setAiStatus(`${message} (${elapsedSeconds()}s elapsed)`, "error");
  } finally {
    clearTimeout(timeoutId);
    clearInterval(timerId);
    clearPassesLoading(pageBudgetMode ? [PASS_SUGGESTIONS] : [PASS_SUGGESTIONS, PASS_MISSING_EXPERIENCE]);
    analyzeAiBtn.disabled = false;
  }
}
