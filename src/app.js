const resumeInput = document.querySelector("#resumeInput");
const resumeFileInput = document.querySelector("#resumeFileInput");
const resumeUploadStatus = document.querySelector("#resumeUploadStatus");
const jobInput = document.querySelector("#jobInput");
const finalResume = document.querySelector("#finalResume");
const pdfPreviewPanel = document.querySelector("#pdfPreviewPanel");
const pdfPreview = document.querySelector("#pdfPreview");
const missingExperiencePanel = document.querySelector("#missingExperiencePanel");
const activeCommentPanel = document.querySelector("#activeCommentPanel");
const analyzeBtn = document.querySelector("#analyzeBtn");
const analyzeAiBtn = document.querySelector("#analyzeAiBtn");
const cleanupPassBtn = document.querySelector("#cleanupPassBtn");
const aiStatus = document.querySelector("#aiStatus");
const loadSampleBtn = document.querySelector("#loadSampleBtn");
const newResumeBtn = document.querySelector("#newResumeBtn");
const clearJobBtn = document.querySelector("#clearJobBtn");
const exportStyleSelect = document.querySelector("#exportStyleSelect");
const exportPdfBtn = document.querySelector("#exportPdfBtn");
const copyFinalBtn = document.querySelector("#copyFinalBtn");
const analysisOutput = document.querySelector("#analysisOutput");
const changeCards = document.querySelector("#changeCards");
const resumeCount = document.querySelector("#resumeCount");
const jobCount = document.querySelector("#jobCount");
const changeCount = document.querySelector("#changeCount");
const matchScore = document.querySelector("#matchScore");
const suggestionsPassBtn = document.querySelector("#suggestionsPassBtn");
const missingExperiencePassBtn = document.querySelector("#missingExperiencePassBtn");

const skillLexicon = [
  "python",
  "sql",
  "machine learning",
  "ml",
  "data science",
  "a/b testing",
  "experimentation",
  "recommendation",
  "ranking",
  "personalization",
  "production",
  "deployment",
  "model evaluation",
  "evaluation",
  "llm",
  "rag",
  "embeddings",
  "semantic search",
  "prompt",
  "privacy",
  "statistics",
  "statistical analysis",
  "dashboard",
  "cross-functional",
  "product",
  "engineering",
  "stakeholder",
  "latency",
  "classification",
  "nlp",
  "deep learning",
  "tensorflow",
  "pytorch"
];

const specificTopicLexicon = [
  ...skillLexicon,
  "python",
  "c++",
  "java",
  "perl",
  "c#",
  "javascript",
  "typescript",
  "scala",
  "r",
  "langchain",
  "spark",
  "generative ai",
  "genai",
  "llm evaluation",
  "llm-as-judge",
  "evaluation judges",
  "human evaluation",
  "offline metrics",
  "online metrics",
  "prompt engineering",
  "openai",
  "hugging face",
  "transformers"
];

const genericQuestionTopics = new Set([
  "skill",
  "skills",
  "experience",
  "projects",
  "project",
  "responsibilities",
  "missing evidence",
  "resume",
  "engineering",
  "qualification",
  "qualifications",
  "growth",
  "continuous learning"
]);

const ignoredExtractedTopics = new Set([
  "skill",
  "skills",
  "experience",
  "experiences",
  "education",
  "publication",
  "publications",
  "patent",
  "patents",
  "statement",
  "summary",
  "profile",
  "project",
  "projects",
  "achievement",
  "achievements",
  "strength",
  "strengths",
  "language",
  "languages",
  "header",
  "ai",
  "resume",
  "cv"
]);

const sampleResume = `JORDAN LEVI
jordan@example.com | linkedin.com/in/jordan-levi | Tel Aviv

PROFESSIONAL SUMMARY
Data scientist with experience in machine learning, analytics, and cross-functional product work.

EXPERIENCE
Senior Data Scientist, ShopStream
2020 - 2024
- Worked on recommendation models for e-commerce personalization.
- Used experiments and data analysis to improve product decisions.
- Collaborated with product managers and engineers on model deployment.
- Built dashboards for business stakeholders.

Data Analyst, MarketPulse
2017 - 2020
- Analyzed customer behavior and campaign performance.
- Created reports and presented insights to marketing teams.

EDUCATION
M.Sc. Computer Science, Example University
2015 - 2017

B.Sc. Statistics, Example University
2011 - 2015

SKILLS
Machine learning, SQL, Python, A/B testing, dashboards, statistical analysis`;

const sampleJobDescription = `Applied Machine Learning Engineer

We are looking for an Applied Machine Learning Engineer to build production personalization and ranking systems. The role includes developing recommendation models, evaluating model quality, running experiments, and partnering with product and engineering teams to deploy improvements.

Required qualifications:
- Experience with machine learning models in production
- Python and SQL
- Recommendation, ranking, or personalization systems
- A/B testing or experimentation
- Strong communication with product and engineering teams

Preferred qualifications:
- Experience with LLMs, embeddings, or semantic search
- Experience designing model evaluation frameworks
- Ability to translate business goals into measurable ML outcomes`;

const weakPhraseRewrites = [
  {
    pattern: /worked on/i,
    replacement: "Contributed to",
    reason: "Replaces a vague phrase with a clearer ownership signal."
  },
  {
    pattern: /used experiments and data analysis/i,
    replacement: "Designed and analyzed experiments",
    reason: "Makes experimentation sound more active and role-relevant."
  },
  {
    pattern: /collaborated with/i,
    replacement: "Partnered with",
    reason: "Keeps the meaning but improves cross-functional leadership signal."
  },
  {
    pattern: /responsible for/i,
    replacement: "Owned",
    reason: "Strengthens the action verb without changing the underlying claim."
  },
  {
    pattern: /utilized/i,
    replacement: "Used",
    reason: "Simplifies inflated wording."
  },
  {
    pattern: /created reports/i,
    replacement: "Built reporting workflows",
    reason: "Makes the work sound more concrete and operational."
  }
];

const commonSpellingCorrections = [
  ["e ective", "effective"],
  ["ective", "effective"],
  ["signi fi cant", "significant"],
  ["signi ficant", "significant"],
  ["fi ltering", "filtering"],
  ["fi lter", "filter"],
  ["experinece", "experience"],
  ["experince", "experience"],
  ["languagh", "language"],
  ["languaghes", "languages"],
  ["descrition", "description"],
  ["requiement", "requirement"],
  ["requierement", "requirement"],
  ["requierements", "requirements"],
  ["mendatory", "mandatory"],
  ["authers", "authors"],
  ["adress", "address"],
  ["programing", "programming"],
  ["managment", "management"],
  ["strang", "strong"],
  ["substatial", "substantial"],
  ["reccomendation", "recommendation"],
  ["reccomendations", "recommendations"],
  ["acheivement", "achievement"],
  ["acheivements", "achievements"],
  ["teh", "the"],
  ["recieve", "receive"],
  ["seperate", "separate"]
];

const spellingVocabulary = [
  "strong",
  "experience",
  "experienced",
  "management",
  "language",
  "languages",
  "description",
  "requirement",
  "requirements",
  "mandatory",
  "authors",
  "address",
  "programming",
  "recommendation",
  "recommendations",
  "achievement",
  "achievements",
  "receive",
  "separate",
  "effective",
  "significant",
  "filtering",
  "research",
  "researcher",
  "engineer",
  "engineering",
  "senior",
  "project",
  "projects",
  "machine",
  "learning",
  "statistical",
  "analysis",
  "predictive",
  "modeling",
  "decision",
  "decisions",
  "business",
  "systems",
  "value",
  "values",
  "impact",
  "impacts",
  "product",
  "products",
  "performance",
  "team",
  "teams",
  "customer",
  "customers",
  "delivery",
  "deliver",
  "delivers",
  "delivered",
  "delivering",
  "drive",
  "drives",
  "driven",
  "focused",
  "focus",
  "leveraging",
  "leverage",
  "substantial",
  "challenging",
  "applied",
  "strategy",
  "strategic",
  "technical",
  "technology",
  "collaboration",
  "communication",
  "effective",
  "efficient",
  "quality",
  "professional",
  "summary",
  "statement",
  "education",
  "publication",
  "publications",
  "patent",
  "patents"
];

const PASS_CLEANUP = "cleanup";
const PASS_SUGGESTIONS = "suggestions";
const PASS_MISSING_EXPERIENCE = "missing_experience";
const NEW_EXPERIENCE_KEY = "__new_experience__";
const REVIEW_PASSES = [
  { id: PASS_CLEANUP, label: "Resume Check", emptyDone: "No open resume-check comments. Mandatory fields look handled or were dismissed.", emptyInitial: "Run Check Resume to find missing mandatory fields and structure issues.", button: () => cleanupPassBtn },
  { id: PASS_SUGGESTIONS, label: "Suggestions", emptyDone: "No open suggestions in this pass.", emptyInitial: "Run Get Suggestions with AI to create optional and job-specific suggestions.", button: () => suggestionsPassBtn },
  { id: PASS_MISSING_EXPERIENCE, label: "Missing Experience", emptyDone: "No open missing-experience questions in this pass.", emptyInitial: "Run Get Suggestions with AI to find job-required skills or experience to confirm.", button: () => missingExperiencePassBtn }
];

let currentChanges = [];
let activePass = PASS_CLEANUP;
let acceptanceSequence = 0;
const completedPasses = new Set();
const loadingPasses = new Set();
const dismissedChangeKeys = new Set();
let pdfJsModule = null;
let pageBudgetOverride = false;
let latestAiAnalysis = null;
let latestAiJobDescription = "";
let latestAiBaselineResume = "";

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

const roleRequirements = window.RoleFitRoleRequirements.create({
  cleanConfirmedText,
  extractMissingExperienceTopics,
  genericQuestionTopics,
  hasSection,
  normalize,
  resumeCoversSkillTerm,
  splitLines,
  stringifyAnalysisItem,
  textContainsTopicTerm
});
const missingExperienceFlow = window.RoleFitMissingExperience.create({ normalize });
const placementFlow = window.RoleFitPlacementFlow.create({
  resolvePlacement: getConfirmedPlacement,
  unique
});

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

function markPassesLoading(passes) {
  for (const pass of passes) {
    loadingPasses.add(pass);
    completedPasses.delete(pass);
  }
  updatePassUi();
  renderNumberedCommentPreview();
  if (passes.includes(activePass)) renderChanges();
}

function clearPassesLoading(passes) {
  for (const pass of passes) {
    loadingPasses.delete(pass);
  }
  updatePassUi();
  renderNumberedCommentPreview();
}

function setAiReviewPassChanges(cards) {
  const normalized = normalizeChangePasses(cards);
  const suggestions = normalized.filter((change) => inferChangePass(change) === PASS_SUGGESTIONS);
  const missingExperience = normalized.filter((change) => inferChangePass(change) === PASS_MISSING_EXPERIENCE);
  const shouldRender = activePass === PASS_SUGGESTIONS || activePass === PASS_MISSING_EXPERIENCE;

  clearPassesLoading([PASS_SUGGESTIONS, PASS_MISSING_EXPERIENCE]);
  replacePassChanges(PASS_SUGGESTIONS, suggestions, { activate: activePass === PASS_SUGGESTIONS });
  replacePassChanges(PASS_MISSING_EXPERIENCE, missingExperience, { activate: activePass === PASS_MISSING_EXPERIENCE });
  completedPasses.add(PASS_SUGGESTIONS);
  completedPasses.add(PASS_MISSING_EXPERIENCE);
  updatePassUi();
  renderNumberedCommentPreview();
  if (shouldRender) renderChanges();
}

function getPassLabel(pass) {
  return REVIEW_PASSES.find((item) => item.id === pass)?.label || "Suggestions";
}

function isMissingExperienceChange(change) {
  if (!change) return false;
  if (change.requiresHeaderWording || change.requiresRequiredFieldWording || change.requiresDateWording) return false;
  if (change.type === "ask_user" || change.type === "add_keyword") return true;
  return Boolean(change.requiresUserWording);
}

function inferChangePass(change) {
  if (change.pass) return change.pass;
  if (isMissingExperienceChange(change)) return PASS_MISSING_EXPERIENCE;
  return getChangePriorityClass(change) === "mandatory" ? PASS_CLEANUP : PASS_SUGGESTIONS;
}

function getDismissalKey(change) {
  return getChangePriorityClass(change) === "mandatory"
    ? questionDedupeKey(change)
    : (change.id || questionDedupeKey(change));
}

function normalizeChangePasses(changes) {
  return changes
    .filter((change) => !dismissedChangeKeys.has(getDismissalKey(change)))
    .map((change) => ({
      ...change,
      pass: inferChangePass(change)
    }));
}

function getVisibleChanges() {
  return currentChanges.filter((change) =>
    inferChangePass(change) === activePass
    && !dismissedChangeKeys.has(getDismissalKey(change))
  );
}

function getOpenDisplayChanges() {
  const openChanges = getVisibleChanges().filter(isOpenChange);
  currentChanges.forEach((change) => {
    change.commentNumber = "";
  });
  const displayChanges = sortChangesByResumeOrder(openChanges, getWorkingResumeText());
  displayChanges.forEach((change, index) => {
    change.commentNumber = index + 1;
  });
  return displayChanges;
}

function setActivePass(pass) {
  activePass = pass;
  if (activeCommentPanel) activeCommentPanel.hidden = true;
  updatePassUi();
  renderChanges();
}

function setPassChanges(pass, changes, { activate = true } = {}) {
  const nextChanges = normalizeChangePasses(changes).map((change) => ({ ...change, pass }));
  currentChanges = [
    ...currentChanges.filter((change) =>
      inferChangePass(change) !== pass
      || change.status === "accepted"
      || change.status === "edited"
      || change.status === "partial"
    ),
    ...nextChanges
  ];
  if (activate) activePass = pass;
  completedPasses.add(pass);
  updatePassUi();
  renderChanges();
}

function replacePassChanges(pass, changes, { activate = true } = {}) {
  const nextChanges = normalizeChangePasses(changes).map((change) => ({ ...change, pass }));
  currentChanges = [
    ...currentChanges.filter((change) =>
      inferChangePass(change) !== pass
      || change.status === "accepted"
      || change.status === "edited"
      || change.status === "partial"
    ),
    ...nextChanges
  ];
  completedPasses.add(pass);
  if (activate) activePass = pass;
  updatePassUi();
  if (activate) renderChanges();
}

function collectResumeCheckChanges(resumeText) {
  return prepareActionableChanges(resumeText, [
    ...collectMissingHeaderQuestions(resumeText),
    ...collectMissingRequiredFieldQuestions(resumeText),
    ...collectMissingDateQuestions(resumeText),
    ...suggestSpellingFixes(resumeText)
  ]);
}

function refreshResumeCheckPass(resumeText, options = {}) {
  const activate = options.activate !== false;
  replacePassChanges(PASS_CLEANUP, collectResumeCheckChanges(resumeText), { ...options, activate });
  if (!activate && activePass === PASS_CLEANUP) {
    renderChanges();
  }
}

function mergeCleanupCards(cards, resumeText) {
  const nextCards = normalizeChangePasses(prepareActionableChanges(resumeText, cards)).map((change) => ({
    ...change,
    pass: PASS_CLEANUP
  }));
  const existingKeys = new Set(currentChanges.map(getDismissalKey));
  const additions = nextCards.filter((change) => {
    const key = getDismissalKey(change);
    return !existingKeys.has(key) && !dismissedChangeKeys.has(key);
  });
  if (!additions.length) return;
  currentChanges = [...currentChanges, ...additions];
}

function updatePassUi() {
  REVIEW_PASSES.forEach((pass, index) => {
    const button = pass.button();
    if (!button) return;
    button.textContent = `${index + 1}. ${pass.label}${getPassTabSuffix(pass.id)}`;
    button.classList.toggle("active", activePass === pass.id);
    button.setAttribute("aria-selected", activePass === pass.id ? "true" : "false");
  });
}

function hasAnyChangesForPass(pass) {
  return currentChanges.some((change) =>
    inferChangePass(change) === pass
  );
}

function getPassTabSuffix(pass) {
  if (loadingPasses.has(pass)) return " - thinking";
  const count = countOpenChangesForPass(pass);
  if (count) return ` - ${count}`;
  if (!completedPasses.has(pass)) return "";
  if (pass !== PASS_CLEANUP && !hasAnyChangesForPass(pass)) return " - none";
  return " - done";
}

function renderChanges() {
  updatePassUi();
  const openChanges = getOpenDisplayChanges();
  changeCount.textContent = loadingPasses.has(activePass)
    ? `${getPassLabel(activePass)} is thinking`
    : `${openChanges.length} open in ${getPassLabel(activePass)}`;

  if (!openChanges.length) {
    const pass = REVIEW_PASSES.find((item) => item.id === activePass) || REVIEW_PASSES[0];
    const emptyText = getEmptyPassText(pass);
    changeCards.innerHTML = `<p class="empty-state">${emptyText}</p>`;
    renderNumberedCommentPreview();
    return;
  }

  const displayChanges = openChanges;
  changeCards.innerHTML = renderSuggestionGroups(displayChanges);
  renderNumberedCommentPreview();

  for (const change of displayChanges) {
    const card = changeCards.querySelector(`[data-change-id="${change.id}"]`);
    bindChangeCard(card, change);
  }
}

function getEmptyPassText(pass) {
  if (loadingPasses.has(pass.id)) return `${pass.label} is still thinking. You can continue reviewing other tabs while it runs.`;
  if (!completedPasses.has(pass.id)) return pass.emptyInitial;
  if (pass.id !== PASS_CLEANUP && !hasAnyChangesForPass(pass.id)) return `No actionable ${pass.label.toLowerCase()} were found.`;
  return pass.emptyDone;
}

function isOpenChange(change) {
  return change.status === "pending" || change.status === "needs_user_writing" || change.status === "partial";
}

function sortChangesByResumeOrder(changes, resumeText) {
  return [...changes].sort((a, b) => getChangeResumePosition(a, resumeText) - getChangeResumePosition(b, resumeText));
}

function getChangeResumePosition(change, resumeText) {
  if (canonicalSectionTitle(change.section) === "header" || change.requiresHeaderWording) {
    return -1;
  }

  const lines = String(resumeText || "").split("\n");
  const range = findSectionRange(lines, [change.section]);
  const candidates = getCommentMarkerCandidates(change);

  if (range) {
    for (let index = range.start; index < range.end; index += 1) {
      const line = lines[index] || "";
      if (candidates.some((candidate) => normalize(line).includes(normalize(candidate)))) {
        return index;
      }
    }
    return range.start + 0.25;
  }

  const fullText = String(resumeText || "");
  for (const candidate of candidates) {
    const index = fullText.indexOf(candidate);
    if (index !== -1) return lines.slice(0, fullText.slice(0, index).split("\n").length).length;
  }

  return 100000 + currentChanges.indexOf(change);
}

function bindChangeCard(card, change) {
  if (!card) return;
  const editBox = card.querySelector(".edit-box");
  const placementCheckboxes = Array.from(card.querySelectorAll(".placement-checkbox"));

  if (placementCheckboxes.length) {
    placementCheckboxes.forEach((checkbox) => {
      checkbox.addEventListener("change", () => {
        syncCardInputs(card, change);
        const selected = placementCheckboxes.filter((input) => input.checked).map((input) => input.value);
        const normalized = selected.includes("omit") ? ["omit"] : selected.filter((value) => value !== "omit");
        change.placements = normalized;
        change.placement = normalized[0] || "undecided";
        if (Array.isArray(change.acceptedPlacements)) {
          change.acceptedPlacements = change.acceptedPlacements.filter((placement) => normalized.includes(placement));
        }
        change.previewedKey = "";
        change.previewedPlacementKeys = {};
        const keepActivePanel = activeCommentPanel && !activeCommentPanel.hidden;
        renderChanges();
        if (keepActivePanel) renderActiveCommentPanel(change);
      });
    });
  }

  const placementSelect = card.querySelector(".placement-select:not(.experience-entry-select):not(.experience-action-select):not(.experience-bullet-select):not(.education-entry-select):not(.education-action-select):not(.education-detail-select):not(.project-entry-select):not(.project-action-select):not(.project-bullet-select):not(.other-action-select):not(.other-item-select)");

  if (placementSelect) {
    placementSelect.addEventListener("change", () => {
      syncCardInputs(card, change);
      change.placement = placementSelect.value;
      change.placements = placementSelect.value && placementSelect.value !== "undecided" ? [placementSelect.value] : [];
      change.previewedKey = "";
      change.previewedPlacementKeys = {};
      const keepActivePanel = activeCommentPanel && !activeCommentPanel.hidden;
      renderChanges();
      if (keepActivePanel) renderActiveCommentPanel(change);
    });
  }

  const experienceEntrySelect = card.querySelector(".experience-entry-select");
  if (experienceEntrySelect) {
    experienceEntrySelect.addEventListener("change", () => {
      syncCardInputs(card, change);
      change.experienceEntryKey = experienceEntrySelect.value;
      change.experienceBulletIndex = "";
      change.experienceTargetTitle = "";
      change.experienceTargetCompany = "";
      change.experienceTargetYears = "";
      change.experienceOriginalBullet = "";
      // A draft belongs to one specific job and action. Never carry it into a
      // newly selected job: the user needs a blank field for new evidence.
      change.experienceDraftText = "";
      change.experienceDraftContext = "";
      change.previewedKey = "";
      change.previewedPlacementKeys = {};
      const keepActivePanel = activeCommentPanel && !activeCommentPanel.hidden;
      renderChanges();
      if (keepActivePanel) renderActiveCommentPanel(change);
    });
  }

  const experienceActionSelect = card.querySelector(".experience-action-select");
  if (experienceActionSelect) {
    experienceActionSelect.addEventListener("change", () => {
      syncCardInputs(card, change);
      change.experienceAction = experienceActionSelect.value;
      change.experienceDraftText = "";
      change.experienceDraftContext = "";
      change.experienceOriginalBullet = "";
      change.previewedKey = "";
      change.previewedPlacementKeys = {};
      const keepActivePanel = activeCommentPanel && !activeCommentPanel.hidden;
      renderChanges();
      if (keepActivePanel) renderActiveCommentPanel(change);
    });
  }

  const experienceBulletSelect = card.querySelector(".experience-bullet-select");
  if (experienceBulletSelect) {
    experienceBulletSelect.addEventListener("change", () => {
      syncCardInputs(card, change);
      change.experienceBulletIndex = experienceBulletSelect.value;
      change.experienceDraftText = "";
      change.experienceDraftContext = "";
      change.experienceOriginalBullet = "";
      change.previewedKey = "";
      change.previewedPlacementKeys = {};
      const keepActivePanel = activeCommentPanel && !activeCommentPanel.hidden;
      renderChanges();
      if (keepActivePanel) renderActiveCommentPanel(change);
    });
  }

  const educationEntrySelect = card.querySelector(".education-entry-select");
  if (educationEntrySelect) {
    educationEntrySelect.addEventListener("change", () => {
      syncCardInputs(card, change);
      change.educationEntryKey = educationEntrySelect.value;
      change.educationDetailIndex = "";
      change.educationDetails = "";
      change.educationDraftContext = "";
      change.educationTargetDegree = "";
      change.educationTargetInstitution = "";
      change.educationTargetYears = "";
      change.educationOriginalDetail = "";
      captureEducationSelectionSnapshot(change);
      change.previewedKey = "";
      change.previewedPlacementKeys = {};
      const keepActivePanel = activeCommentPanel && !activeCommentPanel.hidden;
      renderChanges();
      if (keepActivePanel) renderActiveCommentPanel(change);
    });
  }

  const educationActionSelect = card.querySelector(".education-action-select");
  if (educationActionSelect) {
    educationActionSelect.addEventListener("change", () => {
      syncCardInputs(card, change);
      change.educationAction = educationActionSelect.value;
      change.educationDetails = "";
      change.educationDraftContext = "";
      change.educationOriginalDetail = "";
      change.previewedKey = "";
      change.previewedPlacementKeys = {};
      const keepActivePanel = activeCommentPanel && !activeCommentPanel.hidden;
      renderChanges();
      if (keepActivePanel) renderActiveCommentPanel(change);
    });
  }

  const educationDetailSelect = card.querySelector(".education-detail-select");
  if (educationDetailSelect) {
    educationDetailSelect.addEventListener("change", () => {
      syncCardInputs(card, change);
      change.educationDetailIndex = educationDetailSelect.value;
      change.educationDetails = "";
      change.educationDraftContext = "";
      change.educationOriginalDetail = "";
      captureEducationSelectionSnapshot(change);
      change.previewedKey = "";
      change.previewedPlacementKeys = {};
      const keepActivePanel = activeCommentPanel && !activeCommentPanel.hidden;
      renderChanges();
      if (keepActivePanel) renderActiveCommentPanel(change);
    });
  }

  const otherActionSelect = card.querySelector(".other-action-select");
  if (otherActionSelect) {
    otherActionSelect.addEventListener("change", () => {
      syncCardInputs(card, change);
      change.otherAction = otherActionSelect.value;
      change.previewedKey = "";
      change.previewedPlacementKeys = {};
      const keepActivePanel = activeCommentPanel && !activeCommentPanel.hidden;
      renderChanges();
      if (keepActivePanel) renderActiveCommentPanel(change);
    });
  }

  const projectEntrySelect = card.querySelector(".project-entry-select");
  if (projectEntrySelect) {
    projectEntrySelect.addEventListener("change", () => {
      syncCardInputs(card, change);
      change.projectEntryKey = projectEntrySelect.value;
      change.projectBulletIndex = "";
      change.projectDetails = "";
      change.projectDraftContext = "";
      change.projectTargetName = "";
      change.projectTargetYear = "";
      change.projectOriginalBullet = "";
      captureProjectSelectionSnapshot(change);
      change.previewedKey = "";
      change.previewedPlacementKeys = {};
      const keepActivePanel = activeCommentPanel && !activeCommentPanel.hidden;
      renderChanges();
      if (keepActivePanel) renderActiveCommentPanel(change);
    });
  }

  const projectActionSelect = card.querySelector(".project-action-select");
  if (projectActionSelect) {
    projectActionSelect.addEventListener("change", () => {
      syncCardInputs(card, change);
      change.projectAction = projectActionSelect.value;
      change.projectDetails = "";
      change.projectDraftContext = "";
      change.projectOriginalBullet = "";
      change.previewedKey = "";
      change.previewedPlacementKeys = {};
      const keepActivePanel = activeCommentPanel && !activeCommentPanel.hidden;
      renderChanges();
      if (keepActivePanel) renderActiveCommentPanel(change);
    });
  }

  const projectBulletSelect = card.querySelector(".project-bullet-select");
  if (projectBulletSelect) {
    projectBulletSelect.addEventListener("change", () => {
      syncCardInputs(card, change);
      change.projectBulletIndex = projectBulletSelect.value;
      change.projectDetails = "";
      change.projectDraftContext = "";
      change.projectOriginalBullet = "";
      captureProjectSelectionSnapshot(change);
      change.previewedKey = "";
      change.previewedPlacementKeys = {};
      const keepActivePanel = activeCommentPanel && !activeCommentPanel.hidden;
      renderChanges();
      if (keepActivePanel) renderActiveCommentPanel(change);
    });
  }

  const otherSectionInput = card.querySelector("[data-draft-field='otherSectionName']");
  if (otherSectionInput) {
    otherSectionInput.addEventListener("change", () => {
      syncCardInputs(card, change);
      change.otherAction = "";
      change.otherItemIndex = "";
      change.previewedKey = "";
      change.previewedPlacementKeys = {};
      const keepActivePanel = activeCommentPanel && !activeCommentPanel.hidden;
      renderChanges();
      if (keepActivePanel) renderActiveCommentPanel(change);
    });
  }

  const otherItemSelect = card.querySelector(".other-item-select");
  if (otherItemSelect) {
    otherItemSelect.addEventListener("change", () => {
      syncCardInputs(card, change);
      change.otherItemIndex = otherItemSelect.value;
      change.previewedKey = "";
      change.previewedPlacementKeys = {};
      const keepActivePanel = activeCommentPanel && !activeCommentPanel.hidden;
      renderChanges();
      if (keepActivePanel) renderActiveCommentPanel(change);
    });
  }

  const acceptButton = card.querySelector("[data-action='accept']");
  if (acceptButton) {
    acceptButton.addEventListener("click", () => {
      syncCardInputs(card, change);
      acceptChangeFromCard(change, editBox);
    });
  }

  const acceptPlacementButtons = Array.from(card.querySelectorAll("[data-action='accept-placement']"));
  if (acceptPlacementButtons.length) {
    acceptPlacementButtons.forEach((button) => button.addEventListener("click", () => {
      syncCardInputs(card, change);
      acceptPlacementFromCard(change, button.dataset.acceptPlacement || "");
    }));
  }

  const rejectButton = card.querySelector("[data-action='reject']");
  if (rejectButton) {
    rejectButton.addEventListener("click", () => rejectChangeFromCard(change));
  }

  const rephraseButton = card.querySelector("[data-action='rephrase']");
  if (rephraseButton) {
    card.querySelectorAll("[data-action='rephrase']").forEach((button) => {
      button.addEventListener("click", () => {
        syncCardInputs(card, change);
        const scopedEditBox = button.closest(".placement-detail-card")?.querySelector(".edit-box") || editBox;
        rephraseConfirmedExperience(change, scopedEditBox, button);
      });
    });
  }

  const previewButtons = Array.from(card.querySelectorAll("[data-action='preview']"));
  if (previewButtons.length) {
    previewButtons.forEach((previewButton) => previewButton.addEventListener("click", () => {
      syncCardInputs(card, change);
      const placementToPreview = previewButton.dataset.previewPlacement || "";
      previewChangeOnResume(change, placementToPreview ? null : editBox, placementToPreview);
    }));
  }

  const commentNumber = card.querySelector(".comment-number");
  if (commentNumber) {
    commentNumber.addEventListener("click", () => {
      renderActiveCommentPanel(change);
      pdfPreviewPanel.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }
}

function syncCardInputs(card, change) {
  if (!card || !change) return;

  const genericEditBox = card.querySelector(".edit-box:not([data-draft-field])");
  if (genericEditBox) {
    change.userDraftText = genericEditBox.value || "";
    change.suggestedText = change.type === "spelling_check"
      ? buildSpellingSuggestedLine(change, genericEditBox.value) || change.suggestedText
      : genericEditBox.value || change.suggestedText;
  }

  card.querySelectorAll("[data-draft-field]").forEach((field) => {
    const key = field.getAttribute("data-draft-field");
    if (!key) return;
    change[key] = field.value || "";
    if (key === "experienceDraftText") {
      change.experienceDraftContext = getExperienceDraftContext(change);
    }
    if (key === "educationDetails") {
      change.educationDraftContext = getEducationDraftContext(change);
    }
    if (key === "projectDetails") {
      change.projectDraftContext = getProjectDraftContext(change);
    }
  });
}

function alignActiveCommentPanelToResumePoint(change) {
  if (!activeCommentPanel?.style || !pdfPreview?.querySelectorAll) return;
  activeCommentPanel.style.marginTop = "";
  delete activeCommentPanel.dataset.anchorAligned;

  if (Number.isFinite(window.innerWidth) && window.innerWidth <= 1320) return;

  const markers = Array.from(pdfPreview.querySelectorAll(".resume-comment-marker"));
  const target = markers.find((marker) => marker.dataset.commentId === change?.id)
    || pdfPreview.querySelector(".resume-preview-highlight")
    || pdfPreview.querySelector(".resume-preview-section-highlight");
  if (!target?.getBoundingClientRect || !pdfPreview.getBoundingClientRect) return;

  const previewRect = pdfPreview.getBoundingClientRect();
  const targetRect = target.getBoundingClientRect();
  const offset = Math.max(0, targetRect.top - previewRect.top - 8);
  activeCommentPanel.style.marginTop = `${Math.round(offset)}px`;
  activeCommentPanel.dataset.anchorAligned = "true";
}

function renderActiveCommentPanel(change) {
  if (!activeCommentPanel || !change) return;
  if (missingExperiencePanel) missingExperiencePanel.hidden = true;
  activeCommentPanel.hidden = false;
  activeCommentPanel.className = `active-comment-panel ${getSuggestionKind(change)} ${getChangePriorityClass(change)}`;
  activeCommentPanel.innerHTML = `
    <div class="active-comment-heading">
      <h3>Comment ${escapeHtml(change.commentNumber || "")}</h3>
      <button class="secondary-button icon-button" type="button" data-action="close-comment" aria-label="Close comment">x</button>
    </div>
    ${renderChangeCard(change)}
  `;

  const card = activeCommentPanel.querySelector(`[data-change-id="${change.id}"]`);
  bindChangeCard(card, change);
  alignActiveCommentPanelToResumePoint(change);
  activeCommentPanel.querySelector("[data-action='close-comment']")?.addEventListener("click", () => {
    activeCommentPanel.hidden = true;
    if (activeCommentPanel.style) activeCommentPanel.style.marginTop = "";
    delete activeCommentPanel.dataset.anchorAligned;
    renderNumberedCommentPreview();
  });
}

function acceptChangeFromCard(change, editBox) {
  clearChangeValidationError(change);
  if (change.requiresUserWording) change.userDraftText = editBox?.value || "";
  change.suggestedText = editBox
    ? buildSpellingSuggestedLine(change, editBox.value) || change.suggestedText
    : change.suggestedText;
  if (change.requiresUserWording && !canSkipUserText(change) && !hasMeaningfulUserConfirmedText(change)) {
    change.status = "needs_user_writing";
    renderChanges();
    return;
  }
  if (isPlacementConfirmation(change)) {
    if (!getSelectedPlacements(change).length && change.suggestedText) {
      change.placement = inferConfirmedPlacement(change, change.suggestedText);
      change.placements = [change.placement];
    }
    const validation = validateConfirmedPlacement(change, getWorkingResumeText());
    if (validation.error) {
      change.status = "needs_user_writing";
      showChangeValidationError(change, validation.error);
      return;
    }
  }
  if (!isPlacementConfirmation(change) && isConcreteChangeNoOpForResume(getWorkingResumeText(), change)) {
    showChangeValidationError(change, "This change could not be matched to the current resume. It was not accepted.");
    return;
  }
  dismissedChangeKeys.add(getDismissalKey(change));
  markChangeAcceptedNow(change);
  change.status = "accepted";
  applyAcceptedChanges();
  refreshResumeCheckPass(finalResume.value || getWorkingResumeText(), { activate: activePass === PASS_CLEANUP });
  activeCommentPanel.hidden = true;
  applyChangesWithoutClosingPreview();
}

function acceptPlacementFromCard(change, placement) {
  if (!placement) return;
  clearChangeValidationError(change);
  ensurePlacementConfirmationMode(change, placement);
  if (placement === "experience") {
    captureExperienceSelectionSnapshot(change, getPlacementTargetResume());
  } else if (placement === "projects") {
    captureProjectSelectionSnapshot(change, getPlacementTargetResume());
  } else if (placement === "education") {
    captureEducationSelectionSnapshot(change, getPlacementTargetResume());
  }
  const currentResume = getPlacementTargetResume();
  const transition = placementFlow.acceptPlacement({
    change,
    placement,
    currentResume,
    validate: (singlePlacementChange, resumeText) => validateConfirmedPlacement(singlePlacementChange, resumeText),
    apply: (singlePlacementChange) => applySingleChange(currentResume, singlePlacementChange),
    normalize: normalizeFinalResumeText
  });

  if (!transition.ok) {
    change.status = "needs_user_writing";
    const error = transition.error.includes("selected resume target")
      ? `${getPlacementLabel(placement)} was not added. It may already be present, or the selected resume target is no longer available. Review the fields and try again.`
      : transition.error;
    showChangeValidationError(change, error, placement);
    return;
  }

  markChangeAcceptedNow(change);
  change.acceptedPlacements = transition.acceptedPlacements;
  change.status = transition.status;

  if (transition.complete) {
    dismissedChangeKeys.add(getDismissalKey(change));
    activeCommentPanel.hidden = true;
  }

  applyAcceptedChanges();
  refreshResumeCheckPass(finalResume.value || getWorkingResumeText(), { activate: activePass === PASS_CLEANUP });
  applyChangesWithoutClosingPreview();

  if (transition.complete) {
    setAiStatus(`Added ${getPlacementLabel(placement)} change.`, "success");
  } else {
    renderActiveCommentPanel(change);
    setAiStatus(`Added ${getPlacementLabel(placement)}. Continue with the other selected section(s), or reject the remaining request.`, "success");
  }
}

function rejectChangeFromCard(change) {
  dismissedChangeKeys.add(getDismissalKey(change));
  change.status = change.acceptedPlacements?.length ? "accepted" : "rejected";
  change.commentNumber = "";
  applyAcceptedChanges();
  activeCommentPanel.hidden = true;
  applyChangesWithoutClosingPreview();
}

function isPlacementConfirmation(change) {
  return change.requiresUserWording
    && !change.requiresHeaderWording
    && !change.requiresRequiredFieldWording
    && !change.requiresDateWording;
}

function ensurePlacementConfirmationMode(change, placement = "") {
  const placements = placement ? [placement] : getSelectedPlacements(change);
  if (!placements.some((item) => item && item !== "omit")) return;
  if (change.requiresHeaderWording || change.requiresRequiredFieldWording || change.requiresDateWording) return;

  // The user selected a resume destination and supplied the content. That choice
  // must take precedence if a provider returned an inconsistent suggestion mode.
  change.requiresUserWording = true;
  change.mode = "appendUserConfirmed";
}

function canSkipUserText(change) {
  return isPlacementConfirmation(change) && getConfirmedPlacement(change) === "omit";
}

function applyChangesWithoutClosingPreview() {
  advanceToNextOpenPassIfCurrentDone();
  renderChanges();
}

function advanceToNextOpenPassIfCurrentDone() {
  if (countOpenChangesForPass(activePass) > 0) return false;
  const activeIndex = REVIEW_PASSES.findIndex((pass) => pass.id === activePass);
  if (activeIndex === -1) return false;

  for (let index = activeIndex + 1; index < REVIEW_PASSES.length; index += 1) {
    const pass = REVIEW_PASSES[index];
    if (loadingPasses.has(pass.id)) return false;
    if (countOpenChangesForPass(pass.id) > 0) {
      activePass = pass.id;
      if (activeCommentPanel) activeCommentPanel.hidden = true;
      updatePassUi();
      return true;
    }
  }

  return false;
}

function getSuggestionKind(change) {
  if (change.type === "spelling_check") return "improvement";

  if (
    change.requiresHeaderWording
    || change.requiresRequiredFieldWording
    || change.requiresDateWording
    || ["reorder_section", "remove_or_deemphasize"].includes(change.type)
    || ["reorderSection", "replaceSection", "removeOrReplace"].includes(change.mode)
  ) {
    return "improvement";
  }

  if (!hasTargetJobDescription()) return "improvement";
  return "job";
}

function getSuggestionKindLabel(kind) {
  if (kind === "job") return "Job Specific";
  return "Resume Improvement";
}

function renderSuggestionGroups(changes) {
  const groups = [
    ["job", changes.filter((change) => getSuggestionKind(change) === "job")],
    ["improvement", changes.filter((change) => getSuggestionKind(change) === "improvement")]
  ].filter(([, items]) => items.length);

  return groups.map(([kind, items]) => `
    <section class="suggestion-group ${kind}">
      <div class="suggestion-group-header">
        <h3>${escapeHtml(getSuggestionKindLabel(kind))}</h3>
        <span class="counter">${items.filter((item) => item.status === "pending").length} pending</span>
      </div>
      <div class="suggestion-group-list">
        ${items.map(renderChangeCard).join("")}
      </div>
    </section>
  `).join("");
}

function getChangePriorityClass(change) {
  return (change.type === "spelling_check" || change.requiresHeaderWording || change.requiresRequiredFieldWording || change.requiresDateWording)
    ? "mandatory"
    : "suggestion";
}

function getChangePointLabel(change) {
  if (change.requiresHeaderWording) return `Fill missing ${change.missingTerm}`;
  if (change.requiresRequiredFieldWording) return `Fill missing ${change.missingTerm}`;
  if (change.requiresDateWording) return `Add years for ${change.missingTerm || "entry"}`;
  if (change.requiresUserWording) return `Confirm ${change.missingTerm || "experience"}`;
  if (change.type === "spelling_check") return `Spelling Check in ${change.section}`;
  return `${humanize(change.type)} in ${change.section}`;
}

function getOriginalPointText(change, fallback = "Not currently in resume.") {
  if (change.originalText) return change.originalText;
  if (change.evidence && !/missing from header|no direct evidence/i.test(change.evidence)) return change.evidence;
  return fallback;
}

function getSuggestedPointText(change, fallback = "Awaiting your input.") {
  if (change.suggestedText) return change.suggestedText;
  if (change.promptText) return change.promptText;
  return fallback;
}

function renderPreviewButton() {
  return `<button class="secondary-button preview-button" type="button" data-action="preview">Preview on Resume</button>`;
}

function renderPlacementPreviewButtons(placements) {
  const previewable = placements.filter((placement) => !["omit", "other"].includes(placement));
  if (!previewable.length) return "";
  if (previewable.length === 1) {
    return `<button class="secondary-button preview-button" type="button" data-action="preview" data-preview-placement="${escapeHtml(previewable[0])}">Preview ${escapeHtml(getPlacementLabel(previewable[0]))}</button>`;
  }
  return previewable.map((placement) =>
    `<button class="secondary-button preview-button" type="button" data-action="preview" data-preview-placement="${escapeHtml(placement)}">Preview ${escapeHtml(getPlacementLabel(placement))}</button>`
  ).join("");
}

function renderCardActionNotice(change) {
  const notice = renderRemainingOpenCommentsNotice(change);
  return notice ? `<div class="card-action-notice">${notice}</div>` : "";
}

function renderCardValidationError(change, placement = "") {
  if (!change?.validationError) return "";
  const targetPlacement = change.validationErrorPlacement || "";
  if (isPlacementConfirmation(change)) {
    if (targetPlacement && targetPlacement !== placement) return "";
    if (!targetPlacement && placement) return "";
    if (targetPlacement && !placement) return "";
  }
  return `<div class="card-validation-error" role="alert">${escapeHtml(change.validationError)}</div>`;
}

function showChangeValidationError(change, message, placement = "") {
  if (!change) return;
  change.validationError = message || "";
  change.validationErrorPlacement = placement || "";
  // Field-level errors belong with the form the user is editing. Keeping this
  // out of the page header avoids losing the message while the card is offscreen.
  setAiStatus("", "neutral");
  const keepActivePanel = activeCommentPanel && !activeCommentPanel.hidden;
  renderChanges();
  if (keepActivePanel) renderActiveCommentPanel(change);
}

function clearChangeValidationError(change) {
  if (!change) return;
  change.validationError = "";
  change.validationErrorPlacement = "";
}

function renderCommentNumber(change) {
  return change.commentNumber ? `<button class="comment-number ${escapeHtml(getCommentColorClass(change))}" type="button" aria-label="Open comment ${escapeHtml(change.commentNumber)}">#${escapeHtml(change.commentNumber)}</button>` : "";
}

function renderChangeCard(change) {
  const kind = getSuggestionKind(change);
  if (change.requiresHeaderWording) {
    return renderHeaderConfirmationCard(change);
  }

  if (change.requiresRequiredFieldWording) {
    return renderRequiredFieldConfirmationCard(change);
  }

  if (change.requiresDateWording) {
    return renderDateConfirmationCard(change);
  }

  if (change.requiresUserWording) {
    return renderConfirmExperienceCard(change);
  }

  const title = change.type === "ask_user"
    ? `Confirm Experience: ${change.missingTerm || "Missing Skill"}`
    : change.type === "spelling_check"
      ? `Spelling Check: ${change.section}`
      : `${humanize(change.type)}: ${change.section}`;
  const statusLabel = renderStatusLabel(change);
  const riskLabel = renderRiskLabel(change);
  const originalEmptyText = "No existing text. This is an insertion or question.";
  const spellingDisplay = getSpellingDisplayPair(change);
  const beforeDisplayText = change.type === "spelling_check" ? spellingDisplay.before : (change.originalText || originalEmptyText);
  const afterDisplayText = change.type === "spelling_check" ? spellingDisplay.after : change.suggestedText;
  const pairedLargeClass = isLongText(beforeDisplayText || originalEmptyText) || isLongText(afterDisplayText)
    ? "large-text-window"
    : "";

  return `
    <article class="change-card ${escapeHtml(change.status)} ${escapeHtml(kind)} ${escapeHtml(getChangePriorityClass(change))}" data-change-id="${escapeHtml(change.id)}">
      <div class="card-header">
        <h3 class="card-title">${renderCommentNumber(change)}${escapeHtml(getChangePointLabel(change))}</h3>
        <div class="badge-row">
          <span class="badge kind-badge ${escapeHtml(kind)}">${escapeHtml(getSuggestionKindLabel(kind))}</span>
          ${riskLabel}
          <span class="badge">${escapeHtml(humanize(change.supportLevel))}</span>
          ${statusLabel}
        </div>
      </div>
      <p class="resume-comment-point">${escapeHtml(title)}</p>
      ${renderCardValidationError(change)}
      <div class="card-grid">
        <div>
          <span class="field-label">Before</span>
          <div class="text-box ${pairedLargeClass}">${escapeHtml(beforeDisplayText || originalEmptyText)}</div>
        </div>
        <div>
          <label class="field-label" for="${escapeHtml(change.id)}-edit">After</label>
          <textarea id="${escapeHtml(change.id)}-edit" class="edit-box ${pairedLargeClass}">${escapeHtml(afterDisplayText)}</textarea>
        </div>
      </div>
      <div class="card-meta">
        <div><strong>Why:</strong> ${escapeHtml(change.whyItHelps)}</div>
        <div><strong>Evidence:</strong> ${escapeHtml(change.evidence || "No direct evidence. User confirmation is required.")}</div>
      </div>
      ${renderCardActionNotice(change)}
      <div class="card-actions">
        ${renderPreviewButton()}
        <button class="accept-button" type="button" data-action="accept">Accept Change</button>
        <button class="reject-button" type="button" data-action="reject">Reject</button>
      </div>
    </article>
  `;
}

function renderRequiredFieldConfirmationCard(change) {
  const statusLabel = renderStatusLabel(change);
  const riskLabel = renderRiskLabel(change);
  const inputValue = change.userDraftText || change.suggestedText || "";
  const kind = getSuggestionKind(change);
  const inputClass = getConfirmationInputClass(change);

  return `
    <article class="change-card confirm-experience-card ${escapeHtml(change.status)} ${escapeHtml(kind)} ${escapeHtml(getChangePriorityClass(change))}" data-change-id="${escapeHtml(change.id)}">
      <div class="card-header">
        <h3 class="card-title">${renderCommentNumber(change)}${escapeHtml(getChangePointLabel(change))}</h3>
        <div class="badge-row">
          <span class="badge kind-badge ${escapeHtml(kind)}">${escapeHtml(getSuggestionKindLabel(kind))}</span>
          ${riskLabel}
          <span class="badge">${escapeHtml(humanize(change.supportLevel))}</span>
          ${statusLabel}
        </div>
      </div>
      <p class="resume-comment-point">Missing Required Field: ${escapeHtml(change.missingTerm || "Field")}</p>
      ${renderCardValidationError(change)}

      <div class="confirm-experience-notice">
        <strong>This mandatory resume field is missing.</strong>
        Add the correct value only. Do not guess.
      </div>

      <div class="confirm-question">
        <span class="field-label">Question / Importance</span>
        <p>${escapeHtml(change.promptText)}</p>
      </div>

      <div class="inline-before">
        <span class="field-label">Before</span>
        <div class="text-box compact-text-box">${escapeHtml(getOriginalPointText(change))}</div>
      </div>

      <div>
        <label class="field-label" for="${escapeHtml(change.id)}-edit">After</label>
        <textarea id="${escapeHtml(change.id)}-edit" class="edit-box confirmed-experience-input ${escapeHtml(inputClass)}" placeholder="${escapeHtml(change.missingTerm || "Value")}">${escapeHtml(inputValue)}</textarea>
      </div>

      <div class="card-meta">
        <div><strong>Entry:</strong> ${escapeHtml(change.originalText || change.entryLabel || "Missing field entry")}</div>
      </div>

      ${renderCardActionNotice(change)}
      <div class="card-actions">
        ${renderPreviewButton()}
        <button class="accept-button" type="button" data-action="accept">Save Field</button>
        <button class="reject-button" type="button" data-action="reject">Reject</button>
      </div>
    </article>
  `;
}

function renderHeaderConfirmationCard(change) {
  const statusLabel = renderStatusLabel(change);
  const riskLabel = renderRiskLabel(change);
  const inputValue = change.userDraftText || change.suggestedText || "";
  const kind = getSuggestionKind(change);

  return `
    <article class="change-card confirm-experience-card ${escapeHtml(change.status)} ${escapeHtml(kind)} ${escapeHtml(getChangePriorityClass(change))}" data-change-id="${escapeHtml(change.id)}">
      <div class="card-header">
        <h3 class="card-title">${renderCommentNumber(change)}${escapeHtml(getChangePointLabel(change))}</h3>
        <div class="badge-row">
          <span class="badge kind-badge ${escapeHtml(kind)}">${escapeHtml(getSuggestionKindLabel(kind))}</span>
          ${riskLabel}
          <span class="badge">${escapeHtml(humanize(change.supportLevel))}</span>
          ${statusLabel}
        </div>
      </div>
      <p class="resume-comment-point">Missing Header: ${escapeHtml(titleCase(change.missingTerm || "Contact Field"))}</p>
      ${renderCardValidationError(change)}

      <div class="confirm-experience-notice">
        <strong>This resume is missing an essential header field.</strong>
        Add it exactly as it should appear.
      </div>

      <div class="confirm-question">
        <span class="field-label">Question / Importance</span>
        <p>${escapeHtml(change.promptText)}</p>
      </div>

      <div class="inline-before">
        <span class="field-label">Before</span>
        <div class="text-box compact-text-box">${escapeHtml(getOriginalPointText(change))}</div>
      </div>

      <div>
        <label class="field-label" for="${escapeHtml(change.id)}-edit">After</label>
        <textarea id="${escapeHtml(change.id)}-edit" class="edit-box confirmed-experience-input compact-input single-line-input" placeholder="${escapeHtml(titleCase(change.missingTerm || "Value"))}">${escapeHtml(inputValue)}</textarea>
      </div>

      ${renderCardActionNotice(change)}
      <div class="card-actions">
        ${renderPreviewButton()}
        <button class="accept-button" type="button" data-action="accept">Save Header Field</button>
        <button class="reject-button" type="button" data-action="reject">Reject</button>
      </div>
    </article>
  `;
}

function renderDateConfirmationCard(change) {
  const statusLabel = renderStatusLabel(change);
  const riskLabel = renderRiskLabel(change);
  const inputValue = change.userDraftText || change.suggestedText || "";
  const kind = getSuggestionKind(change);

  return `
    <article class="change-card confirm-experience-card ${escapeHtml(change.status)} ${escapeHtml(kind)} ${escapeHtml(getChangePriorityClass(change))}" data-change-id="${escapeHtml(change.id)}">
      <div class="card-header">
        <h3 class="card-title">${renderCommentNumber(change)}${escapeHtml(getChangePointLabel(change))}</h3>
        <div class="badge-row">
          <span class="badge kind-badge ${escapeHtml(kind)}">${escapeHtml(getSuggestionKindLabel(kind))}</span>
          ${riskLabel}
          <span class="badge">${escapeHtml(humanize(change.supportLevel))}</span>
          ${statusLabel}
        </div>
      </div>
      <p class="resume-comment-point">Confirm Years: ${escapeHtml(change.missingTerm || change.section || "Entry")}</p>
      ${renderCardValidationError(change)}

      <div class="confirm-experience-notice">
        <strong>This entry is missing years/dates.</strong>
        Add exact years only. Do not guess.
      </div>

      <div class="confirm-question">
        <span class="field-label">Question / Importance</span>
        <p>${escapeHtml(change.promptText)}</p>
      </div>

      <div class="inline-before">
        <span class="field-label">Before</span>
        <div class="text-box compact-text-box">${escapeHtml(getOriginalPointText(change))}</div>
      </div>

      <div>
        <label class="field-label" for="${escapeHtml(change.id)}-edit">After</label>
        <textarea id="${escapeHtml(change.id)}-edit" class="edit-box confirmed-experience-input compact-input single-line-input" placeholder="Example: 2015 - 2016">${escapeHtml(inputValue)}</textarea>
      </div>

      <div class="card-meta">
        <div><strong>Entry:</strong> ${escapeHtml(change.originalText || change.evidence || "Missing date entry")}</div>
      </div>

      ${renderCardActionNotice(change)}
      <div class="card-actions">
        ${renderPreviewButton()}
        <button class="accept-button" type="button" data-action="accept">Save Years</button>
        <button class="reject-button" type="button" data-action="reject">Reject</button>
      </div>
    </article>
  `;
}

function getConfirmationInputClass(change) {
  const field = change.requiredField || "";
  if (field === "authors") return "large-text-window";
  if (["job_title", "company", "institution", "degree", "paper_title", "patent_name"].includes(field)) {
    return "compact-input";
  }
  return "compact-input";
}

function renderConfirmExperienceCard(change) {
  const statusLabel = renderStatusLabel(change);
  const riskLabel = renderRiskLabel(change);
  const promptText = change.promptText || change.whyItHelps || "";
  const kind = getSuggestionKind(change);
  const placements = getSelectedPlacements(change);
  const detailPlacements = getPendingSelectedPlacements(change);
  const showEvidenceForm = detailPlacements.length > 0 && !placements.includes("omit");

  return `
    <article class="change-card confirm-experience-card ${escapeHtml(change.status)} ${escapeHtml(kind)} ${escapeHtml(getChangePriorityClass(change))}" data-change-id="${escapeHtml(change.id)}">
      <div class="card-header">
        <h3 class="card-title">${renderCommentNumber(change)}${escapeHtml(getChangePointLabel(change))}</h3>
        <div class="badge-row">
          <span class="badge kind-badge ${escapeHtml(kind)}">${escapeHtml(getSuggestionKindLabel(kind))}</span>
          ${riskLabel}
          <span class="badge">${escapeHtml(humanize(change.supportLevel))}</span>
          ${statusLabel}
        </div>
      </div>
      <p class="resume-comment-point">${escapeHtml(getConfirmCardTitle(change))}</p>

      <div class="confirm-experience-notice">
        <strong>This information is not currently in the resume.</strong>
        Add it only if it is true and you can discuss it in an interview.
      </div>

      ${promptText ? `
        <div class="confirm-question">
          <span class="field-label">Question / Importance</span>
          <p>${escapeHtml(promptText)}</p>
        </div>
      ` : ""}

      ${renderPlacementControl(change)}
      ${renderCardValidationError(change)}

      ${showEvidenceForm ? `
        <div class="placement-detail-stack">
          ${detailPlacements.includes("skills") ? renderSkillPlacementFields(change) : ""}
          ${detailPlacements.includes("experience") ? renderExperiencePlacementFields(change) : ""}
          ${detailPlacements.includes("projects") ? renderProjectPlacementFields(change) : ""}
          ${detailPlacements.includes("education") ? renderEducationPlacementFields(change) : ""}
          ${detailPlacements.includes("certifications") ? renderCertificationPlacementFields(change) : ""}
          ${detailPlacements.includes("other") ? renderOtherPlacementFields(change) : ""}
        </div>
      ` : `
        <div class="placement-first-note">
          Choose one or more relevant sections first. The next fields will appear only for the sections you choose.
        </div>
      `}

      <div class="card-meta">
        <div><strong>Why this came up:</strong> ${escapeHtml(change.whyItHelps)}</div>
        <div><strong>Resume evidence so far:</strong> ${escapeHtml(change.evidence || "No direct evidence. User confirmation is required.")}</div>
      </div>

      ${renderCardActionNotice(change)}
      <div class="card-actions">
        ${placements.includes("omit") ? `<button class="accept-button" type="button" data-action="accept">${escapeHtml(getConfirmActionLabel(change))}</button>` : ""}
        <button class="reject-button" type="button" data-action="reject">Reject</button>
      </div>
    </article>
  `;
}

function getPendingSelectedPlacements(change) {
  return placementFlow.getPendingSelectedPlacements(change);
}

function getConfirmActionLabel(change) {
  const placements = getSelectedPlacements(change);
  if (placements.includes("omit")) return "Do Not Add";
  if (placements.length === 1 && placements.includes("other")) return "Save Note";
  if (placements.length > 1) return "Add to Selected Sections";
  const placement = placements[0] || getConfirmedPlacement(change);
  if (placement === "skills") return "Add to Skills";
  if (placement === "experience") return "Add to Experience";
  if (placement === "projects") return "Add to Projects";
  if (placement === "education") return "Add to Education";
  if (placement === "certifications") return "Add to Certifications";
  return "Add to Resume";
}

function getPlacementLabel(placement) {
  const labels = {
    skills: "Skills",
    experience: "Experience",
    projects: "Projects",
    education: "Education",
    certifications: "Certifications",
    other: "Other",
    omit: "Do Not Add"
  };
  return labels[placement] || titleCase(placement || "Resume");
}

function shouldShowRephraseButton(change) {
  const placements = getSelectedPlacements(change);
  return placements.some((placement) => placement !== "skills" && placement !== "omit");
}

function getConfirmCardTitle(change) {
  if (change.type === "add_keyword") return `Confirm Keywords: ${change.section || change.missingTerm || "Skills"}`;
  return `Confirm Experience: ${change.missingTerm || "Missing Skill"}`;
}

function renderStatusLabel(change) {
  if (change.status === "pending") return "";
  return `<span class="badge status-badge ${escapeHtml(change.status)}">${escapeHtml(humanize(change.status))}</span>`;
}

function renderRiskLabel(change) {
  if (change.status === "accepted" || change.status === "edited") return "";
  return `<span class="badge ${escapeHtml(change.riskLevel)}">${escapeHtml(change.riskLevel)} risk</span>`;
}

function isLongText(text) {
  return String(text || "").length > 120 || String(text || "").split("\n").length > 3;
}

function getConfirmedExperienceInputValue(change) {
  if (change.userDraftText) return change.userDraftText;
  const text = String(change.suggestedText || "").trim();
  if (!text) return "";
  if (change.status === "pending" || change.status === "needs_user_writing") {
    return "";
  }
  if (/^add one truthful bullet/i.test(text)) return "";
  if (/^do you\b|^have you\b|^can you\b|^did you\b/i.test(text)) return "";
  if (text.includes("project/context")) return "";
  return text;
}

function getConfirmedPlacement(change) {
  if (change.placement) return change.placement;
  const answerText = cleanConfirmedText(change.suggestedText || change.userDraftText || "");
  if (!answerText) return "undecided";
  return inferConfirmedPlacement(change, answerText);
}

function getSelectedPlacements(change) {
  return placementFlow.getSelectedPlacements(change);
}

function inferConfirmedPlacement(change, answerText = "") {
  const text = normalize([change.section, change.missingTerm, change.promptText, change.whyItHelps].filter(Boolean).join(" "));
  const answer = normalize(answerText);
  if (/\b(role|job title|company|workplace|employer)\s*:/i.test(answerText)) return "experience";
  if (/\b(project|prototype|portfolio|github|open source|hackathon)\s*:/i.test(answerText)) return "projects";
  if (/\b(program|course|institution|provider|university|college)\s*:/i.test(answerText)) return "education";
  if (/\b(certification|certificate|issuer)\s*:/i.test(answerText)) return "certifications";
  if (looksLikeSkillList(answerText) || extractSkillNamesFromText(answerText).length > 0) return "skills";
  if (/\b(project|prototype|portfolio|github|open source|hackathon)\b/.test(answer)) return "projects";
  if (isSkillConfirmation(change)) return "skills";
  if (/\b(course|training|education|degree|program|university|college)\b/.test(text)) return "education";
  if (/\b(certification|certificate|certified)\b/.test(text)) return "certifications";
  if (/\b(project|prototype|portfolio|github|open source|hackathon|rag|llm|agent)\b/.test(text)) return "projects";
  return "skills";
}

function getPlacementOptions(change) {
  if (isAcademicQualificationConfirmation(change)) {
    return [
      ["education", "Education"],
      ["omit", "Do not add"]
    ];
  }
  return [
    ["skills", "Skills"],
    ["experience", "Experience"],
    ["projects", "Projects"],
    ["education", "Education"],
    ["certifications", "Certifications"],
    ["other", "Other"],
    ["omit", "Do not add"]
  ];
}

function getPlacementHint(change) {
  if (isAcademicQualificationConfirmation(change)) {
    return "A degree belongs in Education. Add it only if it is accurate and completed or clearly in progress.";
  }
  const placements = getSelectedPlacements(change);
  if (placements.length > 1) return "More than one section is allowed. For example, Python can be added to Skills and also used to strengthen one Yahoo bullet.";
  const placement = placements[0] || getConfirmedPlacement(change);
  const hints = {
    skills: "Adds only clean skill names. No years are needed.",
    experience: "Choose the existing job first, then write the short evidence. After that, choose whether to enhance an existing bullet or add a new one.",
    projects: "Use for substantial personal or portfolio work. Include Project and Year before previewing.",
    education: "Use for meaningful courses, degrees, or programs. Include Program/Course, Institution, and Year.",
    certifications: "Use only for actual certificates. Include Certification, Issuer, and Year.",
    other: "Write the section name first. The next AI step can use that section name to ask the right required fields.",
    omit: "You reviewed this suggestion and chose not to add it to the resume.",
    undecided: "Choose where this confirmed information may belong. The next questions will depend on that destination."
  };
  return hints[placement] || hints.skills;
}

function isAcademicQualificationConfirmation(change) {
  const topic = normalize([change?.missingTerm, change?.promptText].filter(Boolean).join(" "));
  return /\b(ph\.?d\.?|doctorate|doctoral degree|master'?s degree|m\.?sc\.?)\b/.test(topic);
}

let placementTargetParser;

function getPlacementTargetParser() {
  if (placementTargetParser) return placementTargetParser;
  placementTargetParser = window.RoleFitPlacementTargets.create({
    extractYears,
    findSectionRange,
    normalize,
    parseEducationEntries,
    parseExperienceEntries,
    removeYears,
    stripLeadingBullet
  });
  return placementTargetParser;
}

function getExperienceTargets(resumeText = getPlacementTargetResume()) {
  return getPlacementTargetParser().getExperienceTargets(resumeText);
}

function getEducationTargets(resumeText) {
  const source = resumeText == null ? getPlacementTargetResume() : resumeText;
  return getPlacementTargetParser().getEducationTargets(source);
}

function parseProjectEntries(lines) {
  return getPlacementTargetParser().parseProjectEntries(lines);
}

function getProjectTargets(resumeText) {
  const source = resumeText == null ? getPlacementTargetResume() : resumeText;
  return getPlacementTargetParser().getProjectTargets(source);
}

function findProjectTargetBySnapshot(targets, change) {
  return getPlacementTargetParser().findBySnapshot(targets, {
    name: change.projectTargetName,
    year: change.projectTargetYear
  }, ["name", "year"]);
}

function captureProjectSelectionSnapshot(change, resumeText = getPlacementTargetResume()) {
  if (!change) return;
  const target = getSelectedProjectTarget(change, resumeText);
  if (!target) return;
  change.projectEntryKey = target.key;
  change.projectTargetName = target.name || "";
  change.projectTargetYear = target.year || "";
  if (getProjectAction(change, resumeText) === "rewrite") {
    change.projectOriginalBullet = getSelectedProjectBullet(change, resumeText);
  }
}

function getSelectedProjectTarget(change, resumeText = getPlacementTargetResume()) {
  const targets = getProjectTargets(resumeText);
  if (!targets.length) return null;
  const snapshot = findProjectTargetBySnapshot(targets, change);
  if (snapshot) return snapshot;
  const selected = targets.find((target) => target.key === change.projectEntryKey);
  return selected || targets[0];
}

function getProjectAction(change, resumeText = getPlacementTargetResume()) {
  if (change.projectAction) return change.projectAction;
  if (change.projectName || change.projectYear || change.projectLabel) return "new";
  return getProjectTargets(resumeText).length ? "new_bullet" : "new";
}

function getSelectedProjectBullet(change, resumeText = getPlacementTargetResume()) {
  const target = getSelectedProjectTarget(change, resumeText);
  if (!target?.bullets?.length) return "";
  const index = Number(change.projectBulletIndex || 0);
  return target.bullets[Number.isFinite(index) ? index : 0] || target.bullets[0] || "";
}

function getProjectDraftContext(change, resumeText = getPlacementTargetResume()) {
  return [
    getProjectAction(change, resumeText),
    change.projectEntryKey || "",
    change.projectBulletIndex || ""
  ].join("|");
}

function getContextualProjectDetailValue(change, fallback = "") {
  return change.projectDraftContext === getProjectDraftContext(change)
    ? change.projectDetails || fallback
    : fallback;
}

function findEducationTargetBySnapshot(targets, change) {
  return getPlacementTargetParser().findBySnapshot(targets, {
    degree: change.educationTargetDegree,
    institution: change.educationTargetInstitution,
    years: change.educationTargetYears
  }, ["degree", "institution", "years"]);
}

function captureEducationSelectionSnapshot(change, resumeText = getPlacementTargetResume()) {
  if (!change) return;
  const target = getSelectedEducationTarget(change, resumeText);
  if (!target) return;
  change.educationEntryKey = target.key;
  change.educationTargetDegree = target.degree || "";
  change.educationTargetInstitution = target.institution || "";
  change.educationTargetYears = target.years || "";
  if (getEducationAction(change, resumeText) === "rewrite") {
    change.educationOriginalDetail = getSelectedEducationDetail(change, resumeText);
  }
}

function getSelectedEducationTarget(change, resumeText = getPlacementTargetResume()) {
  const targets = getEducationTargets(resumeText);
  if (!targets.length) return null;
  const snapshot = findEducationTargetBySnapshot(targets, change);
  if (snapshot) return snapshot;
  const selected = targets.find((target) => target.key === change.educationEntryKey);
  return selected || targets[0];
}

function getEducationAction(change, resumeText = getPlacementTargetResume()) {
  if (change.educationAction) return change.educationAction;
  return getEducationTargets(resumeText).length ? "existing" : "new";
}

function getSelectedEducationDetail(change, resumeText = getPlacementTargetResume()) {
  const target = getSelectedEducationTarget(change, resumeText);
  if (!target?.details?.length) return "";
  const index = Number(change.educationDetailIndex || 0);
  return target.details[Number.isFinite(index) ? index : 0] || target.details[0] || "";
}

function getEducationDraftContext(change, resumeText = getPlacementTargetResume()) {
  return [
    getEducationAction(change, resumeText),
    change.educationEntryKey || "",
    change.educationDetailIndex || ""
  ].join("|");
}

function getContextualEducationDetailValue(change, fallback = "") {
  return change.educationDraftContext === getEducationDraftContext(change)
    ? change.educationDetails || fallback
    : fallback;
}

function getSelectedExperienceTarget(change, resumeText = getWorkingResumeText()) {
  if (change.experienceEntryKey === NEW_EXPERIENCE_KEY) return null;
  const targets = getExperienceTargets(resumeText);
  if (!targets.length) return null;
  const snapshot = findExperienceTargetBySnapshot(targets, change);
  if (snapshot) return snapshot;
  const selected = targets.find((target) => target.key === change.experienceEntryKey);
  return selected || targets[0];
}

function findExperienceTargetBySnapshot(targets, change) {
  const title = normalize(change.experienceTargetTitle || "");
  const company = normalize(change.experienceTargetCompany || "");
  const years = normalize(change.experienceTargetYears || "");
  if (!title && !company && !years) return null;

  return targets.find((target) => {
    const titleMatches = !title || normalize(target.title || "") === title;
    const companyMatches = !company || normalize(target.company || "") === company;
    const yearMatches = !years || normalize(target.years || "") === years;
    return titleMatches && companyMatches && yearMatches;
  }) || null;
}

function captureExperienceSelectionSnapshot(change, resumeText = getWorkingResumeText()) {
  if (!change || change.experienceEntryKey === NEW_EXPERIENCE_KEY) return;
  // Dropdown keys are positional. Keep a content snapshot too, because adding a
  // dated role can move every later position in the Experience section.
  const target = getSelectedExperienceTarget(change, resumeText);
  if (!target) return;
  change.experienceEntryKey = target.key;
  change.experienceTargetTitle = target.title || "";
  change.experienceTargetCompany = target.company || "";
  change.experienceTargetYears = target.years || "";
  if (getExperienceAction(change, resumeText) === "enhance") {
    change.experienceOriginalBullet = getSelectedExperienceBullet(change, resumeText);
  }
}

function getExperienceAction(change, resumeText = getWorkingResumeText()) {
  if (change.experienceEntryKey === NEW_EXPERIENCE_KEY) return "new_experience";
  if (change.experienceAction) return change.experienceAction;
  const target = getSelectedExperienceTarget(change, resumeText);
  if (!target) return "new_experience";
  return target?.bullets?.length ? "enhance" : "new";
}

function getSelectedExperienceBullet(change, resumeText = getWorkingResumeText()) {
  const target = getSelectedExperienceTarget(change, resumeText);
  if (!target?.bullets?.length) return "";
  const index = Number(change.experienceBulletIndex || 0);
  return target.bullets[Number.isFinite(index) ? index : 0] || target.bullets[0] || "";
}

function getExperienceDraftContext(change, resumeText = getWorkingResumeText()) {
  return [
    change.experienceEntryKey || "",
    getExperienceAction(change, resumeText),
    change.experienceBulletIndex || ""
  ].join("|");
}

function getContextualExperienceDraftValue(change, fallback = "", resumeText = getWorkingResumeText()) {
  const contextMatches = change.experienceDraftContext
    && change.experienceDraftContext === getExperienceDraftContext(change, resumeText);
  return contextMatches
    ? change.experienceDraftText || fallback
    : fallback;
}

function getPlacementDraftValue(change, key, fallback = "") {
  return change[key] || fallback || "";
}

function getDefaultSkillDraft(change) {
  if (change.skillDraftText) return change.skillDraftText;
  const terms = extractSkillNamesFromText(change.missingTerm || "");
  if (terms.length) return terms.join(", ");
  const topic = cleanConfirmedText(change.missingTerm || "");
  if (topic && !/^(specific experience|missing skill|programming languages?|skills?|experience)$/i.test(topic) && topic.length <= 48 && !/[?,]/.test(topic)) {
    return titleCaseKnownTerm(topic);
  }
  return getConfirmedPlacement(change) === "skills" ? getConfirmedExperienceInputValue(change) : "";
}

function renderSkillPlacementFields(change) {
  const value = getDefaultSkillDraft(change);
  return `
    <section class="placement-detail-card">
      <h4>Skills</h4>
      ${renderCardValidationError(change, "skills")}
      <label class="field-label" for="${escapeHtml(change.id)}-skills">Skills to add</label>
      <input id="${escapeHtml(change.id)}-skills" class="structured-input" data-draft-field="skillDraftText" value="${escapeHtml(value)}" placeholder="Python, SQL, C++">
      <label class="field-label" for="${escapeHtml(change.id)}-skill-levels">Level (optional)</label>
      <input id="${escapeHtml(change.id)}-skill-levels" class="structured-input" data-draft-field="skillLevelText" value="${escapeHtml(change.skillLevelText || "")}" placeholder="Python: advanced, SQL: intermediate">
      <p class="placement-hint">Add only skill names here. Levels are optional and should be shown only when useful.</p>
      ${renderPlacementActions("skills")}
    </section>
  `;
}

function renderExperiencePlacementFields(change) {
  const targetResume = getResumeForPlacementTargets();
  if (!change.experienceEntryKey) {
    const defaultTarget = getSelectedExperienceTarget(change, targetResume);
    if (defaultTarget) change.experienceEntryKey = defaultTarget.key;
  }
  if (change.experienceEntryKey && change.experienceEntryKey !== NEW_EXPERIENCE_KEY && !change.experienceTargetTitle) {
    captureExperienceSelectionSnapshot(change, targetResume);
  }
  const action = getExperienceAction(change, targetResume);
  const selectedBullet = getSelectedExperienceBullet(change, targetResume);
  const before = action === "enhance"
    ? selectedBullet
    : action === "new_experience"
      ? "New experience entry"
      : `New bullet under ${getSelectedExperienceTarget(change, targetResume)?.label || "selected role"}`;
  const value = action === "new_experience"
    ? (change.experienceDraftContext === getExperienceDraftContext(change, targetResume) ? change.experienceDraftText || "" : "")
    : getContextualExperienceDraftValue(change, action === "enhance" ? stripLeadingBullet(selectedBullet) : "", targetResume);

  return `
    <section class="placement-detail-card">
      <h4>Experience</h4>
      ${renderCardValidationError(change, "experience")}
      ${renderExperienceTargetControl(change)}
      ${action === "new_experience" ? renderNewExperienceFields(change) : ""}
      <span class="field-label">Before</span>
      <div class="text-box compact-text-box">${escapeHtml(before || "Choose a job and bullet above.")}</div>
      <label class="field-label" for="${escapeHtml(change.id)}-experience-draft">${action === "enhance" ? "Rewrite this bullet" : "New bullet evidence"}</label>
      <textarea id="${escapeHtml(change.id)}-experience-draft" class="edit-box confirmed-experience-input" data-draft-field="experienceDraftText" placeholder="${action === "enhance" ? "Rewrite the full bullet with the confirmed detail included." : "Write one short factual bullet. Metrics are optional if true."}">${escapeHtml(value)}</textarea>
      ${action === "new" ? `
        <ul class="short-question-list">
          <li>What did you personally do?</li>
          <li>Which tool, method, or domain matters?</li>
          <li>Was there a truthful metric or outcome?</li>
        </ul>
      ` : ""}
      ${renderPlacementActions("experience", shouldShowRephraseButton(change))}
    </section>
  `;
}

function renderNewExperienceFields(change) {
  return `
    <div class="structured-field-grid">
      <label><span class="field-label">Job title</span><input class="structured-input" data-draft-field="experienceNewTitle" value="${escapeHtml(change.experienceNewTitle || "")}"></label>
      <label><span class="field-label">Company</span><input class="structured-input" data-draft-field="experienceNewCompany" value="${escapeHtml(change.experienceNewCompany || "")}"></label>
      <label><span class="field-label">Years</span><input class="structured-input short-field" data-draft-field="experienceNewYears" value="${escapeHtml(change.experienceNewYears || "")}" placeholder="2020 - 2022"></label>
    </div>
  `;
}

function renderProjectPlacementFields(change) {
  const targetResume = getPlacementTargetResume();
  if (!change.projectEntryKey) {
    const defaultTarget = getSelectedProjectTarget(change, targetResume);
    if (defaultTarget) change.projectEntryKey = defaultTarget.key;
  }
  if (change.projectEntryKey && !change.projectTargetName) {
    captureProjectSelectionSnapshot(change, targetResume);
  }
  const action = getProjectAction(change, targetResume);
  const selectedBullet = getSelectedProjectBullet(change, targetResume);
  const detailValue = getContextualProjectDetailValue(change, action === "rewrite" ? stripLeadingBullet(selectedBullet) : "");

  return `
    <section class="placement-detail-card">
      <h4>Projects</h4>
      ${renderCardValidationError(change, "projects")}
      ${renderProjectTargetControl(change, action)}
      ${action === "new" ? `
        <div class="structured-field-grid">
          <label><span class="field-label">Project name</span><input class="structured-input" data-draft-field="projectName" value="${escapeHtml(change.projectName || "")}"></label>
          <label><span class="field-label">Year</span><input class="structured-input short-field" data-draft-field="projectYear" value="${escapeHtml(change.projectYear || "")}" placeholder="2026"></label>
          <label><span class="field-label">Optional context</span><input class="structured-input" data-draft-field="projectLabel" value="${escapeHtml(change.projectLabel || "")}" placeholder="Open-source project, portfolio project"></label>
        </div>
      ` : ""}
      ${action === "rewrite" ? `
        <span class="field-label">Before</span>
        <div class="text-box compact-text-box">${escapeHtml(selectedBullet || "Choose a project bullet above.")}</div>
      ` : ""}
      <label class="field-label">${action === "rewrite" ? "Rewrite this project bullet" : action === "new_bullet" ? "New bullet under selected project" : "Optional detail"}</label>
      <textarea class="edit-box confirmed-experience-input medium-text-window" data-draft-field="projectDetails" placeholder="${action === "rewrite" ? "Rewrite the full bullet with the confirmed detail included." : "One short bullet or detail."}">${escapeHtml(detailValue)}</textarea>
      ${renderPlacementActions("projects", shouldShowRephraseButton(change))}
    </section>
  `;
}

function renderProjectTargetControl(change, action) {
  const targetResume = getPlacementTargetResume();
  const targets = getProjectTargets(targetResume);
  if (!targets.length) return "";
  const selectedTarget = getSelectedProjectTarget(change, targetResume);
  const bulletOptions = (selectedTarget?.bullets || []).map((bullet, index) => `
    <option value="${index}" ${String(index) === String(change.projectBulletIndex || "0") ? "selected" : ""}>${escapeHtml(bullet)}</option>
  `).join("");

  return `
    <div class="placement-control project-target-control">
      <label class="field-label" for="${escapeHtml(change.id)}-project-action">How should this project change be used?</label>
      <select id="${escapeHtml(change.id)}-project-action" class="placement-select project-action-select">
        <option value="new_bullet" ${action === "new_bullet" ? "selected" : ""}>Add a new bullet to an existing project</option>
        <option value="rewrite" ${action === "rewrite" ? "selected" : ""} ${selectedTarget?.bullets?.length ? "" : "disabled"}>Rewrite an existing project bullet</option>
        <option value="new" ${action === "new" ? "selected" : ""}>Add a new project</option>
      </select>

      ${action !== "new" ? `
        <label class="field-label" for="${escapeHtml(change.id)}-project-entry">Which project?</label>
        <select id="${escapeHtml(change.id)}-project-entry" class="placement-select project-entry-select">
          ${targets.map((target) => `
            <option value="${escapeHtml(target.key)}" ${target.key === selectedTarget?.key ? "selected" : ""}>${escapeHtml(target.labelText)}</option>
          `).join("")}
        </select>
      ` : ""}

      ${action === "rewrite" && selectedTarget?.bullets?.length ? `
        <label class="field-label" for="${escapeHtml(change.id)}-project-bullet">Which existing bullet?</label>
        <select id="${escapeHtml(change.id)}-project-bullet" class="placement-select project-bullet-select">
          ${bulletOptions}
        </select>
      ` : ""}
    </div>
  `;
}

function renderEducationPlacementFields(change) {
  const targetResume = getPlacementTargetResume();
  if (!change.educationEntryKey) {
    const defaultTarget = getSelectedEducationTarget(change, targetResume);
    if (defaultTarget) change.educationEntryKey = defaultTarget.key;
  }
  if (change.educationEntryKey && !change.educationTargetDegree) {
    captureEducationSelectionSnapshot(change, targetResume);
  }
  const action = getEducationAction(change, targetResume);
  const selectedDetail = getSelectedEducationDetail(change, targetResume);
  const detailValue = getContextualEducationDetailValue(change, action === "rewrite" ? selectedDetail : "");

  return `
    <section class="placement-detail-card">
      <h4>Education</h4>
      ${renderCardValidationError(change, "education")}
      ${renderEducationTargetControl(change, action)}
      ${action === "new" ? `
        <div class="structured-field-grid">
          <label><span class="field-label">Program / course</span><input class="structured-input" data-draft-field="educationProgram" value="${escapeHtml(change.educationProgram || "")}"></label>
          <label><span class="field-label">Institution / provider</span><input class="structured-input" data-draft-field="educationInstitution" value="${escapeHtml(change.educationInstitution || "")}"></label>
          <label><span class="field-label">Year</span><input class="structured-input short-field" data-draft-field="educationYear" value="${escapeHtml(change.educationYear || "")}" placeholder="2026"></label>
        </div>
      ` : ""}
      ${action === "rewrite" ? `
        <span class="field-label">Before</span>
        <div class="text-box compact-text-box">${escapeHtml(selectedDetail || "Choose an education detail above.")}</div>
      ` : ""}
      <label class="field-label">${action === "rewrite" ? "Rewrite this education detail" : action === "existing" ? "New detail under selected education" : "Optional detail"}</label>
      <textarea class="edit-box confirmed-experience-input medium-text-window" data-draft-field="educationDetails">${escapeHtml(detailValue)}</textarea>
      ${renderPlacementActions("education", shouldShowRephraseButton(change))}
    </section>
  `;
}

function renderEducationTargetControl(change, action) {
  const targetResume = getPlacementTargetResume();
  const targets = getEducationTargets(targetResume);
  if (!targets.length) return "";
  const selectedTarget = getSelectedEducationTarget(change, targetResume);
  const detailOptions = (selectedTarget?.details || []).map((detail, index) => `
    <option value="${index}" ${String(index) === String(change.educationDetailIndex || "0") ? "selected" : ""}>${escapeHtml(detail)}</option>
  `).join("");

  return `
    <div class="placement-control education-target-control">
      <label class="field-label" for="${escapeHtml(change.id)}-education-action">How should this education change be used?</label>
      <select id="${escapeHtml(change.id)}-education-action" class="placement-select education-action-select">
        <option value="existing" ${action === "existing" ? "selected" : ""}>Add a new detail to an existing education entry</option>
        <option value="rewrite" ${action === "rewrite" ? "selected" : ""} ${selectedTarget?.details?.length ? "" : "disabled"}>Rewrite an existing education detail</option>
        <option value="new" ${action === "new" ? "selected" : ""}>Add a new education entry</option>
      </select>

      ${action !== "new" ? `
        <label class="field-label" for="${escapeHtml(change.id)}-education-entry">Which education entry?</label>
        <select id="${escapeHtml(change.id)}-education-entry" class="placement-select education-entry-select">
          ${targets.map((target) => `
            <option value="${escapeHtml(target.key)}" ${target.key === selectedTarget?.key ? "selected" : ""}>${escapeHtml(target.label)}</option>
          `).join("")}
        </select>
      ` : ""}

      ${action === "rewrite" && selectedTarget?.details?.length ? `
        <label class="field-label" for="${escapeHtml(change.id)}-education-detail">Which existing detail?</label>
        <select id="${escapeHtml(change.id)}-education-detail" class="placement-select education-detail-select">
          ${detailOptions}
        </select>
      ` : ""}
    </div>
  `;
}

function renderCertificationPlacementFields(change) {
  return `
    <section class="placement-detail-card">
      <h4>Certifications</h4>
      ${renderCardValidationError(change, "certifications")}
      <div class="structured-field-grid">
        <label><span class="field-label">Certification</span><input class="structured-input" data-draft-field="certificationName" value="${escapeHtml(change.certificationName || "")}"></label>
        <label><span class="field-label">Issuer</span><input class="structured-input" data-draft-field="certificationIssuer" value="${escapeHtml(change.certificationIssuer || "")}"></label>
        <label><span class="field-label">Year</span><input class="structured-input short-field" data-draft-field="certificationYear" value="${escapeHtml(change.certificationYear || "")}" placeholder="2026"></label>
        <label><span class="field-label">Credential ID (optional)</span><input class="structured-input" data-draft-field="certificationCredentialId" value="${escapeHtml(change.certificationCredentialId || "")}"></label>
      </div>
      ${renderPlacementActions("certifications")}
    </section>
  `;
}

function getEditableSectionItems(sectionTitle, resumeText = getPlacementTargetResume()) {
  const title = normalizeCustomSectionTitle(sectionTitle || "");
  if (!title) return [];
  const lines = String(resumeText || "").split("\n");
  const range = findSectionRange(lines, [title]);
  if (!range) return [];
  const items = [];
  for (let index = range.start + 1; index < range.end; index += 1) {
    const line = lines[index] || "";
    const clean = stripLeadingBullet(line).trim();
    if (!clean) continue;
    items.push({
      index,
      text: line.trim(),
      clean
    });
  }
  return items;
}

function getOtherAction(change) {
  if (change.otherAction) return change.otherAction;
  return "new";
}

function getSelectedOtherSectionItem(change, resumeText = getPlacementTargetResume()) {
  const items = getEditableSectionItems(change.otherSectionName, resumeText);
  if (!items.length) return null;
  const index = Number(change.otherItemIndex || 0);
  return items[Number.isFinite(index) ? index : 0] || items[0] || null;
}

function renderOtherPlacementFields(change) {
  const sectionName = normalizeCustomSectionTitle(change.otherSectionName || "");
  if (isVolunteerSectionTitle(sectionName)) {
    return renderVolunteerPlacementFields(change, sectionName);
  }

  const action = getOtherAction(change);
  const selectedItem = getSelectedOtherSectionItem(change);
  const value = change.otherPlacementText || (action === "enhance" ? stripLeadingBullet(selectedItem?.text || "") : "");

  return `
    <section class="placement-detail-card">
      <h4>Other</h4>
      ${renderCardValidationError(change, "other")}
      <label class="field-label" for="${escapeHtml(change.id)}-other-section">Section name</label>
      <input id="${escapeHtml(change.id)}-other-section" class="structured-input" data-draft-field="otherSectionName" value="${escapeHtml(change.otherSectionName || "")}" placeholder="Achievements, Awards, Volunteer Experience">
      ${sectionName ? renderOtherSectionControls(change, sectionName, action, selectedItem) : ""}
      <label class="field-label" for="${escapeHtml(change.id)}-other-note">What should be added or asked?</label>
      <textarea id="${escapeHtml(change.id)}-other-note" class="edit-box confirmed-experience-input medium-text-window" data-draft-field="otherPlacementText" placeholder="${action === "enhance" ? "Rewrite the selected item." : "Write one concise item for this section."}">${escapeHtml(value)}</textarea>
      <p class="placement-hint">${escapeHtml(getOtherSectionHint(sectionName, action))}</p>
      ${renderPlacementActions("other", shouldShowRephraseButton(change))}
    </section>
  `;
}

function renderOtherSectionControls(change, sectionName, action, selectedItem) {
  const items = getEditableSectionItems(sectionName);
  const hasExistingItems = items.length > 0;

  return `
    <div class="placement-control other-section-control">
      <label class="field-label" for="${escapeHtml(change.id)}-other-action">How should this section change?</label>
      <select id="${escapeHtml(change.id)}-other-action" class="placement-select other-action-select">
        <option value="enhance" ${action === "enhance" ? "selected" : ""} ${hasExistingItems ? "" : "disabled"}>Rewrite an existing item</option>
        <option value="new" ${action === "new" ? "selected" : ""}>Add a new item</option>
      </select>
      ${action === "enhance" && hasExistingItems ? `
        <label class="field-label" for="${escapeHtml(change.id)}-other-item">Which existing item?</label>
        <select id="${escapeHtml(change.id)}-other-item" class="placement-select other-item-select">
          ${items.map((item, index) => `
            <option value="${index}" ${String(index) === String(change.otherItemIndex || "0") ? "selected" : ""}>${escapeHtml(item.clean)}</option>
          `).join("")}
        </select>
        <span class="field-label">Before</span>
        <div class="text-box compact-text-box">${escapeHtml(selectedItem?.text || "Choose an item above.")}</div>
      ` : ""}
    </div>
  `;
}

function getOtherSectionHint(sectionName, action) {
  if (!sectionName) return "Write a section name first. The app will then show the right controls for that section.";
  if (action === "enhance") return "Rewrite the full selected item. The preview will replace that item only.";
  return "Preview will add this item to the named section. If the section does not exist, it will be created after Education.";
}

function isVolunteerSectionTitle(title) {
  return ["volunteer experience", "volunteer work", "volunteering"].includes(normalizeSectionLabel(title));
}

function renderVolunteerPlacementFields(change, sectionName = "Volunteer Experience") {
  return `
    <section class="placement-detail-card">
      <h4>Volunteer Experience</h4>
      <label class="field-label" for="${escapeHtml(change.id)}-other-section">Section name</label>
      <input id="${escapeHtml(change.id)}-other-section" class="structured-input" data-draft-field="otherSectionName" value="${escapeHtml(sectionName || change.otherSectionName || "Volunteer Experience")}" placeholder="Volunteer Experience">
      <div class="structured-field-grid">
        <label><span class="field-label">Volunteer title / role</span><input class="structured-input" data-draft-field="volunteerTitle" value="${escapeHtml(change.volunteerTitle || "")}"></label>
        <label><span class="field-label">Organization / place</span><input class="structured-input" data-draft-field="volunteerPlace" value="${escapeHtml(change.volunteerPlace || "")}"></label>
        <label><span class="field-label">Years</span><input class="structured-input short-field" data-draft-field="volunteerYears" value="${escapeHtml(change.volunteerYears || "")}" placeholder="2021 - 2022"></label>
      </div>
      <label class="field-label" for="${escapeHtml(change.id)}-volunteer-detail">Bullet / detail</label>
      <textarea id="${escapeHtml(change.id)}-volunteer-detail" class="edit-box confirmed-experience-input medium-text-window" data-draft-field="volunteerDetails" placeholder="Write one concise bullet about what you did.">${escapeHtml(change.volunteerDetails || change.otherPlacementText || "")}</textarea>
      <p class="placement-hint">Volunteer Experience uses the same structure as Experience: role with years, organization, then bullets.</p>
      ${renderPlacementActions("other", shouldShowRephraseButton(change))}
    </section>
  `;
}

function renderPlacementActions(placement, includeRephrase = false) {
  const label = getPlacementLabel(placement);
  const isPreviewable = placement !== "omit";
  return `
    <div class="placement-actions">
      ${isPreviewable ? `<button class="secondary-button preview-button" type="button" data-action="preview" data-preview-placement="${escapeHtml(placement)}">Preview ${escapeHtml(label)}</button>` : ""}
      ${includeRephrase ? `<button class="secondary-button" type="button" data-action="rephrase">AI Rephrase</button>` : ""}
      <button class="accept-button" type="button" data-action="accept-placement" data-accept-placement="${escapeHtml(placement)}">${placement === "other" ? "Save Other Section" : `Add to ${escapeHtml(label)}`}</button>
    </div>
  `;
}

function renderExperienceTargetControl(change) {
  if (!getSelectedPlacements(change).includes("experience")) return "";

  const targetResume = getResumeForPlacementTargets();
  const targets = getExperienceTargets(targetResume);
  if (!targets.length) {
    return `
      <div class="placement-control">
        <span class="field-label">Experience target</span>
        <p class="placement-hint">No Experience entries were parsed from the resume. Add a new experience entry below.</p>
      </div>
    `;
  }

  const selectedTarget = getSelectedExperienceTarget(change, targetResume);
  const action = getExperienceAction(change, targetResume);
  const bulletOptions = (selectedTarget?.bullets || []).map((bullet, index) => `
    <option value="${index}" ${String(index) === String(change.experienceBulletIndex || "0") ? "selected" : ""}>${escapeHtml(bullet)}</option>
  `).join("");

  return `
    <div class="placement-control experience-target-control">
      <label class="field-label" for="${escapeHtml(change.id)}-experience-entry">Which job title?</label>
      <select id="${escapeHtml(change.id)}-experience-entry" class="placement-select experience-entry-select">
        ${targets.map((target) => `
          <option value="${escapeHtml(target.key)}" ${target.key === selectedTarget?.key ? "selected" : ""}>${escapeHtml(target.label)}</option>
        `).join("")}
        <option value="${NEW_EXPERIENCE_KEY}" ${change.experienceEntryKey === NEW_EXPERIENCE_KEY ? "selected" : ""}>Add new experience entry</option>
      </select>

      ${change.experienceEntryKey === NEW_EXPERIENCE_KEY ? "" : `
        <label class="field-label" for="${escapeHtml(change.id)}-experience-action">How should this evidence be used?</label>
        <select id="${escapeHtml(change.id)}-experience-action" class="placement-select experience-action-select">
          <option value="enhance" ${action === "enhance" ? "selected" : ""} ${selectedTarget?.bullets?.length ? "" : "disabled"}>Rewrite an existing bullet</option>
          <option value="new" ${action === "new" ? "selected" : ""}>Add a new bullet under this job</option>
        </select>
      `}

      ${action === "enhance" && selectedTarget?.bullets?.length && change.experienceEntryKey !== NEW_EXPERIENCE_KEY ? `
        <label class="field-label" for="${escapeHtml(change.id)}-experience-bullet">Which existing bullet?</label>
        <select id="${escapeHtml(change.id)}-experience-bullet" class="placement-select experience-bullet-select">
          ${bulletOptions}
        </select>
      ` : ""}

      <p class="placement-hint">Write only the evidence you want used for this job. The preview will show the exact bullet change before you accept.</p>
    </div>
  `;
}

function renderPlacementControl(change) {
  const selected = getSelectedPlacements(change);
  const selectedSet = new Set(selected);
  return `
    <div class="placement-control">
      <span class="field-label">Which section is relevant?</span>
      <div class="placement-checkbox-grid">
        ${getPlacementOptions(change).map(([value, label]) => `
          <label class="placement-checkbox-label">
            <input class="placement-checkbox" type="checkbox" value="${escapeHtml(value)}" ${selectedSet.has(value) ? "checked" : ""}>
            <span>${escapeHtml(label)}</span>
          </label>
        `).join("")}
      </div>
      <p class="placement-hint">${escapeHtml(getPlacementHint(change))}</p>
    </div>
  `;
}

async function rephraseConfirmedExperience(change, editBox, button) {
  if (!editBox) {
    setAiStatus("Choose a writable field before asking AI to rephrase it.", "error");
    return;
  }
  const userText = editBox.value.trim();

  if (!userText) {
    setAiStatus("Write your rough experience first, then ask AI to rephrase it.", "error");
    return;
  }

  button.disabled = true;
  button.textContent = "Rephrasing...";
  setAiStatus("Rephrasing your confirmed draft with AI...", "neutral");

  try {
    const response = await fetch("/api/rephrase-experience", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        topic: change.missingTerm || change.section || "confirmed experience",
        userText,
        resume: getWorkingResumeText(),
        jobDescription: jobInput.value.trim()
      })
    });
    const rawResponse = await response.text();
    let data;

    try {
      data = JSON.parse(rawResponse);
    } catch {
      if (rawResponse.trim().startsWith("<")) {
        throw new Error("AI backend returned HTML instead of JSON. Make sure `node server.mjs` is running.");
      }
      throw new Error("AI backend returned invalid JSON.");
    }

    if (!response.ok) {
      throw new Error(data.error || "Could not rephrase experience.");
    }

    editBox.value = mergeRephrasedTextIntoPlacement(change, userText, data.bullet || userText);
    const draftField = editBox.getAttribute("data-draft-field");
    if (draftField) {
      change[draftField] = editBox.value;
      syncDraftContextForField(change, draftField);
    }
    change.userDraftText = editBox.value;
    change.suggestedText = editBox.value;
    change.previewedKey = "";
    change.previewedPlacementKeys = {};
    setAiStatus("AI rephrased the confirmed draft. Preview it before adding.", "success");
  } catch (error) {
    setAiStatus(error.message || "Could not rephrase the confirmed draft.", "error");
  } finally {
    button.disabled = false;
    button.textContent = "AI Rephrase";
  }
}

function syncDraftContextForField(change, draftField) {
  if (draftField === "experienceDraftText") {
    captureExperienceSelectionSnapshot(change);
    change.experienceDraftContext = getExperienceDraftContext(change);
  } else if (draftField === "projectDetails") {
    change.projectDraftContext = getProjectDraftContext(change);
  } else if (draftField === "educationDetails") {
    change.educationDraftContext = getEducationDraftContext(change);
  }
}

function mergeRephrasedTextIntoPlacement(change, originalText, bullet) {
  if (getConfirmedPlacement(change) !== "projects") return bullet;

  const parsed = parseStructuredFields(originalText);
  const lines = [];
  for (const [key, value] of Object.entries(parsed.fields)) {
    lines.push(`${titleCase(key.replaceAll("_", " "))}: ${value}`);
  }
  lines.push(bullet);
  return lines.join("\n");
}

function hasMeaningfulUserConfirmedText(change) {
  if (isPlacementConfirmation(change)) {
    if (getSkillDraft(change).length) return true;
    if (cleanConfirmedText(change.experienceDraftText).length >= 3) return true;
    if (cleanConfirmedText(change.projectName) || cleanConfirmedText(change.educationProgram) || cleanConfirmedText(change.certificationName)) return true;
  }
  const text = change.suggestedText.trim().toLowerCase();
  if (change.requiresHeaderWording) return text.length >= 3;
  if (change.requiresRequiredFieldWording) return text.length >= 2;
  if (change.requiresDateWording) return /\b(?:19|20)\d{2}\b/.test(text);
  if (isSkillConfirmation(change) && extractSkillNamesFromText(change.suggestedText).length > 0) return true;
  if (wordCount(text) < 6) return false;
  if (text.includes("add one truthful bullet")) return false;
  if (text.includes("project/context")) return false;
  return true;
}

function humanize(value) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function stripHtmlTags(value) {
  const template = document.createElement("template");
  template.innerHTML = String(value || "");
  return template.content.textContent || "";
}

function getPreviewHighlightCandidates(change, editBox) {
  const currentInput = editBox?.value?.trim() || "";
  const minimumCandidateLength = isPlacementConfirmation(change) && getConfirmedPlacement(change) === "skills" ? 1 : 3;
  const previewSuggestedText = change.type === "spelling_check" && currentInput
    ? buildSpellingSuggestedLine(change, currentInput)
    : currentInput || change.suggestedText;
  const placementCandidates = getPlacementHighlightCandidates({ ...change, suggestedText: previewSuggestedText });
  const rewriteDiffCandidates = isRewritePreviewChange(change)
    ? getChangedAfterFragments(change.originalText, previewSuggestedText)
    : [];

  if (change.type === "spelling_check") {
    return unique([
      change.spellingAfter,
      ...getSpellingCorrectedTerms(change.originalText, previewSuggestedText),
    ].filter(Boolean));
  }

  if (change.requiresDateWording) {
    return unique([
      previewSuggestedText,
      change.originalText,
      change.entryLabel,
      change.missingTerm,
      change.evidence
    ]
      .filter(Boolean)
      .map((item) => stripHtmlTags(item).trim())
      .filter((item) => item.length >= 3 && !/missing from header|no direct evidence|awaiting your input/i.test(item))
    );
  }

  if (change.requiresRequiredFieldWording || change.requiresHeaderWording) {
    return unique([
      previewSuggestedText,
      currentInput,
      change.originalText,
      change.entryLabel,
      change.missingTerm,
      change.evidence
    ]
      .filter(Boolean)
      .map((item) => stripHtmlTags(item).trim())
      .filter((item) => item.length >= 2 && !/missing from header|no direct evidence|awaiting your input/i.test(item))
    );
  }

  return unique([
    ...placementCandidates,
    ...rewriteDiffCandidates,
    !isRewritePreviewChange(change) && previewSuggestedText && !looksLikeRemovalInstructionOnly(previewSuggestedText) ? previewSuggestedText : "",
    change.originalText,
    change.evidence,
    change.entryLabel,
    change.missingTerm,
    currentInput
  ]
    .flatMap((item) => [item, ...extractLineAnchorCandidates(item)])
    .filter(Boolean)
    .map((item) => stripHtmlTags(item).trim())
    .filter((item) => item.length >= minimumCandidateLength && !/missing from header|no direct evidence|awaiting your input/i.test(item))
  );
}

function isRewritePreviewChange(change) {
  return change?.mode === "replace" || change?.type === "rewrite";
}

function isTargetedPlacementRewrite(change) {
  if (!change?.requiresUserWording) return false;
  const placement = getConfirmedPlacement(change);
  if (placement === "experience") return getExperienceAction(change) === "enhance";
  if (placement === "projects") return getProjectAction(change) === "rewrite";
  if (placement === "education") return getEducationAction(change) === "rewrite";
  if (placement === "other") return (change.otherAction || "new") === "enhance";
  return false;
}

function getPreviewRewritePair(change) {
  if (!change) return { before: "", after: "" };
  if (!isTargetedPlacementRewrite(change)) {
    return {
      before: String(change.originalText || "").trim(),
      after: String(change.suggestedText || "").trim()
    };
  }

  const placement = getConfirmedPlacement(change);
  if (placement === "experience") {
    return {
      before: getSelectedExperienceBullet(change),
      after: String(change.experienceDraftText || change.suggestedText || "").trim()
    };
  }
  if (placement === "projects") {
    return {
      before: getSelectedProjectBullet(change),
      after: String(change.projectDetails || change.suggestedText || "").trim()
    };
  }
  if (placement === "education") {
    return {
      before: getSelectedEducationDetail(change),
      after: String(change.educationDetails || change.suggestedText || "").trim()
    };
  }

  const selectedItem = getEditableSectionItems(change.otherSectionName, getWorkingResumeText())[Number(change.otherItemIndex || 0)];
  return {
    before: String(selectedItem?.clean || selectedItem?.text || "").trim(),
    after: String(change.otherPlacementText || change.suggestedText || "").trim()
  };
}

const resumePreviewHighlighter = window.RoleFitResumePreviewHighlighter.create({
  escapeHtml,
  escapeRegExp,
  preferredSectionTitle,
  stripHtmlTags,
  unique
});

function getChangedAfterFragments(beforeText, afterText) {
  return resumePreviewHighlighter.getChangedAfterFragments(beforeText, afterText);
}

function getChangedBeforeFragments(beforeText, afterText) {
  return resumePreviewHighlighter.getChangedBeforeFragments(beforeText, afterText);
}

function extractLineAnchorCandidates(text) {
  return String(text || "")
    .split(/\n+/)
    .map((line) => line.trim())
    .filter((line) => line.length >= 8 && !isKnownResumeSection(line));
}

function getPlacementHighlightCandidates(change) {
  if (!change.requiresUserWording) return [];
  const placement = getConfirmedPlacement(change);
  if (placement === "skills") return getSkillDraft(change);
  if (placement === "other") {
    if (isVolunteerSectionTitle(change.otherSectionName)) {
      const draft = getVolunteerDraft(change);
      return [draft.title, draft.place, draft.years, draft.bullet, change.otherSectionName].filter(Boolean);
    }
    if ((change.otherAction || "new") === "enhance") {
      const selectedItem = getEditableSectionItems(change.otherSectionName, getWorkingResumeText())[Number(change.otherItemIndex || 0)];
      const diff = getChangedAfterFragments(selectedItem?.clean || selectedItem?.text || "", change.otherPlacementText);
      return diff.length ? diff : [change.otherPlacementText].filter(Boolean);
    }
    return [change.otherPlacementText, change.otherSectionName].filter(Boolean);
  }
  if (placement === "projects") {
    const action = getProjectAction(change);
    if (action === "rewrite") {
      const diff = getChangedAfterFragments(getSelectedProjectBullet(change), change.projectDetails);
      return diff.length ? diff : [change.projectDetails].filter(Boolean);
    }
    if (action === "new_bullet") {
      return [change.projectDetails, getSelectedProjectTarget(change)?.labelText].filter(Boolean);
    }
    const draft = getProjectDraft(change);
    return [draft.name, draft.year, draft.label, ...draft.bullets.map(stripLeadingBullet)];
  }
  if (placement === "education") {
    if (getEducationAction(change) === "rewrite") {
      const diff = getChangedAfterFragments(getSelectedEducationDetail(change), change.educationDetails);
      return diff.length ? diff : [change.educationDetails].filter(Boolean);
    }
    const draft = getEducationDraft(change);
    return [draft.program, draft.institution, draft.year, change.educationDetails];
  }
  if (placement === "certifications") {
    const draft = getCertificationDraft(change);
    return [draft.name, draft.issuer, draft.year, draft.credentialId];
  }
  if (placement === "experience") {
    if (getExperienceAction(change) === "new_experience") {
      const draft = getNewExperienceDraft(change);
      return [draft.role, draft.company, draft.years, ...draft.bullets.map(stripLeadingBullet)];
    }
    if (getExperienceAction(change) === "enhance") {
      const diff = getChangedAfterFragments(getSelectedExperienceBullet(change), change.experienceDraftText);
      return diff.length ? diff : [change.experienceDraftText].filter(Boolean);
    }
    if (getExperienceAction(change) === "new") {
      return [change.experienceDraftText, getSelectedExperienceTarget(change)?.label].filter(Boolean);
    }
    const draft = getExperienceDraft(change);
    return [draft.role, draft.company, draft.years, ...draft.bullets.map(stripLeadingBullet)];
  }
  return [];
}

function highlightFirstMatchInHtml(html, candidates) {
  return resumePreviewHighlighter.highlightFirstMatchInHtml(html, candidates);
}

function findVisibleHtmlTextIndex(html, escapedText) {
  return resumePreviewHighlighter.findVisibleHtmlTextIndex(html, escapedText);
}

function findVisibleHtmlWholeWordIndex(html, escapedText) {
  return resumePreviewHighlighter.findVisibleHtmlWholeWordIndex(html, escapedText);
}

function isHtmlIndexInsideTag(html, index) {
  return resumePreviewHighlighter.isHtmlIndexInsideTag(html, index);
}

function getAnchorScore(blockText, candidates) {
  return resumePreviewHighlighter.getAnchorScore(blockText, candidates);
}

function addMarkerToBestBlockHtml(html, candidates, marker, options = {}) {
  return resumePreviewHighlighter.addMarkerToBestBlockHtml(html, candidates, marker, options);
}

function addExactCommentMarkerToHtml(html, candidates, change, options = {}) {
  const marker = renderResumeCommentMarker(change);
  const findIndex = options.wholeWord ? findVisibleHtmlWholeWordIndex : findVisibleHtmlTextIndex;
  const sectionMatch = getRenderedSectionMatch(html, change.section);
  if (sectionMatch) {
    const sectionHtml = sectionMatch[1];
    for (const candidate of candidates) {
      const escaped = escapeHtml(candidate);
      const index = findIndex(sectionHtml, escaped);
      if (index === -1) continue;

      const markedSection = `${sectionHtml.slice(0, index)}<mark class="resume-comment-anchor">${escaped}${marker}</mark>${sectionHtml.slice(index + escaped.length)}`;
      return {
        html: html.replace(sectionHtml, markedSection),
        matched: candidate
      };
    }
  }

  for (const candidate of candidates) {
    const escaped = escapeHtml(candidate);
    const index = findIndex(html, escaped);
    if (index === -1) continue;
    return {
      html: `${html.slice(0, index)}<mark class="resume-comment-anchor">${escaped}${marker}</mark>${html.slice(index + escaped.length)}`,
      matched: candidate
    };
  }

  return { html, matched: "" };
}

function getRenderedSectionMatch(html, sectionTitle) {
  return resumePreviewHighlighter.getRenderedSectionMatch(html, sectionTitle);
}

function highlightFirstMatchInSectionHtml(html, candidates, sectionTitle) {
  return resumePreviewHighlighter.highlightFirstMatchInSectionHtml(html, candidates, sectionTitle);
}

function highlightFirstWholeWordMatchInSectionHtml(html, candidates, sectionTitle) {
  return resumePreviewHighlighter.highlightFirstWholeWordMatchInSectionHtml(html, candidates, sectionTitle);
}

function highlightFirstWholeWordMatchInHtml(html, candidates) {
  return resumePreviewHighlighter.highlightFirstWholeWordMatchInHtml(html, candidates);
}

function getPreviewTargetAnchorCandidates(change) {
  const placement = getConfirmedPlacement(change);
  if (placement === "experience") {
    return [change.experienceTargetTitle, change.experienceTargetCompany, change.experienceTargetYears].filter(Boolean);
  }
  if (placement === "projects") {
    return [getSelectedProjectTarget(change)?.labelText].filter(Boolean);
  }
  if (placement === "education") {
    const target = getEducationTargets(getWorkingResumeText())
      .find((item) => item.key === change.educationEntryKey);
    return [target?.program, target?.institution, target?.years].filter(Boolean);
  }
  if (placement === "other") {
    const selectedItem = getEditableSectionItems(change.otherSectionName, getWorkingResumeText())[Number(change.otherItemIndex || 0)];
    return [selectedItem?.clean || selectedItem?.text].filter(Boolean);
  }
  return [change.entryLabel, change.originalText].filter(Boolean);
}

function addPreviewHighlightClassToBlock(block) {
  return resumePreviewHighlighter.addPreviewHighlightClassToBlock(block);
}

function highlightCandidatesInsideBlock(block, candidates) {
  return resumePreviewHighlighter.highlightCandidatesInsideBlock(block, candidates);
}

function highlightRewriteDiffInHtml(html, change) {
  const pair = getPreviewRewritePair(change);
  if (!pair.after) return { html, matched: "" };
  const fragments = getChangedAfterFragments(pair.before, pair.after);
  if (!fragments.length) return { html, matched: "" };
  const anchors = getPreviewTargetAnchorCandidates(change);
  return resumePreviewHighlighter.highlightRewriteDiffInHtml(html, change.section, pair, fragments, anchors);
}

function highlightBestBlockInHtml(html, candidates, options = {}) {
  return resumePreviewHighlighter.highlightBestBlockInHtml(html, candidates, options);
}

function highlightBestBlockInSectionHtml(html, candidates, sectionTitle, options = {}) {
  return resumePreviewHighlighter.highlightBestBlockInSectionHtml(html, candidates, sectionTitle, options);
}

function highlightGroupedBlocksInSectionHtml(html, sectionTitle, candidates) {
  return resumePreviewHighlighter.highlightGroupedBlocksInSectionHtml(html, sectionTitle, candidates);
}

function highlightExperienceChangeInHtml(html, sectionTitle, entries, targetIndex, options = {}) {
  return resumePreviewHighlighter.highlightExperienceChangeInHtml(
    html,
    sectionTitle,
    entries,
    targetIndex,
    options
  );
}

function highlightChangeInHtml(html, candidates, change) {
  if (change.type === "spelling_check") {
    const sectionScoped = highlightFirstWholeWordMatchInSectionHtml(html, candidates, change.section);
    if (sectionScoped.matched) return sectionScoped;
    return highlightFirstWholeWordMatchInHtml(html, candidates);
  }

  if (isRewritePreviewChange(change) || isTargetedPlacementRewrite(change)) {
    const diffHighlighted = highlightRewriteDiffInHtml(html, change);
    if (diffHighlighted.matched) return diffHighlighted;

    // A punctuation-only or similarly tiny Statement rewrite can have no
    // token-level diff. The text still changed, so show the resulting summary
    // block rather than leaving Preview apparently empty.
    if (isSummaryLikeSection(change.section)) {
      const pair = getPreviewRewritePair(change);
      return highlightBestBlockInSectionHtml(
        html,
        [pair.after, pair.before],
        change.section,
        { threshold: 0.2 }
      );
    }

    return diffHighlighted;
  }

  const sectionScoped = highlightFirstMatchInSectionHtml(html, candidates, change.section);
  if (sectionScoped.matched) return sectionScoped;

  const fuzzySectionScoped = highlightBestBlockInSectionHtml(html, candidates, change.section);
  if (fuzzySectionScoped.matched) return fuzzySectionScoped;

  if (change.requiresDateWording || change.requiresRequiredFieldWording) {
    return { html, matched: "" };
  }

  const globalExact = highlightFirstMatchInHtml(html, candidates);
  if (globalExact.matched) return globalExact;

  return highlightBestBlockInHtml(html, candidates, { threshold: 0.58 });
}

function isRemovalPreview(change) {
  return change?.mode === "removeOrReplace"
    && (!String(change.suggestedText || "").trim() || looksLikeRemovalInstructionOnly(change.suggestedText));
}

function getRemovalPreviewCandidates(change) {
  return unique([
    change.originalText,
    ...extractLineAnchorCandidates(change.originalText)
  ]
    .map((item) => stripLeadingBullet(String(item || "")).trim())
    .filter((item) => item.length >= 3));
}

function getRemovalExperienceEntry(baseText, change) {
  if (canonicalSectionTitle(change.section) !== "experience") return null;
  const parsed = parseResumeText(baseText);
  const section = parsed.sections.find((item) => canonicalSectionTitle(item.title) === "experience");
  if (!section) return null;

  const targets = getRemovalPreviewCandidates(change)
    .map((item) => normalizeEntryAnchorForComparison(item))
    .filter(Boolean);
  if (!targets.length) return null;

  let bestMatch = null;
  for (const [index, entry] of parseExperienceEntries(section.lines).entries()) {
    const title = normalizeEntryAnchorForComparison(entry.title);
    const company = normalizeEntryAnchorForComparison(entry.company);
    const raw = normalizeEntryAnchorForComparison(entry.rawLine);
    const bullets = (entry.bullets || []).map(normalizeEntryAnchorForComparison).filter(Boolean);
    let score = 0;
    let matchesBullet = false;

    for (const target of targets) {
      if ([title, company, raw].includes(target)) score = Math.max(score, 6);
      if (bullets.includes(target)) {
        score = Math.max(score, 7);
        matchesBullet = true;
      }
      if ([title, company, raw, ...bullets].some((value) => value && (value.includes(target) || target.includes(value)))) {
        score = Math.max(score, 3);
      }
    }

    if (!bestMatch || score > bestMatch.score) {
      bestMatch = { entry: { ...entry, index }, score, matchesBullet };
    }
  }

  return bestMatch?.score >= 3 ? bestMatch : null;
}

function addRemovalClassToHtmlBlock(html, candidate) {
  const target = normalizeEntryAnchorForComparison(candidate);
  if (!target) return { html, matched: "" };

  function markBlock(full, tag, attributes, content) {
    if (/\bresume-preview-removal\b/.test(attributes)) return full;
    const visible = normalizeEntryAnchorForComparison(stripHtmlTags(content));
    if (!visible || !(visible.includes(target) || target.includes(visible))) return full;

    markBlock.matched = stripHtmlTags(content).trim();
    const openingTag = `<${tag}${attributes}>`;
    const markedOpeningTag = /\bclass=["']/.test(attributes)
      ? openingTag.replace(/\bclass=(["'])([^"']*)\1/i, (_, quote, classes) => `class=${quote}${classes} resume-preview-removal${quote}`)
      : `<${tag}${attributes} class="resume-preview-removal">`;
    return `${markedOpeningTag}${content}</${tag}>`;
  }

  let updated = html.replace(/<(h3|p|li)([^>]*)>([\s\S]*?)<\/\1>/gi, (full, tag, attributes, content) => {
    if (markBlock.matched) return full;
    return markBlock(full, tag, attributes, content);
  });
  if (markBlock.matched) return { html: updated, matched: markBlock.matched };

  updated = html.replace(/<div([^>]*\bentry-years\b[^>]*)>([\s\S]*?)<\/div>/gi, (full, attributes, content) => {
    if (markBlock.matched) return full;
    return markBlock(full, "div", attributes, content);
  });
  if (markBlock.matched) return { html: updated, matched: markBlock.matched };

  return { html, matched: "" };
}

function highlightRemovalExperienceEntryInHtml(html, sectionHtml, entry) {
  let highlightedSection = sectionHtml;
  const values = [entry.title, entry.company, entry.years, ...(entry.bullets || [])].filter(Boolean);
  const matches = [];

  for (const value of values) {
    const highlighted = addRemovalClassToHtmlBlock(highlightedSection, value);
    if (!highlighted.matched) continue;
    highlightedSection = highlighted.html;
    matches.push(highlighted.matched);
  }

  if (!matches.length) return { html, matched: "" };
  return {
    html: html.replace(sectionHtml, highlightedSection),
    matched: matches.join(" ")
  };
}

function highlightRemovalPreviewInHtml(html, change, baseText = "") {
  const sectionMatch = getRenderedSectionMatch(html, change.section);
  if (!sectionMatch) return highlightSectionHeaderForRemoval(html, change.section);

  const sectionHtml = sectionMatch[1];
  const experienceEntry = getRemovalExperienceEntry(baseText, change);
  if (experienceEntry && !experienceEntry.matchesBullet) {
    const entryHighlight = highlightRemovalExperienceEntryInHtml(html, sectionHtml, experienceEntry.entry);
    if (entryHighlight.matched) return entryHighlight;
  }

  for (const candidate of getRemovalPreviewCandidates(change)) {
    const escaped = escapeHtml(candidate);
    const index = findVisibleHtmlTextIndex(sectionHtml, escaped);
    if (index === -1) continue;
    const highlightedSection = `${sectionHtml.slice(0, index)}<mark class="resume-preview-removal">${escaped}</mark>${sectionHtml.slice(index + escaped.length)}`;
    return {
      html: html.replace(sectionHtml, highlightedSection),
      matched: candidate
    };
  }

  return highlightWholeSectionForRemoval(html, change.section);
}

function highlightRemovalResultContextInHtml(html, change) {
  // The removed text is intentionally absent from this preview. Mark the
  // affected section so the user can still orient themselves around the gap.
  return highlightWholeSectionForRemoval(html, change.section);
}

function highlightWholeSectionForRemoval(html, sectionTitle) {
  const match = getRenderedSectionMatch(html, sectionTitle);
  if (!match) return highlightSectionHeaderForRemoval(html, sectionTitle);
  return {
    html: html.replace(match[1], `<div class="resume-preview-removal-section-block">${match[1]}</div>`),
    matched: preferredSectionTitle({ title: sectionTitle || "" })
  };
}

function highlightSectionHeaderForRemoval(html, sectionTitle) {
  const cleanTitle = preferredSectionTitle({ title: sectionTitle || "" });
  if (!cleanTitle) return { html, matched: "" };
  const escapedTitle = escapeRegExp(escapeHtml(cleanTitle));
  const headerPattern = new RegExp(`<h2>${escapedTitle}<\\/h2>`, "i");
  if (!headerPattern.test(html)) return { html, matched: "" };
  return {
    html: html.replace(headerPattern, `<h2 class="resume-preview-removal-section">${escapeHtml(cleanTitle)}</h2>`),
    matched: cleanTitle
  };
}

function highlightAllMatchesInSectionHtml(html, candidates, sectionTitle) {
  return resumePreviewHighlighter.highlightAllMatchesInSectionHtml(html, candidates, sectionTitle);
}

function highlightFirstUnmarkedMatchInHtml(html, candidate) {
  return resumePreviewHighlighter.highlightFirstUnmarkedMatchInHtml(html, candidate);
}

function highlightSectionInHtml(html, sectionTitle) {
  return resumePreviewHighlighter.highlightSectionInHtml(html, sectionTitle);
}

function shouldFallbackToSectionHighlight(change) {
  if (!change) return false;
  if (change.mode === "replace" || change.type === "rewrite") return false;
  if (change.requiresUserWording) return true;
  if (change.mode === "append" || change.mode === "insertAfterHeader" || change.mode === "replaceSection") return true;
  if (!change.originalText && change.suggestedText) return true;
  return false;
}

function shouldHighlightInsertedCandidateSet(change) {
  if (!change?.requiresUserWording) return false;
  const placement = getConfirmedPlacement(change);
  if (placement === "skills") return getSkillDraft(change).length > 1;
  if (placement === "experience") return getExperienceAction(change) === "new_experience";
  if (placement === "projects") return getProjectAction(change) === "new";
  if (placement === "education") return getEducationAction(change) === "new";
  if (placement === "certifications") return true;
  return false;
}

function findExperiencePreviewTargetIndex(entries, change, baseText, action) {
  if (action !== "new_experience") {
    const selectedTarget = getSelectedExperienceTarget(change, baseText);
    return selectedTarget?.index ?? -1;
  }

  const draft = getNewExperienceDraft(change);
  const expectedTitle = normalize(draft.role);
  const expectedCompany = normalize(draft.company);
  const expectedYears = normalize(draft.years);
  const expectedBullet = normalizeBulletForMatch(draft.bullets[0] || "");
  return entries.findIndex((entry) => (
    normalize(entry.title || "") === expectedTitle
    && normalize(entry.company || "") === expectedCompany
    && normalize(entry.years || "") === expectedYears
    && (!expectedBullet || (entry.bullets || []).some((bullet) => normalizeBulletForMatch(bullet) === expectedBullet))
  ));
}

function highlightExperiencePlacementInHtml(html, change, baseText, appliedText) {
  if (!isPlacementConfirmation(change) || getConfirmedPlacement(change) !== "experience") {
    return { html, matched: "", handled: false };
  }

  const action = getExperienceAction(change, baseText);
  const entries = getExperienceTargets(appliedText);
  const targetIndex = findExperiencePreviewTargetIndex(entries, change, baseText, action);
  if (targetIndex === -1) return { html, matched: "", handled: true };

  const target = entries[targetIndex];
  const afterBullet = action === "new_experience"
    ? target.bullets[0] || ""
    : cleanConfirmedText(change.experienceDraftText || change.suggestedText || "");
  if (!afterBullet) return { html, matched: "", handled: true };

  if (action === "new_experience") {
    return {
      ...highlightExperienceChangeInHtml(
        html,
        change.section || "Experience",
        entries,
        targetIndex,
        {
          mode: "entry",
          blockText: stripLeadingBullet(afterBullet)
        }
      ),
      handled: true
    };
  }

  if (action === "new") {
    return {
      ...highlightExperienceChangeInHtml(
        html,
        change.section || "Experience",
        entries,
        targetIndex,
        {
          mode: "block",
          blockText: stripLeadingBullet(afterBullet)
        }
      ),
      handled: true
    };
  }

  const beforeBullet = change.experienceOriginalBullet
    || getSelectedExperienceBullet(change, baseText);
  const fragments = getChangedAfterFragments(beforeBullet, afterBullet);
  return {
    ...highlightExperienceChangeInHtml(
      html,
      change.section || "Experience",
      entries,
      targetIndex,
      {
        mode: "diff",
        blockText: stripLeadingBullet(afterBullet),
        fragments
      }
    ),
    handled: true
  };
}

function extractContextAnchorCandidates(text) {
  const value = String(text || "");
  const candidates = [];
  const roleAtCompany = value.match(/\b(?:as|for|role as|time as)\s+(?:a\s+|an\s+)?([A-Z][A-Za-z0-9+#/&(). -]{2,60}?)\s+at\s+([A-Z][A-Za-z0-9&(). -]{1,40})\b/);
  if (roleAtCompany) {
    const role = roleAtCompany[1].trim();
    const company = roleAtCompany[2].trim();
    candidates.push(`${role} at ${company}`, role, company);
  }

  const compactRoleCompany = value.match(/\b([A-Z][A-Za-z0-9+#/&(). -]{2,60}?)\s+(?:responsibilities|accomplishments|experience)\s+at\s+([A-Z][A-Za-z0-9&(). -]{1,40})\b/);
  if (compactRoleCompany) {
    const role = compactRoleCompany[1].trim();
    const company = compactRoleCompany[2].trim();
    candidates.push(`${role} at ${company}`, role, company);
  }

  for (const match of value.matchAll(/\bat\s+([A-Z][A-Za-z0-9&(). -]{1,40})\b/g)) {
    candidates.push(match[1].trim());
  }

  return candidates;
}

function getCommentMarkerCandidates(change) {
  if (change.type === "spelling_check") {
    return unique([
      ...(change.spellingBefore ? [change.spellingBefore] : []),
      ...getSpellingDiffTerms(change.originalText, change.suggestedText)
    ]
      .filter(Boolean)
      .map((item) => stripHtmlTags(item).trim())
      .filter((item) => item.length >= 2)
    );
  }

  const changedOriginalFragments = isRewritePreviewChange(change)
    ? getChangedBeforeFragments(change.originalText, change.suggestedText)
    : [];
  const originalAnchors = changedOriginalFragments.length
    ? changedOriginalFragments
    : [change.originalText];

  const sectionLabels = new Set([
    normalizeSectionLabel(change.section),
    ...getResumeSectionAliases(change.section || "").map(normalizeSectionLabel)
  ].filter(Boolean));

  return unique([
    ...(change.type === "spelling_check" ? getSpellingDiffTerms(change.originalText, change.suggestedText) : []),
    ...originalAnchors,
    change.evidence,
    change.entryLabel,
    change.missingTerm,
    change.promptText,
    ...extractContextAnchorCandidates(change.originalText),
    ...extractContextAnchorCandidates(change.evidence),
    ...extractContextAnchorCandidates(change.promptText),
    ...extractContextAnchorCandidates(change.missingTerm)
  ]
    .filter(Boolean)
    .map((item) => stripHtmlTags(item).trim())
    .filter((item) => {
      const normalized = normalizeSectionLabel(item);
      if (item.length < 4) return false;
      if (/missing from header|no direct evidence|awaiting your input|not in resume/i.test(item)) return false;
      if (sectionLabels.has(normalized) || isKnownResumeSection(item)) return false;
      return true;
    })
  );
}

function addCommentMarkerToHtml(html, candidates, change) {
  if (change.type === "spelling_check") {
    return addExactCommentMarkerToHtml(html, candidates, change, { wholeWord: true });
  }

  if (!change.originalText && change.suggestedText) {
    const insertionMarked = addInsertionMarkerToSectionHtml(html, change);
    if (insertionMarked.matched) return insertionMarked;
  }

  const scoped = addCommentMarkerToSectionHtml(html, candidates, change);
  if (scoped.matched) return scoped;

  const globalFuzzy = addMarkerToBestBlockHtml(html, candidates, renderResumeCommentMarker(change), { threshold: 0.58 });
  if (globalFuzzy.matched) return globalFuzzy;

  const sectionMarked = addCommentMarkerToSectionHeaderHtml(html, change);
  if (sectionMarked.matched) {
    return sectionMarked;
  }

  for (const candidate of candidates) {
    const escaped = escapeHtml(candidate);
    const index = findVisibleHtmlTextIndex(html, escaped);
    if (index === -1) continue;

    const marker = renderResumeCommentMarker(change);
    return {
      html: `${html.slice(0, index)}<mark class="resume-comment-anchor">${escaped}${marker}</mark>${html.slice(index + escaped.length)}`,
      matched: candidate
    };
  }

  return { html, matched: "" };
}

function addInsertionMarkerToSectionHtml(html, change) {
  const cleanTitle = preferredSectionTitle({ title: change.section || "" });
  const match = getRenderedSectionMatch(html, change.section);
  if (!match || !cleanTitle) return { html, matched: "" };

  const sectionHtml = match[1];
  const marker = renderResumeCommentMarker(change);
  const markedSection = sectionHtml.replace(/(<h2>[\s\S]*?<\/h2>)/i, `$1${marker}`);
  if (markedSection === sectionHtml) return { html, matched: "" };

  return {
    html: html.replace(sectionHtml, markedSection),
    matched: cleanTitle
  };
}

function addCommentMarkerToSectionHeaderHtml(html, change) {
  const cleanTitle = preferredSectionTitle({ title: change.section || "" });
  const match = getRenderedSectionMatch(html, change.section);
  if (!match || !cleanTitle) return { html, matched: "" };

  const sectionHtml = match[1];
  const escapedTitle = escapeHtml(cleanTitle);
  const marker = renderResumeCommentMarker(change);
  const markedSection = sectionHtml.replace(
    new RegExp(`(<h2>${escapeRegExp(escapedTitle)})(<\\/h2>)`, "i"),
    `$1${marker}$2`
  );

  if (markedSection === sectionHtml) return { html, matched: "" };

  return {
    html: html.replace(sectionHtml, markedSection),
    matched: cleanTitle
  };
}

function addCommentMarkerToSectionHtml(html, candidates, change) {
  const match = getRenderedSectionMatch(html, change.section);
  if (!match) return { html, matched: "" };

  const sectionHtml = match[1];
  const marker = renderResumeCommentMarker(change);
  for (const candidate of candidates) {
    const escaped = escapeHtml(candidate);
    const index = findVisibleHtmlTextIndex(sectionHtml, escaped);
    if (index === -1) continue;

    const markedSection = `${sectionHtml.slice(0, index)}<mark class="resume-comment-anchor">${escaped}${marker}</mark>${sectionHtml.slice(index + escaped.length)}`;
    return {
      html: html.replace(sectionHtml, markedSection),
      matched: candidate
    };
  }

  const fuzzy = addMarkerToBestBlockHtml(sectionHtml, candidates, marker);
  if (fuzzy.matched) {
    return {
      html: html.replace(sectionHtml, fuzzy.html),
      matched: fuzzy.matched
    };
  }

  return { html, matched: "" };
}

function getCommentColorClass(change) {
  return `${getSuggestionKind(change)} ${getChangePriorityClass(change)}`;
}

function renderResumeCommentMarker(change) {
  return `<button class="resume-comment-marker ${escapeHtml(getCommentColorClass(change))}" type="button" data-comment-id="${escapeHtml(change.id)}" aria-label="Open comment ${escapeHtml(change.commentNumber)}">${escapeHtml(change.commentNumber)}</button>`;
}

function renderCommentLegend() {
  const jobLegend = hasTargetJobDescription()
    ? `<span><i class="legend-dot job"></i>Job-specific</span>`
    : "";

  return `
    <span class="comment-legend">
      <span><i class="legend-dot mandatory"></i>Mandatory</span>
      ${jobLegend}
      <span><i class="legend-dot improvement"></i>Resume improvement</span>
    </span>
  `;
}

function countOpenChangesForPass(pass) {
  return currentChanges.filter((change) =>
    inferChangePass(change) === pass
    && isOpenChange(change)
    && !dismissedChangeKeys.has(getDismissalKey(change))
  ).length;
}

function countAllOpenChanges() {
  return REVIEW_PASSES.reduce((sum, pass) => sum + countOpenChangesForPass(pass.id), 0);
}

function renderPreviewPassOverview() {
  return `
    <span class="preview-pass-overview" aria-label="Review passes">
      ${REVIEW_PASSES.map((pass, index) => `
        <button class="preview-pass-pill ${activePass === pass.id ? "active" : ""}" type="button" data-preview-pass="${pass.id}">${index + 1}. ${escapeHtml(pass.label)}${escapeHtml(getPassTabSuffix(pass.id))}</button>
      `).join("")}
    </span>
  `;
}

function renderOtherPassOpenNotice() {
  const parts = REVIEW_PASSES
    .filter((pass) => pass.id !== activePass)
    .map((pass) => ({ ...pass, count: countOpenChangesForPass(pass.id) }))
    .filter((pass) => pass.count > 0)
    .map((pass) => `${pass.count} in ${escapeHtml(pass.label)}`);
  if (!parts.length) return "";
  const total = parts.reduce((sum, part) => sum + Number(part.match(/^\d+/)?.[0] || 0), 0);
  if (parts.length === 1) {
    const pass = REVIEW_PASSES.find((item) => parts[0].includes(item.label));
    return `<span class="other-pass-notice">${total} open comment${total === 1 ? "" : "s"} ${total === 1 ? "remains" : "remain"} in ${escapeHtml(pass?.label || "another pass")}.</span>`;
  }
  return `<span class="other-pass-notice">${total} open comment${total === 1 ? "" : "s"} ${total === 1 ? "remains" : "remain"} in other passes: ${parts.join(", ")}.</span>`;
}

function renderRemainingOpenCommentsNotice(currentChange = null) {
  const activeRemaining = currentChanges.filter((change) =>
    change !== currentChange
    && change.id !== currentChange?.id
    && inferChangePass(change) === activePass
    && isOpenChange(change)
    && !dismissedChangeKeys.has(getDismissalKey(change))
  ).length;
  const otherParts = REVIEW_PASSES
    .filter((pass) => pass.id !== activePass)
    .map((pass) => ({ ...pass, count: countOpenChangesForPass(pass.id) }))
    .filter((pass) => pass.count > 0);
  const otherRemaining = otherParts.reduce((sum, pass) => sum + pass.count, 0);
  const total = activeRemaining + otherRemaining;
  if (!total) return "";

  const parts = [];
  if (activeRemaining) {
    parts.push(`${activeRemaining} more in ${escapeHtml(getPassLabel(activePass))}`);
  }
  parts.push(...otherParts.map((pass) => `${pass.count} in ${escapeHtml(pass.label)}`));

  return `<span class="other-pass-notice">${total} other open comment${total === 1 ? "" : "s"} ${total === 1 ? "remains" : "remain"}: ${parts.join(", ")}.</span>`;
}

function bindPreviewPassButtons() {
  pdfPreview.querySelectorAll("[data-preview-pass]").forEach((button) => {
    button.addEventListener("click", () => {
      setActivePass(button.dataset.previewPass);
    });
  });
  pdfPreview.querySelector("[data-action='preview-export-style']")?.addEventListener("change", (event) => {
    exportStyleSelect.value = event.target.value;
    renderNumberedCommentPreview();
  });
  pdfPreview.querySelector("[data-action='view-updated-preview']")?.addEventListener("click", () => {
    const target = pdfPreview.querySelector(".resume-header") || pdfPreview.querySelector(".designed-resume") || pdfPreview;
    target.scrollIntoView({ behavior: "smooth", block: "start" });
  });
  pdfPreview.querySelectorAll("[data-action='return-review']").forEach((button) => {
    button.addEventListener("click", () => {
      const target = activeCommentPanel && !activeCommentPanel.hidden ? activeCommentPanel : changeCards;
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });
  pdfPreview.querySelector("[data-action='export-pdf-inline']")?.addEventListener("click", () => {
    exportResumePdf();
  });
  pdfPreview.querySelector("[data-action='keep-longer-resume']")?.addEventListener("click", () => {
    pageBudgetOverride = true;
    setAiStatus("Keeping the longer resume. No content was removed.", "neutral");
    renderNumberedCommentPreview();
  });
  pdfPreview.querySelector("[data-action='get-shortening-suggestions']")?.addEventListener("click", () => {
    analyzeWithAi({ pageBudgetMode: true });
  });
}

function bindMissingExperiencePanel() {
  if (!missingExperiencePanel) return;
  missingExperiencePanel.querySelectorAll("button[data-missing-experience-id], button[data-comment-id]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      openMissingExperienceCommentById(
        button.dataset.missingExperienceId
        || button.getAttribute("data-missing-experience-id")
        || button.dataset.commentId
        || button.getAttribute("data-comment-id")
      );
    });
  });
  missingExperiencePanel.querySelectorAll(".missing-experience-row[data-missing-experience-id]").forEach((row) => {
    row.addEventListener("click", (event) => {
      if (event.target.closest("button")) return;
      openMissingExperienceCommentById(row.dataset.missingExperienceId || row.getAttribute("data-missing-experience-id"));
    });
  });
}

function openMissingExperienceCommentById(id) {
  const change = getVisibleChanges().find((item) => item.id === id)
    || currentChanges.find((item) => item.id === id);
  if (!change) return false;
  if (!activeCommentPanel.hidden && activeCommentPanel.querySelector(`[data-change-id="${id}"]`)) return true;
  renderActiveCommentPanel(change);
  return true;
}

function renderMissingExperienceSidePanel(changes) {
  if (!missingExperiencePanel) return;
  const shouldShow = activePass === PASS_MISSING_EXPERIENCE
    && changes.length > 0
    && (!activeCommentPanel || activeCommentPanel.hidden);

  if (!shouldShow) {
    missingExperiencePanel.hidden = true;
    missingExperiencePanel.innerHTML = "";
    return;
  }

  missingExperiencePanel.hidden = false;
  missingExperiencePanel.innerHTML = `
    <div class="active-comment-heading">
      <h3>Missing Experience</h3>
    </div>
    <p class="side-panel-hint">Choose one item to review. It will open here next to the resume.</p>
    <div class="missing-experience-review-list">
      <strong>Missing experience to review</strong>
      <span class="missing-experience-rows">
        ${changes.map((change) => `
          <span class="missing-experience-row" data-missing-experience-id="${escapeHtml(change.id)}">
            ${renderResumeCommentMarker(change)}
            <button class="missing-experience-label-button" type="button" data-missing-experience-id="${escapeHtml(change.id)}">${escapeHtml(getMissingExperienceListLabel(change))}</button>
          </span>
        `).join("")}
      </span>
    </div>
  `;
  bindMissingExperiencePanel();
}

function getMissingExperienceListLabel(change) {
  const topic = missingExperienceDedupeTopic(change);
  const labels = {
    collaboration: "Collaboration",
    "research details": "Research details",
    patents: "Patents",
    publications: "Publications",
    phd: "PhD"
  };
  if (labels[topic]) return labels[topic];

  const direct = cleanConfirmedText(change?.missingTerm || "");
  if (direct && direct.length <= 34) return direct;
  const words = direct.split(/\s+/).filter(Boolean).slice(0, 4).join(" ");
  return words || "Missing experience";
}

function renderDonePreviewCallout(style) {
  if (countAllOpenChanges() > 0) return "";
  return `
    <span class="done-preview-callout">
      <strong>The updated resume preview is ready.</strong>
      It includes your accepted changes.
      <span class="done-preview-actions">
        <label class="preview-style-control">
          <span>Format</span>
          <select data-action="preview-export-style">
            <option value="ats" ${style === "ats" ? "selected" : ""}>ATS-friendly</option>
            <option value="designed" ${style === "designed" ? "selected" : ""}>Designed</option>
          </select>
        </label>
        <button class="preview-return-button done-preview-button" type="button" data-action="view-updated-preview">View Updated Preview</button>
        <button class="preview-return-button done-preview-button" type="button" data-action="export-pdf-inline">Export PDF</button>
        <button class="secondary-button done-preview-button" type="button" data-action="return-review">Return to Review</button>
      </span>
    </span>
  `;
}

function getDesignedPageBudgetNotice(text, style) {
  if (style !== "designed") return "";
  const plan = getDesignedPageBudgetPlan(text);
  if (!plan.overBudget || pageBudgetOverride) return "";

  return `
    <aside class="page-budget-notice" role="status">
      <strong>Page 1 is too full.</strong>
      <span>The layout is already using compact spacing, 11pt body text, the side column where it fits, and page two for publications, patents, and links.</span>
      <span>You can keep this longer resume, or ask AI for optional shortening suggestions. Nothing is removed automatically.</span>
      <span class="page-budget-actions">
        <button class="secondary-button" type="button" data-action="keep-longer-resume">Keep Longer Resume</button>
        <button class="primary-button" type="button" data-action="get-shortening-suggestions">Get Shortening Suggestions</button>
      </span>
    </aside>
  `;
}

function renderUnanchoredCommentList(changes) {
  if (!changes.length) return "";
  if (activePass === PASS_MISSING_EXPERIENCE) {
    return "";
  }
  return `
    <span class="unanchored-comment-list">
      <strong>Needs placement preview, no exact resume line yet:</strong>
      ${changes.map((change) => renderResumeCommentMarker(change)).join("")}
    </span>
  `;
}

function renderNumberedCommentPreview() {
  const text = normalizeFinalResumeText(finalResume.value.trim() || resumeInput.value.trim());
  if (!text) return;

  const style = exportStyleSelect.value;
  let resumeHtml = style === "designed" ? formatDesignedResumeForPrint(text) : formatResumeForPrint(text);
  let matchedCount = 0;
  const unmatchedChanges = [];
  const displayChanges = getOpenDisplayChanges();

  if (!displayChanges.length) {
    if (/missing essential fields/i.test(aiStatus.textContent || "")) {
      setAiStatus("All comments are done. The resume preview is ready.", "success");
    }
    renderMissingExperienceSidePanel([]);
    pdfPreview.classList.toggle("designed-template", style === "designed");
    pdfPreview.classList.toggle("ats-template", style !== "designed");
    pdfPreview.innerHTML = `
      <div class="preview-comment-banner">
        ${renderPreviewPassOverview()}
        <strong>All comments are done.</strong>
        No open comments remain in ${escapeHtml(getPassLabel(activePass))}.
        ${renderDonePreviewCallout(style)}
        ${renderOtherPassOpenNotice()}
        ${getDesignedPageBudgetNotice(text, style)}
      </div>
      ${resumeHtml}
    `;
    pdfPreviewPanel.hidden = false;
    bindPreviewPassButtons();
    return;
  }

  for (const change of displayChanges) {
    if (activePass === PASS_MISSING_EXPERIENCE && isMissingExperienceChange(change)) {
      unmatchedChanges.push(change);
      continue;
    }
    const marked = addCommentMarkerToHtml(resumeHtml, getCommentMarkerCandidates(change), change);
    resumeHtml = marked.html;
    if (marked.matched) {
      matchedCount += 1;
    } else {
      unmatchedChanges.push(change);
    }
  }

  pdfPreview.classList.toggle("designed-template", style === "designed");
  pdfPreview.classList.toggle("ats-template", style !== "designed");
  pdfPreview.innerHTML = `
    <div class="preview-comment-banner">
      ${renderPreviewPassOverview()}
      <strong>Numbered resume comments:</strong>
      ${escapeHtml(getPassLabel(activePass))}.
      Numbers are assigned in top-to-bottom resume order. Click Preview on a suggestion card to inspect the exact before/after change.
      ${renderCommentLegend()}
      ${renderOtherPassOpenNotice()}
      ${renderUnanchoredCommentList(unmatchedChanges)}
      ${unmatchedChanges.length ? `<span>Some comments are about missing or new information, so there is no existing resume line to mark yet. Use Preview to see where the change will go.</span>` : ""}
      ${getDesignedPageBudgetNotice(text, style)}
    </div>
    ${resumeHtml}
  `;
  pdfPreviewPanel.hidden = false;
  bindPreviewPassButtons();
  renderMissingExperienceSidePanel(unmatchedChanges);
  pdfPreview.querySelectorAll(".resume-comment-marker").forEach((marker) => {
    marker.addEventListener("click", () => {
      const change = getVisibleChanges().find((item) => item.id === marker.dataset.commentId);
      renderActiveCommentPanel(change);
    });
  });
}

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

const resumeTextEditor = window.RoleFitResumeTextEditor.create({
  findSectionRange,
  getResumeSectionAliases,
  looksLikeInstructionOnly,
  normalizeSectionLabel,
  titleCase
});

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

const resumeDocumentParser = window.RoleFitResumeDocument.create({
  extractYears,
  isDegreeLine,
  looksLikeCustomSectionHeaderLine,
  normalize,
  normalizeSectionLabel,
  removeResumePlaceholders,
  removeYears,
  stripLeadingBullet,
  titleCase
});

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
    prose ? `<p>${escapeHtml(prose)}</p>` : "",
    bullets.length ? `<ul>${bullets.map((line) => `<li>${escapeHtml(line.replace(/^[-*•]\s*/, ""))}</li>`).join("")}</ul>` : ""
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
      html += `<li>${escapeHtml(line.replace(/^[-*•]\s*/, ""))}</li>`;
    } else {
      closeList();
      html += `<p>${escapeHtml(line)}</p>`;
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
  return /\b(University|Institute|Research|Media|Inc|Ltd|LLC|Company|School|College)\b/i.test(line);
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

    const startsNew = !current || (year && !looksLikeVenueLine) || (!year && current.link);

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
      current = {
        degree: removeYears(clean),
        institution: "",
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

function previewChangeOnResume(change, editBox, placementToPreview = "") {
  renderMissingExperienceSidePanel([]);
  const baseText = finalResume.value.trim() || resumeInput.value.trim();
  if (!baseText) {
    setAiStatus("Add a resume before previewing suggestions.", "error");
    return;
  }

  const selectedPlacement = placementToPreview && getSelectedPlacements(change).includes(placementToPreview)
    ? placementToPreview
    : "";
  if (selectedPlacement) {
    ensurePlacementConfirmationMode(change, selectedPlacement);
  }
  const previewChange = {
    ...change,
    ...(selectedPlacement ? {
      placement: selectedPlacement,
      placements: [selectedPlacement],
      acceptedPlacements: [],
      section: getPlacementSectionTitle(selectedPlacement, change)
    } : {}),
    suggestedText: editBox
      ? buildSpellingSuggestedLine(change, editBox.value.trim())
      : change.suggestedText
  };
  if ((selectedPlacement || getConfirmedPlacement(previewChange)) === "experience") {
    captureExperienceSelectionSnapshot(change, baseText);
    Object.assign(previewChange, {
      experienceTargetTitle: change.experienceTargetTitle,
      experienceTargetCompany: change.experienceTargetCompany,
      experienceTargetYears: change.experienceTargetYears,
      experienceOriginalBullet: change.experienceOriginalBullet
    });
  } else if ((selectedPlacement || getConfirmedPlacement(previewChange)) === "projects") {
    captureProjectSelectionSnapshot(change, baseText);
    Object.assign(previewChange, {
      projectTargetName: change.projectTargetName,
      projectTargetYear: change.projectTargetYear,
      projectOriginalBullet: change.projectOriginalBullet
    });
  } else if ((selectedPlacement || getConfirmedPlacement(previewChange)) === "education") {
    captureEducationSelectionSnapshot(change, baseText);
    Object.assign(previewChange, {
      educationTargetDegree: change.educationTargetDegree,
      educationTargetInstitution: change.educationTargetInstitution,
      educationTargetYears: change.educationTargetYears,
      educationOriginalDetail: change.educationOriginalDetail
    });
  }
  if (editBox) {
    change.suggestedText = previewChange.suggestedText;
    change.userDraftText = previewChange.suggestedText;
  }
  let placementWarning = "";
  if (isPlacementConfirmation(previewChange)) {
    if (!getSelectedPlacements(change).length && previewChange.suggestedText) {
      change.placement = inferConfirmedPlacement(previewChange, previewChange.suggestedText);
      change.placements = [change.placement];
      previewChange.placement = change.placement;
      previewChange.placements = change.placements;
    }
    const validation = validateConfirmedPlacement(previewChange, baseText);
    if (validation.error) {
      showChangeValidationError(change, validation.error, selectedPlacement || (getSelectedPlacements(change).length === 1 ? getSelectedPlacements(change)[0] : ""));
      renderActiveCommentPanel(change);
      return;
    }
    clearChangeValidationError(change);
    change.previewedKey = getPreviewRequirementKey(previewChange);
    if (selectedPlacement) {
      change.previewedPlacementKeys = {
        ...(change.previewedPlacementKeys || {}),
        [selectedPlacement]: getPlacementPreviewKey(change, selectedPlacement)
      };
    } else {
      for (const placement of getPreviewablePlacements(change)) {
        change.previewedPlacementKeys = {
          ...(change.previewedPlacementKeys || {}),
          [placement]: getPlacementPreviewKey(change, placement)
        };
      }
    }
    placementWarning = validation.warning || "";
  }
  const shouldPreviewRemoval = isRemovalPreview(previewChange);
  const appliedText = applySingleChange(baseText, previewChange);
  const text = normalizeFinalResumeText(appliedText);
  if (!shouldPreviewRemoval && !isPlacementConfirmation(previewChange) && isConcreteChangeNoOpForResume(baseText, previewChange)) {
    showChangeValidationError(change, "This change could not be matched to the current resume, so there is no reliable preview.");
    renderActiveCommentPanel(change);
    return;
  }
  const spellingDidChangeText = previewChange.type !== "spelling_check"
    || normalizeFinalResumeText(baseText) !== text;
  const style = exportStyleSelect.value;
  const resumeHtml = style === "designed" ? formatDesignedResumeForPrint(text) : formatResumeForPrint(text);
  const candidates = getPreviewHighlightCandidates(previewChange, editBox);
  const experiencePlacementHighlight = highlightExperiencePlacementInHtml(
    resumeHtml,
    previewChange,
    baseText,
    text
  );
  let highlighted = !spellingDidChangeText
    ? { html: resumeHtml, matched: "" }
    : shouldPreviewRemoval
      ? highlightRemovalResultContextInHtml(resumeHtml, previewChange)
    : experiencePlacementHighlight.handled
      ? experiencePlacementHighlight
    : shouldHighlightInsertedSection(previewChange, baseText)
    ? highlightSectionInHtml(resumeHtml, previewChange.section)
    : shouldHighlightInsertedCandidateSet(previewChange)
      ? highlightAllMatchesInSectionHtml(resumeHtml, candidates, previewChange.section)
      : highlightChangeInHtml(resumeHtml, candidates, previewChange);
  const existingSkillsPlacement = isPlacementConfirmation(previewChange)
    && getConfirmedPlacement(previewChange) === "skills"
    && hasSection(baseText, ["skills", "technical skills"]);
  const isStructuredEducationRewrite = canonicalSectionTitle(previewChange.section) === "education"
    && previewChange.mode === "replace"
    && getFirstNonEmptyLine(previewChange.originalText)
    && getFirstNonEmptyLine(previewChange.suggestedText);
  if (
    !highlighted.matched
    && !experiencePlacementHighlight.handled
    && !isRemovalPreview(previewChange)
    && (shouldFallbackToSectionHighlight(previewChange) || isStructuredEducationRewrite)
    && !existingSkillsPlacement
  ) {
    highlighted = highlightSectionInHtml(resumeHtml, previewChange.section);
  }

  pdfPreview.classList.toggle("designed-template", style === "designed");
  pdfPreview.classList.toggle("ats-template", style !== "designed");
  pdfPreview.innerHTML = `
    <div class="preview-comment-banner ${escapeHtml(getSuggestionKind(change))}">
      ${renderPreviewPassOverview()}
      <strong>${escapeHtml(getSuggestionKindLabel(getSuggestionKind(change)))}:</strong>
      ${escapeHtml(getChangePointLabel(change))}
      ${highlighted.matched ? "" : `<span>No exact matching resume text was found.</span>`}
      ${renderRemainingOpenCommentsNotice(change)}
      <button class="preview-return-button" type="button" data-action="show-numbered-comments">Return to Review</button>
      <button class="secondary-button" type="button" data-action="return-review">Back to Comment</button>
    </div>
    ${highlighted.html}
  `;
  pdfPreviewPanel.hidden = false;
  bindPreviewPassButtons();
  renderActiveCommentPanel(change);
  pdfPreview.querySelector("[data-action='show-numbered-comments']")?.addEventListener("click", () => {
    renderNumberedCommentPreview();
    renderActiveCommentPanel(change);
  });
  pdfPreview.querySelector("[data-action='return-review']")?.addEventListener("click", () => {
    const target = activeCommentPanel && !activeCommentPanel.hidden ? activeCommentPanel : changeCards;
    target.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  const target = pdfPreview.querySelector(".resume-preview-highlight") || pdfPreview.querySelector(".resume-preview-section-highlight") || pdfPreviewPanel;
  target.scrollIntoView({ behavior: "smooth", block: "center" });
  setAiStatus(
    placementWarning
      ? placementWarning
      : highlighted.matched
      ? "Preview opened and highlighted the related resume area."
      : "Preview opened. This suggestion may be an insertion, so there may be no existing text to highlight.",
    highlighted.matched ? "success" : "neutral"
  );
}

function shouldHighlightInsertedSection(change, baseText) {
  if (!change?.requiresUserWording || !isPlacementConfirmation(change)) return false;
  const placement = getConfirmedPlacement(change);

  if (placement === "skills") {
    return !hasSection(baseText, ["skills", "technical skills"]);
  }

  if (placement === "projects") {
    return getProjectAction(change) === "new" && !hasSection(baseText, ["selected projects", "projects"]);
  }

  if (placement === "certifications") {
    return !hasSection(baseText, ["certifications"]);
  }

  if (placement === "other") {
    const title = normalizeCustomSectionTitle(change.otherSectionName || "");
    if (!title) return false;
    if (isVolunteerSectionTitle(title)) {
      return !hasSection(baseText, ["volunteer experience", "volunteer work", "volunteering"]);
    }
    return !hasSection(baseText, [title]);
  }

  return false;
}

function titleCase(text) {
  return text
    .toLowerCase()
    .split(" ")
    .map((word) => word ? word[0].toUpperCase() + word.slice(1) : "")
    .join(" ");
}

function getPrintDocumentTitle(text) {
  const parsed = parseResumeText(text);
  const name = parsed.headerLines[0] || "Resume";
  return `${name.replace(/\s+/g, " ").trim()} Resume`;
}

function exportResumePdf() {
  try {
    const text = ensureFinalResumeText();
    const style = exportStyleSelect.value;
    const pagePlan = style === "designed" ? getDesignedPageBudgetPlan(text) : null;
    if (pagePlan?.overBudget && !pageBudgetOverride) {
      renderNumberedCommentPreview();
      pdfPreviewPanel.hidden = false;
      pdfPreviewPanel.scrollIntoView({ behavior: "smooth", block: "start" });
      setAiStatus("Page 1 is too full. Choose Keep Longer Resume or Get Shortening Suggestions before exporting.", "neutral");
      return;
    }
    const resumeHtml = style === "designed" ? formatDesignedResumeForPrint(text) : formatResumeForPrint(text);
    pdfPreview.classList.toggle("designed-template", style === "designed");
    pdfPreview.classList.toggle("ats-template", style !== "designed");
    pdfPreview.innerHTML = resumeHtml;
    pdfPreviewPanel.hidden = false;
    pdfPreviewPanel.scrollIntoView({ behavior: "smooth", block: "start" });
    const previousTitle = document.title;
    document.title = " ";
    window.addEventListener("afterprint", () => {
      document.title = previousTitle;
    }, { once: true });
    setTimeout(() => window.print(), 250);
  } catch (error) {
    alert(error.message || "Could not export the resume.");
  }
}

function updateCounts() {
  resumeCount.textContent = `${wordCount(resumeInput.value)} words`;
  jobCount.textContent = `${wordCount(jobInput.value)} words`;
}

function setUploadStatus(message, kind = "neutral") {
  resumeUploadStatus.textContent = message;
  resumeUploadStatus.dataset.kind = kind;
}

async function loadPdfJs() {
  if (pdfJsModule) return pdfJsModule;

  if (window.location.protocol === "file:") {
    throw new Error("PDF upload needs the local server. Run `node server.mjs` from the RoleFit_resume folder, then open http://127.0.0.1:8765/index.html.");
  }

  pdfJsModule = await import("../vendor/pdfjs/pdf.min.mjs");
  pdfJsModule.GlobalWorkerOptions.workerSrc = "vendor/pdfjs/pdf.worker.min.mjs";
  return pdfJsModule;
}

function normalizeExtractedPdfText(text) {
  return text
    .replace(/\r/g, "")
    .replace(/[•●▪■◦]/g, "-")
    .replace(/[\uE000-\uF8FF]/g, "")
    .replace(/^E\s+/gm, "")
    .replace(/^q\s+/gm, "")
    .replace(/^b\s+(?=[A-Z])/gim, "")
    .replace(/\bE\s{1,}ective\b/g, "Effective")
    .replace(/\bsigni\s+fi\s+cant\b/g, "significant")
    .replace(/\bsigni\s+ficant\b/g, "significant")
    .replace(/\bfi\s+([a-z])/g, "fi$1")
    .replace(/\s+-\s+/g, " - ")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function isDecorativePdfText(text) {
  return !/[A-Za-z0-9]/.test(text);
}

function getPdfItemBounds(item) {
  const [, , , , x, y] = item.transform;
  return {
    text: item.str.trim(),
    x,
    y,
    width: item.width || 0
  };
}

function groupPdfItemsIntoLines(items) {
  const sorted = [...items].sort((a, b) => {
    if (Math.abs(b.y - a.y) > 3) return b.y - a.y;
    return a.x - b.x;
  });
  const lines = [];

  for (const item of sorted) {
    let line = lines.find((candidate) => Math.abs(candidate.y - item.y) <= 3);

    if (!line) {
      line = { y: item.y, items: [] };
      lines.push(line);
    }

    line.items.push(item);
    line.y = (line.y * (line.items.length - 1) + item.y) / line.items.length;
  }

  return lines
    .sort((a, b) => b.y - a.y)
    .map((line) => {
      const ordered = line.items.sort((a, b) => a.x - b.x);
      return ordered.map((item) => item.text).join(" ").replace(/\s+/g, " ").trim();
    })
    .filter(Boolean);
}

function splitPdfItemsByColumn(items, pageWidth) {
  const rightColumnThreshold = pageWidth * 0.62;
  const rightItems = items.filter((item) => item.x >= rightColumnThreshold);
  const leftItems = items.filter((item) => item.x < rightColumnThreshold);
  const hasUsefulRightColumn = rightItems.length >= 8;

  if (!hasUsefulRightColumn) {
    return [items];
  }

  return [leftItems, rightItems].filter((column) => column.length);
}

function addResumeSectionBreaks(text) {
  const sectionPattern = /\b(STATEMENT|SUMMARY|PROFILE|EXPERIENCE|EDUCATION|PUBLICATIONS|PATENTS|STRENGTHS|ACHIEVEMENTS|SKILLS|LANGUAGES|CERTIFICATIONS|PROJECTS)\b/g;
  return text
    .split("\n")
    .map((line) => {
      if (/^[A-Z][A-Z\s/&-]{2,}$/.test(line.trim())) return line;
      return line.replace(sectionPattern, "\n$1\n");
    })
    .join("\n")
    .replace(/\n{3,}/g, "\n\n");
}

async function extractPdfText(file) {
  const pdfjs = await loadPdfJs();
  const buffer = await file.arrayBuffer();
  const documentTask = pdfjs.getDocument({ data: buffer });
  const pdf = await documentTask.promise;
  const pageTexts = [];

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const viewport = page.getViewport({ scale: 1 });
    const textContent = await page.getTextContent();
    const items = textContent.items
      .map(getPdfItemBounds)
      .filter((item) => item.text && !isDecorativePdfText(item.text));
    const columnTexts = splitPdfItemsByColumn(items, viewport.width)
      .map((columnItems) => groupPdfItemsIntoLines(columnItems).join("\n"))
      .filter(Boolean);
    pageTexts.push(columnTexts.join("\n\n"));
  }

  return normalizeExtractedPdfText(addResumeSectionBreaks(pageTexts.join("\n\n")));
}

async function extractTextFile(file) {
  return normalizeExtractedPdfText(await file.text());
}

async function handleResumeFileUpload(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  try {
    setUploadStatus(`Reading ${file.name}...`, "neutral");

    const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
    const isText = file.type === "text/plain" || file.name.toLowerCase().endsWith(".txt");

    if (!isPdf && !isText) {
      throw new Error("Please upload a PDF or plain text file.");
    }

    const extractedText = isPdf ? await extractPdfText(file) : await extractTextFile(file);

    if (!extractedText || wordCount(extractedText) < 20) {
      throw new Error("I could not extract enough text. Try copying from the PDF and pasting manually.");
    }

    resumeInput.value = extractedText;
    updateCounts();
    setUploadStatus(`Loaded ${file.name}. Review the extracted text before analyzing.`, "success");
  } catch (error) {
    setUploadStatus(error.message || "Could not read this file.", "error");
  } finally {
    event.target.value = "";
  }
}

function loadSample() {
  resumeInput.value = sampleResume.trim();
  jobInput.value = sampleJobDescription.trim();
  updateCounts();
}

function clearReviewState() {
  currentChanges = [];
  acceptanceSequence = 0;
  dismissedChangeKeys.clear();
  completedPasses.clear();
  loadingPasses.clear();
  pageBudgetOverride = false;
  latestAiAnalysis = null;
  latestAiJobDescription = "";
  latestAiBaselineResume = "";
  activePass = PASS_CLEANUP;
  changeCards.innerHTML = `<p class="empty-state">Change cards will appear here. Each one needs your decision.</p>`;
  analysisOutput.innerHTML = `<p class="empty-state">Paste or upload a resume, then run the analysis. Add a job description only for role-specific tailoring.</p>`;
  matchScore.textContent = "--";
  changeCount.textContent = "0 pending";
  pdfPreview.innerHTML = "";
  pdfPreviewPanel.hidden = true;
  if (missingExperiencePanel) {
    missingExperiencePanel.innerHTML = "";
    missingExperiencePanel.hidden = true;
  }
  activeCommentPanel.hidden = true;
  updatePassUi();
}

function startNewResume() {
  resumeInput.value = "";
  finalResume.value = "";
  setUploadStatus("", "neutral");
  setAiStatus("", "neutral");
  clearReviewState();
  updateCounts();
}

function clearJobRole() {
  jobInput.value = "";
  setAiStatus("", "neutral");
  updateCounts();
}

function analyze() {
  const resumeText = getWorkingResumeText();
  const jobText = jobInput.value.trim();

  if (!resumeText) {
    analysisOutput.innerHTML = `<p class="empty-state">Please paste or upload a resume.</p>`;
    changeCards.innerHTML = `<p class="empty-state">No changes suggested yet.</p>`;
    matchScore.textContent = "--";
    changeCount.textContent = "0 pending";
    return;
  }

  const analysis = buildJobAnalysis(resumeText, jobText);
  latestAiAnalysis = null;
  latestAiJobDescription = "";
  latestAiBaselineResume = "";
  refreshResumeCheckPass(resumeText);
  renderAnalysis(analysis);
}

resumeInput.addEventListener("input", () => {
  pageBudgetOverride = false;
  updateCounts();
});
finalResume.addEventListener("input", refreshAiAnalysisForCurrentResume);
resumeFileInput.addEventListener("change", handleResumeFileUpload);
jobInput.addEventListener("input", updateCounts);
finalResume.addEventListener("input", () => {
  pageBudgetOverride = false;
});
analyzeBtn.addEventListener("click", analyze);
analyzeAiBtn.addEventListener("click", analyzeWithAi);
cleanupPassBtn?.addEventListener("click", () => setActivePass(PASS_CLEANUP));
suggestionsPassBtn?.addEventListener("click", () => setActivePass(PASS_SUGGESTIONS));
missingExperiencePassBtn?.addEventListener("click", () => setActivePass(PASS_MISSING_EXPERIENCE));
loadSampleBtn.addEventListener("click", loadSample);
newResumeBtn?.addEventListener("click", startNewResume);
clearJobBtn?.addEventListener("click", clearJobRole);
exportPdfBtn.addEventListener("click", exportResumePdf);
copyFinalBtn.addEventListener("click", async () => {
  if (!finalResume.value.trim()) return;
  await navigator.clipboard.writeText(finalResume.value);
  copyFinalBtn.textContent = "Copied";
  setTimeout(() => {
    copyFinalBtn.textContent = "Copy";
  }, 1200);
});

if (window.__ROLEFIT_TEST__) {
  window.__roleFitTest = {
    getCurrentChanges: () => currentChanges,
    setCurrentChanges: (changes) => {
      currentChanges = changes;
      acceptanceSequence = Math.max(
        acceptanceSequence,
        ...changes.map((change) => Number.isFinite(change.acceptanceSequence) ? change.acceptanceSequence : 0)
      );
    },
    resetState: () => {
      currentChanges = [];
      acceptanceSequence = 0;
      dismissedChangeKeys.clear();
      completedPasses.clear();
      loadingPasses.clear();
      pageBudgetOverride = false;
      latestAiAnalysis = null;
      latestAiJobDescription = "";
      latestAiBaselineResume = "";
      activePass = PASS_CLEANUP;
    },
    setActivePass,
    getActivePass: () => activePass,
    setPassChanges,
    markPassesLoading,
    clearPassesLoading,
    acceptChangeFromCard,
    acceptPlacementFromCard,
    rejectChangeFromCard,
    previewChangeOnResume,
    refreshResumeCheckPass,
    renderChanges,
    renderNumberedCommentPreview,
    openChangeInCommentPanel: (id) => {
      const change = currentChanges.find((item) => item.id === id);
      if (!change) return false;
      renderActiveCommentPanel(change);
      return true;
    },
    openMissingExperienceCommentById,
    ensureFinalResumeText,
    getDesignedPageBudgetPlan,
    buildLocalSuggestionFallbackCards,
    buildMissingExperienceCardsFromAiAnalysis,
    buildMissingExperienceCardsFromRequirements,
    buildRoleCoverageState,
    renderAiAnalysis,
    refreshAiAnalysisForCurrentResume,
    retainOnlyCanonicalMissingExperienceCards,
    isGeneralResumeSuggestionAllowed,
    passes: {
      cleanup: PASS_CLEANUP,
      suggestions: PASS_SUGGESTIONS,
      missingExperience: PASS_MISSING_EXPERIENCE
    }
  };
}

updateCounts();
