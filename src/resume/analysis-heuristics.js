function wordCount(text) {
  const words = text.trim().split(/\s+/).filter(Boolean);
  return words.length;
}

function normalize(text) {
  return text.toLowerCase();
}

function unique(items) {
  return [...new Set(items.filter(Boolean))];
}

function textContainsTopicTerm(text, term) {
  const cleanTerm = String(term || "").trim();
  if (!cleanTerm) return false;

  if (/^[A-Za-z0-9 ]+$/.test(cleanTerm)) {
    const words = cleanTerm.split(/\s+/).map(escapeRegExp).join("\\s+");
    return new RegExp(`\\b${words}\\b`, "i").test(text);
  }

  return new RegExp(`(^|[^A-Za-z0-9+#])${escapeRegExp(cleanTerm)}(?=$|[^A-Za-z0-9+#])`, "i").test(text);
}

function findTerms(text, lexicon = skillLexicon) {
  const lower = normalize(text);
  return lexicon.filter((term) => lower.includes(term));
}

function splitLines(text) {
  return text
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function extractBulletLines(text) {
  return splitLines(text).filter((line) => /^[-*•]/.test(line));
}

function stripBullet(line) {
  return line.replace(/^[-*•]\s*/, "").trim();
}

function containsResumePlaceholder(line) {
  return /\[(?:[^\]]*(?:confirm|confirmed|user input|ask user|tbd|to be|pending)[^\]]*)\]/i.test(line)
    || /\b(to be confirmed|per user input|ask user|user should|tbd|todo)\b/i.test(line);
}

function removeResumePlaceholders(text) {
  return String(text || "")
    .split("\n")
    .filter((line) => !containsResumePlaceholder(line))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function inferSeniority(jobText) {
  const lower = normalize(jobText);
  if (/\b(principal|staff|director|head of)\b/.test(lower)) return "senior+";
  if (/\b(senior|lead|sr\.)\b/.test(lower)) return "senior";
  if (/\b(junior|entry|associate)\b/.test(lower)) return "early-career";
  return "mid-level or unspecified";
}

function extractJobTitle(jobText) {
  const firstLine = splitLines(jobText)[0] || "Target role";
  return firstLine.length > 80 ? "Target role" : firstLine;
}

function buildJobAnalysis(resumeText, jobText) {
  if (!jobText.trim()) {
    return {
      title: "General resume review",
      seniority: "No target job provided",
      jobTerms: [],
      resumeTerms: findTerms(resumeText),
      covered: [],
      missing: [],
      responsibilities: [],
      score: null
    };
  }

  const jobTerms = findTerms(jobText);
  const resumeTerms = findTerms(resumeText);
  const covered = jobTerms.filter((term) => resumeTerms.includes(term));
  const missing = jobTerms.filter((term) => !resumeTerms.includes(term));
  const score = jobTerms.length ? Math.round((covered.length / jobTerms.length) * 100) : 0;

  const responsibilities = splitLines(jobText)
    .filter((line) => /build|develop|evaluate|run|partner|deploy|design|translate|analyz/i.test(line))
    .slice(0, 6);

  return {
    title: extractJobTitle(jobText),
    seniority: inferSeniority(jobText),
    jobTerms,
    resumeTerms,
    covered,
    missing,
    responsibilities,
    score
  };
}

function findEvidenceForTerm(resumeText, term) {
  const lowerTerm = normalize(term);
  const lines = splitLines(resumeText);
  return lines.find((line) => normalize(line).includes(lowerTerm)) || "";
}

function suggestSummaryChange(resumeText, analysis) {
  const lines = splitLines(resumeText);
  const summaryIndex = lines.findIndex((line) => /summary|profile|statement/i.test(line));
  const hasSummary = summaryIndex !== -1;
  const nextLine = hasSummary ? lines[summaryIndex + 1] || "" : "";
  const coveredTerms = analysis.covered.slice(0, 5).join(", ");
  const impactTerms = ["production", "experimentation", "recommendation", "ranking", "personalization"]
    .filter((term) => analysis.covered.includes(term))
    .join(", ");

  const suggestedText = [
    `${analysis.title.replace(/\.$/, "")} candidate with experience in ${coveredTerms || "role-relevant technical work"}.`,
    impactTerms
      ? `Strengths include ${impactTerms}, cross-functional execution, and evidence-based product improvement.`
      : "Strengths include cross-functional execution, analytical problem solving, and evidence-based product improvement."
  ].join(" ");

  if (!hasSummary) {
    return {
      id: "summary-add",
      type: "rewrite",
      section: "Professional Summary",
      originalText: "",
      suggestedText: `PROFESSIONAL SUMMARY\n${suggestedText}`,
      whyItHelps: "Adds a concise role-targeted summary at the top of the resume.",
      evidence: analysis.covered.map((term) => findEvidenceForTerm(resumeText, term)).filter(Boolean).slice(0, 3).join("\n"),
      riskLevel: "medium",
      supportLevel: "resume_supported",
      status: "pending",
      mode: "insertAfterHeader"
    };
  }

  if (nextLine && /\b(seeking|growth|challenging)\b|\b(learn|grow)\b/i.test(nextLine)) {
    return {
      id: "summary-rewrite",
      type: "rewrite",
      section: "Professional Summary",
      originalText: nextLine,
      suggestedText,
      whyItHelps: "Replaces candidate-centered language with role-fit, seniority, and evidence.",
      evidence: analysis.covered.map((term) => findEvidenceForTerm(resumeText, term)).filter(Boolean).slice(0, 3).join("\n"),
      riskLevel: "low",
      supportLevel: "resume_supported",
      status: "pending",
      mode: "replace"
    };
  }

  if (nextLine && analysis.covered.length >= 2) {
    return {
      id: "summary-tune",
      type: "rewrite",
      section: "Professional Summary",
      originalText: nextLine,
      suggestedText,
      whyItHelps: "Makes the summary more specific to the target job description.",
      evidence: analysis.covered.map((term) => findEvidenceForTerm(resumeText, term)).filter(Boolean).slice(0, 3).join("\n"),
      riskLevel: "low",
      supportLevel: "resume_supported",
      status: "pending",
      mode: "replace"
    };
  }

  return null;
}

function suggestBulletRewrites(resumeText, analysis) {
  const bullets = extractBulletLines(resumeText);
  const changes = [];

  for (const bullet of bullets) {
    const clean = stripBullet(bullet);
    const matchingRewrite = weakPhraseRewrites.find((rewrite) => rewrite.pattern.test(clean));
    if (!matchingRewrite) continue;

    let suggested = clean.replace(matchingRewrite.pattern, matchingRewrite.replacement);

    if (/recommendation|ranking|personalization/i.test(clean) && analysis.jobTerms.some((term) => ["recommendation", "ranking", "personalization"].includes(term))) {
      suggested = suggested.replace(/models/i, "models for ranking and personalization");
    }

    if (/experiment/i.test(suggested) && analysis.jobTerms.includes("model evaluation")) {
      suggested = `${suggested.replace(/\.$/, "")} to evaluate model quality and guide product decisions.`;
    }

    changes.push({
      id: `bullet-${changes.length + 1}`,
      type: "rewrite",
      section: "Professional Experience",
      originalText: bullet,
      suggestedText: `- ${suggested.replace(/\.$/, "")}.`,
      whyItHelps: matchingRewrite.reason,
      evidence: bullet,
      riskLevel: "low",
      supportLevel: "resume_supported",
      status: "pending",
      mode: "replace"
    });
  }

  return changes.slice(0, 5);
}

function preserveReplacementCase(original, replacement) {
  if (!original) return replacement;
  if (original.toUpperCase() === original) return replacement.toUpperCase();
  if (original[0]?.toUpperCase() === original[0]) {
    return replacement[0].toUpperCase() + replacement.slice(1);
  }
  return replacement;
}

function preserveSpellingReplacementCase(line, match, replacement, index = 0) {
  const replaced = preserveReplacementCase(match, replacement);
  if (String(line || "").trim() === match) return replaced;
  const prefix = String(line || "").slice(0, index).replace(/^[-*•]\s*/, "").trim();
  if (!prefix && match === match.toLowerCase()) {
    return replacement[0].toUpperCase() + replacement.slice(1);
  }
  return replaced;
}

function editDistanceAtMostOne(a, b) {
  const left = normalize(a || "");
  const right = normalize(b || "");
  if (!left || !right || left === right) return false;
  if (Math.abs(left.length - right.length) > 1) return false;

  let i = 0;
  let j = 0;
  let edits = 0;

  while (i < left.length && j < right.length) {
    if (left[i] === right[j]) {
      i += 1;
      j += 1;
      continue;
    }

    edits += 1;
    if (edits > 1) return false;

    if (left.length > right.length) i += 1;
    else if (right.length > left.length) j += 1;
    else {
      i += 1;
      j += 1;
    }
  }

  return edits + (left.length - i) + (right.length - j) <= 1;
}

function getFuzzySpellingReplacement(word) {
  const clean = String(word || "");
  if (clean.length < 5 || /[A-Z]{2,}/.test(clean) || /[^A-Za-z]/.test(clean)) return "";
  const lower = normalize(clean);
  if (spellingVocabulary.includes(lower)) return "";
  const candidate = spellingVocabulary.find((term) =>
    Math.abs(term.length - lower.length) <= 1
    && editDistanceAtMostOne(lower, term)
  );
  if (candidate && differsOnlyByInflection(lower, candidate)) return "";
  return candidate ? preserveReplacementCase(clean, candidate) : "";
}

function differsOnlyByInflection(word, candidate) {
  const lowerWord = normalize(word);
  const lowerCandidate = normalize(candidate);
  if (!lowerWord || !lowerCandidate) return false;

  return lowerWord.endsWith("s") && lowerWord.slice(0, -1) === lowerCandidate
    || lowerWord.endsWith("es") && lowerWord.slice(0, -2) === lowerCandidate
    || lowerWord.endsWith("ies")
      && `${lowerWord.slice(0, -3)}y` === lowerCandidate;
}

function isAllCapsSpellingToken(text) {
  const letters = String(text || "").replace(/[^A-Za-z]/g, "");
  return letters.length >= 2 && letters === letters.toUpperCase();
}

function applyCommonSpellingCorrections(line) {
  let corrected = String(line || "");
  for (const [typo, replacement] of commonSpellingCorrections) {
    const pattern = new RegExp(`\\b${escapeRegExp(typo)}\\b`, "gi");
    corrected = corrected.replace(pattern, (match, offset) =>
      isAllCapsSpellingToken(match) ? match : preserveSpellingReplacementCase(corrected, match, replacement, offset)
    );
  }
  corrected = corrected.replace(/\b[A-Za-z]{5,}\b/g, (word) => getFuzzySpellingReplacement(word) || word);
  return corrected;
}

function findSpellingFixesInLine(line) {
  const text = String(line || "");
  const fixes = [];

  for (const [typo, replacement] of commonSpellingCorrections) {
    const pattern = new RegExp(`\\b${escapeRegExp(typo)}\\b`, "gi");
    for (const match of text.matchAll(pattern)) {
      if (isAllCapsSpellingToken(match[0])) continue;
      fixes.push({
        typo: match[0],
        replacement: preserveSpellingReplacementCase(text, match[0], replacement, match.index ?? 0),
        index: match.index ?? 0
      });
    }
  }

  for (const match of text.matchAll(/\b[A-Za-z]{5,}\b/g)) {
    const replacement = getFuzzySpellingReplacement(match[0]);
    if (!replacement) continue;
    fixes.push({
      typo: match[0],
      replacement,
      index: match.index ?? 0
    });
  }

  const deduped = fixes
    .sort((left, right) => left.index - right.index)
    .filter((fix, index, all) =>
      all.findIndex((other) => other.index === fix.index && other.typo === fix.typo) === index
    );
  return deduped.filter((fix, index, all) => !all.some((other, otherIndex) =>
    otherIndex !== index
    && other.index <= fix.index
    && other.index + other.typo.length >= fix.index + fix.typo.length
    && other.typo.length > fix.typo.length
  ));
}

function applySingleSpellingFix(line, typo, replacement) {
  if (!typo || !replacement) return line;
  return String(line || "").replace(
    new RegExp(`\\b${escapeRegExp(typo)}\\b`, "i"),
    replacement
  );
}

function getSpellingDiffTerms(originalText, suggestedText) {
  const original = String(originalText || "");
  const suggested = String(suggestedText || "");
  const terms = [];

  for (const [typo] of commonSpellingCorrections) {
    const pattern = new RegExp(`\\b${escapeRegExp(typo)}\\b`, "gi");
    for (const match of original.matchAll(pattern)) {
      if (!suggested.includes(match[0])) terms.push(match[0]);
    }
  }

  for (const match of original.matchAll(/\b[A-Za-z]{5,}\b/g)) {
    const replacement = getFuzzySpellingReplacement(match[0]);
    if (replacement && suggested.includes(replacement)) terms.push(match[0]);
  }

  return unique(terms);
}

function getSpellingCorrectedTerms(originalText, suggestedText) {
  return unique(getSpellingDiffTerms(originalText, suggestedText)
    .map(applyCommonSpellingCorrections)
    .filter((word) => word && word !== originalText));
}

function canonicalSpellingComparisonText(text) {
  return normalize(String(text || "")
    .replace(/[•*-]\s*/g, " ")
    .replace(/[.,;:()[\]{}'"]/g, " ")
    .replace(/\s+/g, " ")
    .trim());
}

function isSpellingOnlyRewrite(change) {
  if (!change?.originalText || !change?.suggestedText) return false;
  if (change.type === "spelling_check") return false;
  if (change.requiresUserWording || change.requiresDateWording || change.requiresRequiredFieldWording || change.requiresHeaderWording) return false;

  const original = canonicalSpellingComparisonText(change.originalText);
  const suggested = canonicalSpellingComparisonText(change.suggestedText);
  if (!original || !suggested || original === suggested) return false;

  const corrected = canonicalSpellingComparisonText(applyCommonSpellingCorrections(change.originalText));
  return corrected === suggested;
}

function overlapsResumeCheckSpellingFix(change) {
  if (!change?.originalText || !change?.suggestedText || change.type === "spelling_check") return false;
  if (change.requiresUserWording || change.requiresDateWording || change.requiresRequiredFieldWording || change.requiresHeaderWording) return false;

  const suggested = canonicalSpellingComparisonText(change.suggestedText);
  if (!suggested) return false;
  return findSpellingFixesInLine(change.originalText).some((fix) => {
    const correctedTerm = canonicalSpellingComparisonText(fix.replacement);
    const typoTerm = canonicalSpellingComparisonText(fix.typo);
    return correctedTerm
      && suggested.includes(correctedTerm)
      && (!typoTerm || !suggested.includes(typoTerm));
  });
}

function getSpellingDisplayPair(change) {
  if (change?.type !== "spelling_check") {
    return {
      before: change?.originalText || "",
      after: change?.suggestedText || "",
      tokenOnly: false
    };
  }

  if (change.spellingBefore && change.spellingAfter) {
    return { before: change.spellingBefore, after: change.spellingAfter, tokenOnly: true };
  }

  const beforeTerms = getSpellingDiffTerms(change.originalText, change.suggestedText);
  const afterTerms = getSpellingCorrectedTerms(change.originalText, change.suggestedText);
  if (beforeTerms.length === 1 && afterTerms.length === 1) {
    return { before: beforeTerms[0], after: afterTerms[0], tokenOnly: true };
  }

  return {
    before: change.originalText || "",
    after: change.suggestedText || "",
    tokenOnly: false
  };
}

function buildSpellingSuggestedLine(change, editValue) {
  if (change?.type !== "spelling_check") return editValue;
  const display = getSpellingDisplayPair(change);
  const replacement = cleanConfirmedText(editValue);
  if (replacement === cleanConfirmedText(change.suggestedText)) return change.suggestedText;
  if (/\s/.test(replacement)) return editValue;
  if (!display.tokenOnly || !display.before || !replacement) return editValue;
  return applySingleSpellingFix(change.originalText, display.before, replacement);
}

function isSpellcheckProseLine(sectionTitle, line, index, sectionLines) {
  const clean = String(line || "").trim();
  if (!clean || looksLikeEmail(clean) || looksLikeUrl(clean)) return false;
  const canonical = canonicalSectionTitle(sectionTitle);
  if (["publications", "patents"].includes(canonical)) return false;
  if (canonical === "education") return false;
  if (canonical === "experience") {
    if (/^\s*[-*•]\s+/.test(clean)) return true;
    const entries = parseExperienceEntries(sectionLines);
    return entries.some((entry) => (entry.bullets || []).some((bullet) => bullet.trim() === clean));
  }
  return true;
}

function suggestSpellingFixes(resumeText) {
  const parsed = parseResumeText(resumeText);
  const changes = [];

  for (const section of parsed.sections) {
    for (let index = 0; index < section.lines.length; index += 1) {
      const line = section.lines[index];
      const cleanLine = String(line || "");
      if (!isSpellcheckProseLine(section.title, cleanLine, index, section.lines)) continue;
      const fixes = findSpellingFixesInLine(cleanLine);

      for (const fix of fixes) {
        const corrected = applySingleSpellingFix(cleanLine, fix.typo, fix.replacement);
        if (corrected === cleanLine) continue;
        changes.push({
        id: `spelling-${changes.length + 1}`,
        type: "spelling_check",
        section: section.title,
        originalText: cleanLine,
        suggestedText: corrected,
        spellingBefore: fix.typo,
        spellingAfter: fix.replacement,
        whyItHelps: "Fixes spelling mistakes.",
        evidence: cleanLine,
        riskLevel: "low",
        supportLevel: "resume_supported",
        status: "pending",
        mode: "replace"
        });
      }
    }
  }

  return changes.slice(0, 5);
}

function suggestSkillAdditions(resumeText, analysis) {
  const resumeLower = normalize(resumeText);
  const safeSkillTerms = analysis.covered.filter((term) => !resumeLower.includes(`skills`) || !resumeLower.includes(term));

  const skillsLine = splitLines(resumeText).find((line) => /^skills\b/i.test(line));
  if (!skillsLine && safeSkillTerms.length) {
    return [
      {
        id: "skills-add",
        type: "add_keyword",
        section: "Skills",
        originalText: "",
        suggestedText: `SKILLS\n${safeSkillTerms.slice(0, 8).join(", ")}`,
        whyItHelps: "Adds a scannable skills section using terms already supported elsewhere in the resume.",
        evidence: safeSkillTerms.map((term) => findEvidenceForTerm(resumeText, term)).filter(Boolean).slice(0, 4).join("\n"),
        riskLevel: "medium",
        supportLevel: "resume_supported",
        status: "pending",
        mode: "append"
      }
    ];
  }

  return [];
}

function suggestQuestions(resumeText, analysis) {
  const adjacentMap = {
    llm: ["machine learning", "model evaluation", "experimentation", "nlp"],
    rag: ["embeddings", "semantic search", "recommendation", "search"],
    embeddings: ["recommendation", "ranking", "machine learning", "nlp"],
    "semantic search": ["search", "recommendation", "ranking", "nlp"],
    "model evaluation": ["a/b testing", "experimentation", "statistical analysis"]
  };

  return analysis.missing
    .filter((term) => adjacentMap[term])
    .filter((term) => adjacentMap[term].some((adjacent) => normalize(resumeText).includes(adjacent)))
    .slice(0, 4)
    .map((term, index) => ({
      id: `question-${index + 1}`,
      type: "ask_user",
      section: "Missing Evidence",
      originalText: "",
      suggestedText: "",
      promptText: `Do you have hands-on experience with ${term}? If yes, describe the project/context, what you personally did, and evidence you can discuss in an interview.`,
      whyItHelps: "This may improve role fit, but it should not be added unless you can defend it in an interview.",
      evidence: adjacentMap[term].map((adjacent) => findEvidenceForTerm(resumeText, adjacent)).filter(Boolean)[0] || "Adjacent experience appears plausible, but direct evidence is missing.",
      riskLevel: "high",
      supportLevel: "user_confirmation_needed",
      status: "pending",
      mode: "appendUserConfirmed",
      missingTerm: term,
      requiresUserWording: true
    }));
}

function generateChanges(resumeText, analysis) {
  if (!analysis.jobTerms.length) {
    return uniqueById([
      ...suggestBulletRewrites(resumeText, analysis)
    ].filter(Boolean));
  }

  return uniqueById([
    suggestSummaryChange(resumeText, analysis),
    ...suggestBulletRewrites(resumeText, analysis),
    ...suggestSkillAdditions(resumeText, analysis),
    ...suggestQuestions(resumeText, analysis)
  ].filter(Boolean));
}

function findSummaryLineForFallback(resumeText) {
  const lines = splitLines(resumeText);
  const summaryIndex = lines.findIndex((line) => /^(statement|summary|professional summary|profile)$/i.test(line));
  if (summaryIndex === -1) return "";
  return lines.slice(summaryIndex + 1).find((line) =>
    line.length > 50
    && !isSectionHeaderLine(line)
    && !/^[-*•]/.test(line)
  ) || "";
}

function buildGuaranteedFallbackChange(resumeText, jobText) {
  const summaryLine = findSummaryLineForFallback(resumeText);
  if (summaryLine && /\b(seeking|challenging|growth|continuous learning|advancing skills)\b/i.test(summaryLine)) {
    const suggestedText = summaryLine
      .replace(/\bSeeking a challenging\b/i, "Targeting an")
      .replace(/,\s*while advancing skills through continuous learning and growth\.?/i, ".")
      .replace(/\s+/g, " ")
      .trim();

    if (suggestedText && suggestedText !== summaryLine) {
      return {
        id: "fallback-summary-tighten",
        type: "rewrite",
        section: "Statement",
        originalText: summaryLine,
        suggestedText,
        whyItHelps: "Keeps the summary focused on evidence and role fit instead of candidate-centered wording.",
        evidence: summaryLine,
        riskLevel: "low",
        supportLevel: "resume_supported",
        status: "pending",
        mode: "replace"
      };
    }
  }

  return null;
}

function buildSpecificMissingExperienceFallbacks(resumeText, analysis, limit = 6, jobText = "") {
  const localRequirementData = jobText
    ? { job_analysis: { required_skills: [] } }
    : analysis;
  return buildMissingExperienceCardsFromRequirements(
    localRequirementData,
    resumeText,
    jobText,
    0
  ).slice(0, limit);
}

function uniqueById(items) {
  const seen = new Set();
  return items.filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

function renderAnalysis(analysis) {
  matchScore.textContent = analysis.jobTerms.length ? `${analysis.score}% match` : "--";

  if (!analysis.jobTerms.length) {
    analysisOutput.innerHTML = `
      <section class="analysis-block">
        <h3>Resume Review</h3>
        <ul>
          <li>No target job description provided.</li>
          <li>Checking resume structure, required fields, dates, and general wording.</li>
        </ul>
      </section>
    `;
    return;
  }

  const blocks = [
    ["Target", [`${analysis.title}`, `Seniority: ${analysis.seniority}`]],
    ["Covered Signals", analysis.covered.length ? analysis.covered : ["No covered signals found yet."]],
    ["Missing Or Unsupported", analysis.missing.length ? analysis.missing : ["No obvious missing terms found."]],
    ["Likely Responsibilities", analysis.responsibilities.length ? analysis.responsibilities : ["No responsibilities extracted."]]
  ];

  analysisOutput.innerHTML = blocks
    .map(([title, items]) => {
      const list = items.map((item) => `<li>${escapeHtml(item)}</li>`).join("");
      return `<section class="analysis-block"><h3>${escapeHtml(title)}</h3><ul>${list}</ul></section>`;
    })
    .join("");
}

