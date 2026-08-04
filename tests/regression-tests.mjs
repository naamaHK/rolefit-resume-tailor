import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

function stripTags(html) {
  return String(html || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function makeElement() {
  return {
    value: "",
    textContent: "",
    innerHTML: "",
    hidden: false,
    dataset: {},
    classList: {
      toggle() {},
      add() {},
      remove() {}
    },
    setAttribute() {},
    addEventListener() {},
    scrollIntoView() {},
    querySelector() {
      return makeElement();
    },
    querySelectorAll() {
      return [];
    }
  };
}

async function loadApp() {
  const elements = new Map();
  const context = {
    console,
    setTimeout,
    clearTimeout,
    alert(message) {
      throw new Error(`Unexpected alert: ${message}`);
    },
    navigator: {
      clipboard: {
        async writeText() {}
      }
    },
    window: {
      __ROLEFIT_TEST__: true,
      location: { protocol: "http:" },
      addEventListener() {},
      print() {}
    },
    document: {
      title: "RoleFit",
      querySelector(selector) {
        if (!elements.has(selector)) elements.set(selector, makeElement());
        return elements.get(selector);
      },
      createElement(tagName) {
        if (tagName !== "template") return makeElement();
        return {
          _html: "",
          content: { textContent: "" },
          set innerHTML(value) {
            this._html = value;
            this.content.textContent = stripTags(value);
          },
          get innerHTML() {
            return this._html;
          }
        };
      }
    }
  };
  context.window.document = context.document;
  vm.createContext(context);
  const documentParserSource = await readFile(new URL("../src/resume/document-parser.js", import.meta.url), "utf8");
  vm.runInContext(documentParserSource, context, { filename: "src/resume/document-parser.js" });
  const experienceParserSource = await readFile(new URL("../src/resume/experience-parser.js", import.meta.url), "utf8");
  vm.runInContext(experienceParserSource, context, { filename: "src/resume/experience-parser.js" });
  const placementTargetsSource = await readFile(new URL("../src/resume/placement-targets.js", import.meta.url), "utf8");
  vm.runInContext(placementTargetsSource, context, { filename: "src/resume/placement-targets.js" });
  const sectionInserterSource = await readFile(new URL("../src/resume/section-inserter.js", import.meta.url), "utf8");
  vm.runInContext(sectionInserterSource, context, { filename: "src/resume/section-inserter.js" });
  const textEditorSource = await readFile(new URL("../src/resume/text-editor.js", import.meta.url), "utf8");
  vm.runInContext(textEditorSource, context, { filename: "src/resume/text-editor.js" });
  const previewHighlighterSource = await readFile(new URL("../src/resume/preview-highlighter.js", import.meta.url), "utf8");
  vm.runInContext(previewHighlighterSource, context, { filename: "src/resume/preview-highlighter.js" });
  const roleRequirementsSource = await readFile(new URL("../src/resume/role-requirements.js", import.meta.url), "utf8");
  vm.runInContext(roleRequirementsSource, context, { filename: "src/resume/role-requirements.js" });
  const missingExperienceSource = await readFile(new URL("../src/resume/missing-experience.js", import.meta.url), "utf8");
  vm.runInContext(missingExperienceSource, context, { filename: "src/resume/missing-experience.js" });
  const placementFlowSource = await readFile(new URL("../src/resume/placement-flow.js", import.meta.url), "utf8");
  vm.runInContext(placementFlowSource, context, { filename: "src/resume/placement-flow.js" });
  const previewTargetSource = await readFile(new URL("../src/resume/preview-target.js", import.meta.url), "utf8");
  vm.runInContext(previewTargetSource, context, { filename: "src/resume/preview-target.js" });
  const appSources = [
    "../src/app.js",
    "../src/resume/analysis-heuristics.js",
    "../src/resume/ai-analysis.js",
    "../src/resume/review-controller.js",
    "../src/resume/change-cards.js",
    "../src/resume/resume-preview.js",
    "../src/resume/placement-editor.js",
    "../src/resume/print-renderer.js",
    "../src/app-bootstrap.js",
    "../src/app-controller.js"
  ];
  for (const sourcePath of appSources) {
    const source = await readFile(new URL(sourcePath, import.meta.url), "utf8");
    vm.runInContext(source, context, { filename: sourcePath.slice(3) });
  }
  return { context, elements };
}

function ids(cards) {
  return cards.map((card) => card.id);
}

const { context, elements } = await loadApp();

const resumeMissingName = `050-555-0198 alex.morgan@example.com

EXPERIENCE
Lead Data Analyst 2022
Northstar Research

EDUCATION
M.Sc. in Data Science 2013-2016
Northbridge Institute`;

assert.equal(
  JSON.stringify(ids(context.collectMissingHeaderQuestions(resumeMissingName))),
  JSON.stringify(["missing-header-name-1"]),
  "missing header check should ask for name when phone/email are present"
);

const resumeMissingAllHeaderFields = `EXPERIENCE
Lead Data Analyst
Northstar Research

EDUCATION
M.Sc. in Data Science
Northbridge Institute`;

assert.equal(
  JSON.stringify(ids(context.collectMissingHeaderQuestions(resumeMissingAllHeaderFields))),
  JSON.stringify(["missing-header-name-1", "missing-header-phone-2", "missing-header-email-3"]),
  "missing header check should ask for name, phone, and email in stable order"
);

const resumeMissingExperienceYear = `ALEX MORGAN
050-555-0198 alex.morgan@example.com

EXPERIENCE
Lead Data Analyst
Northstar Research
- Built customer analytics workflows.

EDUCATION
M.Sc. in Data Science 2013-2016
Northbridge Institute`;

const dateCards = context.collectMissingDateQuestions(resumeMissingExperienceYear);
assert.equal(dateCards.length, 1, "experience with no year should produce one date card");
assert.equal(dateCards[0].originalText, "Lead Data Analyst");

const datedResume = context.applySingleChange(resumeMissingExperienceYear, {
  ...dateCards[0],
  suggestedText: "2022"
});
assert.match(datedResume, /Lead Data Analyst 2022/);
assert.equal(
  context.collectMissingDateQuestions(datedResume).filter((card) => card.originalText === "Lead Data Analyst").length,
  0,
  "after adding year, the same experience entry should not be asked again"
);

const wronglyOrderedResume = `ALEX MORGAN
050-555-0198 alex.morgan@example.com

PROFESSIONAL SUMMARY
Data analyst with experience building reporting workflows.

EDUCATION
M.Sc. in Data Science 2018-2020
Northbridge Institute

EXPERIENCE
Lead Data Analyst 2022-Present
Northstar Research
- Built customer analytics workflows.

SKILLS
SQL, Python`;
const orderCard = context.collectResumeCheckChanges(wronglyOrderedResume)
  .find((card) => card.id === "resume-order-education");
assert.ok(orderCard, "Resume Check should detect Education before Experience");
const reorderedResume = context.applySingleChange(wronglyOrderedResume, orderCard);
assert.ok(
  reorderedResume.indexOf("EXPERIENCE") < reorderedResume.indexOf("EDUCATION"),
  "accepting the Resume Check reorder card should restore the core section order"
);

const fixtureTypos = context.collectResumeCheckChanges(`ALEX MORGAN
050-555-0198 alex.morgan@example.com

PROFESSIONAL SUMMARY
Engineer who maintaned services and collaberated on architechture monitering.

EXPERIENCE
Software Engineer 2022-Present
Northstar Research
- Built APIs.

EDUCATION
B.Sc. Computer Science 2018-2022
Northbridge Institute

SKILLS
Java`);
assert.equal(
  JSON.stringify(fixtureTypos.filter((card) => card.type === "spelling_check").map((card) => card.spellingBefore).sort()),
  JSON.stringify(["architechture", "collaberated", "maintaned", "monitering"]),
  "Resume Check should surface the fixture spelling repairs as separate cards"
);

const resumeMissingCompany = `ALEX MORGAN
050-555-0198 alex.morgan@example.com

EXPERIENCE
Lead Data Analyst 2017 2024
- Built customer analytics workflows.

EDUCATION
M.Sc. in Data Science 2013-2016
Northbridge Institute`;
const missingCompanyCard = context.collectMissingRequiredFieldQuestions(resumeMissingCompany)
  .find((card) => card.requiredField === "company");
assert.ok(missingCompanyCard, "experience entry missing a company should produce a company card");
const companyInsertedResume = context.applySingleChange(context.normalizeFinalResumeText(resumeMissingCompany), {
  ...missingCompanyCard,
  suggestedText: "Northstar Research"
});
assert.match(
  companyInsertedResume,
  /Lead Data Analyst 2017 - 2024\nNorthstar Research\n- Built customer analytics workflows\./,
  "missing company should insert under the matching role even after date normalization"
);

const flattenedCompanyResume = `ALEX MORGAN
050-555-0198 alex.morgan@example.com

EXPERIENCE
Software Engineering Intern 2015 Cedar Research Built internal data tools for analytics workflows.

EDUCATION
M.Sc. in Data Science 2013-2016
Northbridge Institute`;
const cedarCompanyChange = {
  ...missingCompanyCard,
  id: "missing-cedar-company",
  section: "Experience",
  originalText: "Software Engineering Intern 2015",
  entryLabel: "Software Engineering Intern 2015",
  suggestedText: "Cedar Research",
  requiredField: "company",
  status: "pending"
};
const cedarInsertedResume = context.applySingleChange(flattenedCompanyResume, cedarCompanyChange);
assert.match(
  cedarInsertedResume,
  /Software Engineering Intern 2015\nCedar Research\nBuilt internal data tools for analytics workflows/,
  "missing company should split a PDF-flattened role/company/details line when saving the workplace"
);

const educationDateCard = context.collectMissingDateQuestions(`ALEX MORGAN
050-555-0198 alex.morgan@example.com

EXPERIENCE
Lead Data Analyst 2022
Northstar Research

EDUCATION
M.Sc. in Data Science with a capstone in Applied Analytics
Northbridge Institute`)[0];
const educationHtml = context.formatResumeForPrint(`ALEX MORGAN
050-555-0198 alex.morgan@example.com

EXPERIENCE
Lead Data Analyst 2022
Northstar Research

EDUCATION
M.Sc. in Data Science with a capstone in Applied Analytics
Northbridge Institute`);
educationDateCard.commentNumber = 2;
const markedEducation = context.addCommentMarkerToHtml(
  educationHtml,
  context.getCommentMarkerCandidates(educationDateCard),
  educationDateCard
);
assert.ok(markedEducation.matched.includes("M.Sc."), "education missing-year marker should anchor on the degree line");

const publicationResume = `ALEX MORGAN
050-555-0198 alex.morgan@example.com

EXPERIENCE
Lead Data Analyst 2022
Northstar Research

EDUCATION
M.Sc. in Data Science 2013-2016
Northbridge Institute

PUBLICATIONS
Robust click-quality modeling in digital advertising
2021 International Conference on Information & Knowledge Management (CIKM)
J. Lee, A. Morgan, R. Patel
https://example.com/paper.pdf

Audience modeling for product recommendations
IEEE International Conference on Big Data
M. Chen, J. Lee, A. Morgan`;

const publicationDates = context.collectMissingDateQuestions(publicationResume);
assert.equal(
  publicationDates.some((card) => /Robust click-quality modeling/i.test(card.originalText)),
  false,
  "publication year on conference line should count for that publication"
);
assert.equal(
  publicationDates.some((card) => /Audience modeling/i.test(card.originalText)),
  true,
  "publication with no year anywhere should ask for year"
);

const missingAuthorsResume = `ALEX MORGAN
050-555-0198 alex.morgan@example.com

EXPERIENCE
Lead Data Analyst 2022
Northstar Research

EDUCATION
M.Sc. in Data Science 2013-2016
Northbridge Institute

PUBLICATIONS
Audience modeling for product recommendations 2024
IEEE International Conference on Big Data`;

assert.equal(
  context.collectMissingRequiredFieldQuestions(missingAuthorsResume).some((card) => card.requiredField === "authors"),
  true,
  "publication missing authors should ask for authors"
);

const missingPatentAuthorsResume = `ALEX MORGAN
050-555-0198 alex.morgan@example.com

EXPERIENCE
Lead Data Analyst 2022
Northstar Research

EDUCATION
M.Sc. in Data Science 2013-2016
Northbridge Institute

PATENTS
Conversion-based audience modeling for product recommendations (DPA) 2025`;

assert.equal(
  context.collectMissingRequiredFieldQuestions(missingPatentAuthorsResume).some((card) => /patents/i.test(card.section) && card.requiredField === "authors"),
  true,
  "patent missing authors should ask for authors"
);

const wrappedPatentResume = `ALEX MORGAN
050-555-0198 alex.morgan@example.com

EXPERIENCE
Lead Data Analyst 2022
Northstar Research

EDUCATION
M.Sc. in Data Science 2013-2016
Northbridge Institute

PATENTS
Conversion-based audience modeling for Dynamic- 2025
Product-Ads (DPA)
Privacy-aware bid optimization`;

const wrappedPatentDateCards = context.collectMissingDateQuestions(wrappedPatentResume);
assert.equal(
  wrappedPatentDateCards.some((card) => /Conversion-based audience modeling/i.test(card.originalText)),
  false,
  "wrapped patent title with year on first line should not ask for a missing date"
);
assert.equal(
  wrappedPatentDateCards.some((card) => /Privacy-aware bid optimization/i.test(card.originalText)),
  true,
  "next patent without year should ask for a missing date"
);

const wrappedPatentRequiredCards = context.collectMissingRequiredFieldQuestions(wrappedPatentResume);
assert.equal(
  wrappedPatentRequiredCards.filter((card) => /patents/i.test(card.section) && card.requiredField === "authors").length,
  2,
  "each patent without authors should get its own missing-authors card"
);

const aiPublicationDateQuestion = context.normalizeAiQuestions([
  {
    question: "What are the publication years for the CIKM and IEEE Big Data papers?",
    why_it_matters: "Publication years are mandatory.",
    related_job_requirement: "Missing years for publications"
  }
]);
assert.equal(aiPublicationDateQuestion[0].section, "Publications");
assert.equal(
  context.prepareActionableChanges(publicationResume, aiPublicationDateQuestion).length,
  0,
  "AI date questions without exact original_text should not become vague confirmation cards"
);

const camelCaseAiCard = context.normalizeAiChangeCard({
  id: "camel-case-card",
  type: "rewrite",
  section: "Experience",
  originalText: "Built customer analytics workflows to improve audience segmentation workflows",
  suggestedText: "Built customer analytics workflows to improve audience segmentation workflows and optimize production models.",
  whyItHelps: "Uses stronger role language.",
  riskLevel: "low",
  supportLevel: "resume_supported"
}, 0);
assert.equal(camelCaseAiCard.originalText, "Built customer analytics workflows to improve audience segmentation workflows");
assert.equal(camelCaseAiCard.suggestedText, "Built customer analytics workflows to improve audience segmentation workflows and optimize production models.");
assert.equal(camelCaseAiCard.riskLevel, "low");
assert.equal(camelCaseAiCard.supportLevel, "resume_supported");

const camelCaseActionable = context.prepareActionableChanges(resumeMissingExperienceYear, [camelCaseAiCard]);
assert.equal(camelCaseActionable.length, 1, "camelCase AI cards should become actionable comments");
assert.equal(
  context.window.__roleFitTest.isGeneralResumeSuggestionAllowed(camelCaseAiCard),
  false,
  "general resume review should filter subjective role-language rewrites when no job description is provided"
);

const generalProgrammingQuestion = context.normalizeAiQuestions([
  {
    question: "What programming languages are you proficient in, and at what level?",
    why_it_matters: "This could strengthen the resume.",
    related_job_requirement: "Programming languages"
  }
])[0];
assert.equal(
  context.window.__roleFitTest.isGeneralResumeSuggestionAllowed(generalProgrammingQuestion),
  false,
  "general resume review without a job description should not ask for optional programming languages"
);

const splitProgrammingQuestions = context.normalizeAiQuestions([
  {
    question: "Do you have hands-on experience with Python, C++, and Java?",
    why_it_matters: "The job asks for these programming languages.",
    related_job_requirement: "Python, C++, Java"
  }
]);
assert.deepEqual(
  Array.from(splitProgrammingQuestions.map((question) => question.missingTerm)),
  ["C++", "Python", "Java"],
  "combined missing programming-language questions should split into one card per language"
);
assert.ok(
  splitProgrammingQuestions.every((question) => question.requiresUserWording && question.type === "ask_user"),
  "split programming-language questions should remain user-confirmation cards"
);

const combinedCLanguageQuestion = context.normalizeAiQuestions([
  {
    question: "Do you have hands-on experience with C/C++?",
    why_it_matters: "The job asks for C/C++.",
    related_job_requirement: "C/C++"
  }
]);
assert.deepEqual(
  Array.from(combinedCLanguageQuestion.map((question) => question.missingTerm)),
  ["C/C++"],
  "a combined C/C++ requirement should remain one clearly named confirmation topic"
);
assert.deepEqual(
  Array.from(context.prepareActionableChanges(resumeMissingExperienceYear, splitProgrammingQuestions).map((question) => question.missingTerm)),
  ["C++", "Python", "Java"],
  "dedupe should keep each split missing language as its own card"
);

const removalAndRoleQuestion = context.prepareActionableChanges(resumeMissingExperienceYear, [
  {
    id: "remove-cedar-intern",
    type: "remove_or_deemphasize",
    section: "Experience",
    originalText: "Software Engineering Intern 2015\nCedar Research",
    suggestedText: "Consider removing or deemphasizing this role.",
    promptText: "",
    whyItHelps: "Focus the resume on more relevant work.",
    evidence: "Resume content.",
    riskLevel: "low",
    supportLevel: "resume_supported",
    status: "pending",
    mode: "removeOrReplace"
  },
  {
    id: "ask-about-cedar-intern",
    type: "ask_user",
    section: "Missing Evidence",
    originalText: "",
    suggestedText: "",
    promptText: "Do you have real, resume-worthy experience with the Software Engineering Intern role?",
    whyItHelps: "This role lacks dates and specific contributions.",
    evidence: "The Software Engineering Intern role lacks dates and specific contributions.",
    missingTerm: "Software Engineering Intern",
    riskLevel: "high",
    supportLevel: "user_confirmation_needed",
    status: "pending",
    mode: "appendUserConfirmed",
    requiresUserWording: true
  }
]);
assert.equal(
  removalAndRoleQuestion.some((change) => change.id === "ask-about-cedar-intern"),
  false,
  "a vague missing-experience question must not follow up on the same role proposed for removal"
);

const analysisDerivedQuestions = context.window.__roleFitTest.buildMissingExperienceCardsFromAiAnalysis({
  resume_analysis: {
    weak_or_missing_signals: [
      "No direct RAG experience is visible.",
      "Production Python experience is not explicit."
    ]
  },
  tailoring_strategy: {
    do_not_claim_without_confirmation: ["LLM evaluation"]
  },
  final_checks: {
    keywords_missing: ["SQL"]
  }
});
assert.deepEqual(
  Array.from(analysisDerivedQuestions.map((question) => question.missingTerm)),
  ["RAG", "Python", "LLM evaluation", "SQL"],
  "weak signals and missing keywords from role analysis should become specific Missing Experience questions"
);
assert.ok(
  analysisDerivedQuestions.every((question) => question.requiresUserWording && question.type === "ask_user"),
  "analysis-derived missing signals should require explicit user confirmation"
);
const broadAnalysisNoteQuestions = context.window.__roleFitTest.buildMissingExperienceCardsFromAiAnalysis({
  resume_analysis: {
    weak_or_missing_signals: ["Seniority signal could be stronger in the summary."]
  }
});
assert.deepEqual(
  Array.from(broadAnalysisNoteQuestions),
  [],
  "broad analysis notes must not be converted into broken Missing Experience questions"
);
const roleDetailAnalysisQuestions = context.window.__roleFitTest.buildMissingExperienceCardsFromAiAnalysis({
  resume_analysis: {
    weak_or_missing_signals: [
      "Specific contributions in the Software Engineering Intern role are not detailed.",
      "The Software Engineering Intern role lacks dates and specific contributions.",
      "Perl experience is not explicit."
    ]
  },
  final_checks: {
    keywords_missing: ["Patents"]
  }
});
assert.deepEqual(
  Array.from(roleDetailAnalysisQuestions.map((question) => question.missingTerm)),
  ["Perl", "Patents"],
  "generic prose about elaborating an existing role must not become a truncated Missing Experience topic"
);
const analysisDerivedActionable = context.prepareActionableChanges(resumeMissingExperienceYear, analysisDerivedQuestions);
assert.ok(
  analysisDerivedActionable.every((question) =>
    (question.pass || context.window.__roleFitTest.passes.missingExperience) === context.window.__roleFitTest.passes.missingExperience
  ),
  "analysis-derived cards should be suitable for the Missing Experience pass"
);

const pythonMergeResume = `ALEX MORGAN
alex.morgan@example.com

STATEMENT
Lead Data Analyst with experience in machine learning and data science.

EXPERIENCE
Lead Data Analyst 2017 - 2024
Northstar Research
- Built production recommendation systems.
- Communicated and partnered with business and engineering teams to deliver reporting improvements.

EDUCATION
M.Sc. in Data Science 2013 - 2016
Northbridge Institute

PUBLICATIONS
Audience modeling 2023
A. Morgan, J. Lee

SKILLS
Machine Learning • Statistical Analysis • Big Data`;
const programmingJobDescription = `Knowledge of programming languages such as C/C++, Python, Java or Perl
Experience in patents or publications at top-tier peer-reviewed conferences or journals
PhD, or a Master's degree and experience in CS, CE, ML or related field research
Strong communication and collaboration skills`;
const partialModelMissingCards = ["C/C++", "Java", "Perl", "Patents"].map((term, index) => ({
  id: `partial-model-missing-${index}`,
  type: "ask_user",
  section: "Missing Evidence",
  originalText: "",
  suggestedText: "",
  promptText: `Do you have real resume-worthy experience with ${term}?`,
  whyItHelps: "The job description asks for this requirement.",
  evidence: term,
  riskLevel: "high",
  supportLevel: "user_confirmation_needed",
  status: "pending",
  mode: "appendUserConfirmed",
  missingTerm: term,
  requiresUserWording: true
}));
const mergedLocalMissingCards = context.mergeLocallyDetectedMissingExperience(
  pythonMergeResume,
  programmingJobDescription,
  context.prepareActionableChanges(pythonMergeResume, partialModelMissingCards)
);
assert.deepEqual(
  Array.from(mergedLocalMissingCards.map((change) => change.missingTerm)),
  ["C/C++", "Java", "Perl", "Patents", "Python"],
  "locally detected Python must be merged when the model returns only a partial missing-experience list"
);

const canonicalRequirementsJob = `Description
- Knowledge of C/C++, Python, Java, and Perl
- Build personalization systems using Generative AI, LLMs, NLP, deep learning, and Spark`;
const canonicalRequirementsAnalysis = {
  job_analysis: {
    required_skills: [
      "C/C++",
      "Python",
      "Java",
      "Perl",
      "Job description: Description",
      "personalization",
      "Generative AI",
      "LLM",
      "NLP",
      "deep learning",
      "Spark"
    ]
  }
};
const canonicalMissingCards = context.window.__roleFitTest.buildMissingExperienceCardsFromRequirements(
  canonicalRequirementsAnalysis,
  pythonMergeResume,
  canonicalRequirementsJob
);
assert.deepEqual(
  Array.from(canonicalMissingCards.map((card) => card.missingTerm)),
  ["C/C++", "Python", "Java", "Perl", "personalization", "Generative AI", "LLM", "NLP", "deep learning", "Spark"],
  "Missing Experience must include every concrete uncovered requirement and reject job-description metadata"
);
assert.equal(
  canonicalMissingCards.some((card) => /job description|^description$/i.test(card.missingTerm)),
  false,
  "model metadata must never become a Missing Experience question"
);
const retainedCanonicalCards = context.window.__roleFitTest.retainOnlyCanonicalMissingExperienceCards([
  context.normalizeAiChangeCard({
    id: "model-cpp-question",
    type: "ask_user",
    section: "Missing Evidence",
    question: "Do you have experience with C++?",
    related_job_requirement: "C/C++",
    support_level: "user_confirmation_needed"
  }, 0),
  context.normalizeAiChangeCard({
    id: "model-metadata-question",
    type: "ask_user",
    section: "Missing Evidence",
    question: "Do you have experience with Description?",
    related_job_requirement: "Job description: Description",
    support_level: "user_confirmation_needed"
  }, 1)
], canonicalRequirementsAnalysis, pythonMergeResume, canonicalRequirementsJob);
assert.deepEqual(
  Array.from(retainedCanonicalCards.map((card) => card.id)),
  ["model-cpp-question"],
  "AI questions must be kept only when they map to a concrete currently-missing requirement"
);

const resumeWithPatentEvidence = `${resumeMissingExperienceYear}

PATENTS
Audience modeling 2023
A. Morgan, J. Lee`;
const duplicatePythonAndPatentQuestions = [
  context.normalizeAiChangeCard({
    id: "python-change-card",
    type: "ask_user",
    section: "Missing Evidence",
    question: "Do you have experience with Python?",
    related_job_requirement: "Python",
    support_level: "user_confirmation_needed"
  }, 0),
  ...context.normalizeAiQuestions([
    {
      id: "python-user-question",
      question: "Is your production work in Python?",
      related_job_requirement: "Python"
    }
  ], 1),
  ...context.window.__roleFitTest.buildMissingExperienceCardsFromAiAnalysis({
    resume_analysis: {
      weak_or_missing_signals: [
        "Production Python experience is not explicit.",
        "While publications are present, patents are not mentioned.",
        "Specific experience"
      ]
    },
    tailoring_strategy: {
      do_not_claim_without_confirmation: ["Experience with patents"]
    },
    final_checks: {
      keywords_missing: ["Patents"]
    }
  }, 2)
];
const dedupedPythonAndPatentQuestions = context.prepareActionableChanges(
  resumeWithPatentEvidence,
  duplicatePythonAndPatentQuestions
);
assert.deepEqual(
  Array.from(dedupedPythonAndPatentQuestions.map((question) => question.missingTerm)),
  ["Python"],
  "Missing Experience should keep one Python question and remove duplicate/generic patent questions already covered by the resume"
);
const uncoveredPatentQuestions = context.prepareActionableChanges(
  resumeMissingExperienceYear,
  duplicatePythonAndPatentQuestions
);
assert.deepEqual(
  Array.from(uncoveredPatentQuestions.map((question) => question.missingTerm)),
  ["Python", "Patents"],
  "Missing Experience should keep exactly one clean Patents question when patent evidence is genuinely absent"
);

const generalSkillAddition = context.normalizeAiChangeCard({
  id: "general-python-skill",
  type: "add_keyword",
  section: "Skills",
  suggested_text: "Python",
  why_it_helps: "Adds a technical skill.",
  support_level: "user_confirmation_needed",
  risk_level: "high"
}, 0);
assert.equal(
  context.window.__roleFitTest.isGeneralResumeSuggestionAllowed(generalSkillAddition),
  false,
  "general resume review should not add optional skill keywords unless a target job asks for them"
);

const generalSkillsRewriteAddingPython = context.normalizeAiChangeCard({
  id: "general-skills-python-rewrite",
  type: "rewrite",
  section: "Skills",
  original_text: "Machine Learning, Statistical Analysis",
  suggested_text: "Machine Learning, Statistical Analysis, Python",
  support_level: "resume_supported",
  risk_level: "low"
}, 0);
assert.equal(
  context.window.__roleFitTest.isGeneralResumeSuggestionAllowed(generalSkillsRewriteAddingPython),
  false,
  "general resume review should not smuggle new programming languages into a concrete rewrite"
);

const generalPhrasingRewrite = context.normalizeAiChangeCard({
  id: "general-phrasing-rewrite",
  type: "rewrite",
  section: "Experience",
  original_text: "Utilized data-driven methodologies to inform decision-making and strategy.",
  suggested_text: "Used data-driven methods to guide decisions and strategy.",
  why_it_helps: "Fixes inflated wording.",
  support_level: "resume_supported",
  risk_level: "low"
}, 0);
assert.equal(
  context.window.__roleFitTest.isGeneralResumeSuggestionAllowed(generalPhrasingRewrite),
  false,
  "general resume review should not allow grammar or phrasing polish without a job description"
);

const subjectiveGeneralRewrite = context.normalizeAiChangeCard({
  id: "subjective-general-rewrite",
  type: "rewrite",
  section: "Experience",
  original_text: "Built customer analytics workflows to improve audience segmentation workflows and optimize production machine learning models.",
  suggested_text: "Built customer analytics workflows, improving audience segmentation workflows and optimizing production machine learning models by designing and executing A/B tests.",
  why_it_helps: "This revision makes the bullet more action-oriented and incorporates A/B tests as a common data science methodology.",
  support_level: "resume_supported",
  risk_level: "low"
}, 0);
assert.equal(
  context.window.__roleFitTest.isGeneralResumeSuggestionAllowed(subjectiveGeneralRewrite),
  false,
  "general resume review should filter subjective action-oriented optimization comments when no job description is provided"
);

const subjectiveSummaryRewrite = context.normalizeAiChangeCard({
  id: "subjective-summary-rewrite",
  type: "rewrite",
  section: "Statement",
  original_text: "Experienced Lead Data Analyst with a strong track record of leading impactful projects in machine learning, big data, and recommendation systems.",
  suggested_text: "Lead Data Analyst with a proven track record of leading impactful projects in machine learning, big data, and recommendation systems. Expertise in advanced statistical analysis.",
  why_it_helps: "This rewrite makes the summary more concise and impactful for general resume improvement.",
  support_level: "resume_supported",
  risk_level: "low"
}, 0);
assert.equal(
  context.window.__roleFitTest.isGeneralResumeSuggestionAllowed(subjectiveSummaryRewrite),
  false,
  "general resume review should block subjective summary polish such as proven/expertise/impactful rewrites"
);

const spellingRewrite = context.normalizeAiChangeCard({
  id: "spelling-rewrite",
  type: "rewrite",
  section: "Experience",
  original_text: "Strong project managment experinece.",
  suggested_text: "Strong project management experience.",
  why_it_helps: "Fixes spelling mistakes.",
  support_level: "resume_supported",
  risk_level: "low"
}, 0);
assert.equal(
  context.window.__roleFitTest.isGeneralResumeSuggestionAllowed(spellingRewrite),
  true,
  "general resume review should allow spelling corrections"
);
assert.equal(
  context.prepareActionableChanges(resumeMissingExperienceYear, [spellingRewrite]).length,
  0,
  "AI spelling-only rewrites should be dropped because Resume Check owns typo fixes"
);

const fuzzySpellingOnlyRewrite = context.normalizeAiChangeCard({
  id: "fuzzy-spelling-rewrite",
  type: "rewrite",
  section: "Statement",
  original_text: "Experienced Lead Data Analyst with a strang track record.",
  suggested_text: "Experienced Lead Data Analyst with a strong track record.",
  why_it_helps: "Fixes a typo.",
  support_level: "resume_supported",
  risk_level: "low"
}, 0);
assert.equal(
  context.prepareActionableChanges(resumeMissingExperienceYear, [fuzzySpellingOnlyRewrite]).length,
  0,
  "AI typo rewrites based on fuzzy spelling fixes should not duplicate Resume Check spelling cards"
);

const broadAiRewriteOverlappingSpelling = context.normalizeAiChangeCard({
  id: "broad-ai-rewrite-overlapping-spelling",
  type: "rewrite",
  section: "Strengths",
  original_text: "E ective Communication and Business Understanding.",
  suggested_text: "Effective Communication and cross-functional business leadership.",
  why_it_helps: "Tailors this strength to the job.",
  support_level: "resume_supported",
  risk_level: "low"
}, 0);
assert.equal(
  context.prepareActionableChanges(resumeMissingExperienceYear, [broadAiRewriteOverlappingSpelling]).length,
  0,
  "AI rewrites that overlap a local spelling correction should not duplicate or recolor the Resume Check typo"
);

const dateStyleOnlyRewrite = context.normalizeAiChangeCard({
  id: "date-style-only",
  type: "rewrite",
  section: "Experience",
  original_text: "Course Assistant 2013 2016",
  suggested_text: "Course Assistant 2013 - 2016",
  why_it_helps: "Keeps date formatting consistent.",
  support_level: "resume_supported",
  risk_level: "low"
}, 0);
assert.equal(
  context.window.__roleFitTest.isGeneralResumeSuggestionAllowed(dateStyleOnlyRewrite),
  false,
  "date-style-only changes should be normalized automatically, not shown as approval comments"
);
assert.equal(
  context.prepareActionableChanges(resumeMissingExperienceYear, [dateStyleOnlyRewrite]).length,
  0,
  "date-style-only changes should be filtered from actionable comments in every review mode"
);

const educationFormattingRewrite = context.normalizeAiChangeCard({
  id: "education-formatting-only",
  type: "rewrite",
  section: "Education",
  original_text: `M.Sc. in Data Science with a capstone in Applied Analytics, 2013 2016
advised by Dr. Taylor Reed and Dr. Morgan Stone.
Northbridge Institute of Technology`,
  suggested_text: `M.Sc. in Data Science (Capstone: Applied Analytics) 2013 - 2016
Northbridge Institute of Technology`,
  why_it_helps: "Consolidates the education entry for better readability and standardizes date format.",
  support_level: "resume_supported",
  risk_level: "low"
}, 0);
assert.equal(
  context.prepareActionableChanges(resumeMissingExperienceYear, [educationFormattingRewrite]).length,
  0,
  "formatting-only education rewrites should not waste review comments"
);

const completedDegreeRemoval = context.normalizeAiChangeCard({
  id: "completed-degree-removal",
  type: "remove_or_deemphasize",
  section: "Education",
  original_text: `B.Sc. in Statistics. 2009 - 2013
Northbridge University`,
  suggested_text: "",
  why_it_helps: "Removes the B.Sc. in favor of the more relevant M.Sc.",
  support_level: "resume_supported",
  risk_level: "low"
}, 0);
assert.equal(
  context.prepareActionableChanges(resumeMissingExperienceYear, [completedDegreeRemoval]).length,
  0,
  "completed degree entries must not be removed merely because a higher degree is present"
);

const mislabeledRemoveCard = context.normalizeAiChangeCard({
  id: "mislabeled-remove",
  type: "remove_or_deemphasize",
  section: "Experience",
  original_text: "Course Assistant 2013 2016",
  suggested_text: "Course Assistant 2013 - 2016",
  support_level: "resume_supported",
  risk_level: "low"
}, 0);
assert.equal(mislabeledRemoveCard.type, "rewrite", "concrete before/after cards should not stay labeled as remove/deemphasize");
assert.equal(mislabeledRemoveCard.mode, "replace");

assert.match(
  context.normalizeFinalResumeText(`ALEX

EXPERIENCE
Course Assistant 2013 2016
Northbridge Institute`),
  /Course Assistant 2013 - 2016/,
  "year ranges extracted from PDFs should normalize to YYYY - YYYY"
);

assert.match(
  context.normalizeFinalResumeText(`ALEX

EXPERIENCE
Software Engineering Intern, Cedar Research (2015)`),
  /Software Engineering Intern, Cedar Research 2015/,
  "single years should use YYYY without parentheses"
);

const educationFormatOnlyCards = context.prepareActionableChanges(`ALEX MORGAN
alex.morgan@example.com

EXPERIENCE
Lead Data Analyst 2017 2024
Northstar Research
Built customer analytics workflows.

EDUCATION
M.Sc. in Data Science with a capstone in Applied Analytics, 2013 2016
advised by Dr. Taylor Reed and Dr. Morgan Stone.
Northbridge Institute of Technology`, [
  {
    type: "rewrite",
    section: "EDUCATION",
    mode: "replace",
    original_text: `M.Sc. in Data Science with a capstone in Applied Analytics, 2013 2016
advised by Dr. Taylor Reed and Dr. Morgan Stone.
Northbridge Institute of Technology`,
    suggested_text: `M.Sc. in Data Science with capstone research in Applied Analytics, advised by Dr. Taylor Reed and Dr. Morgan Stone. 2013 - 2016
Northbridge Institute of Technology`,
    why: "Standardizes the education format and date placement.",
    evidence: "Resume supported"
  }
]);
assert.equal(educationFormatOnlyCards.length, 0, "education date/format-only rewrites should not become user comments");

const educationExistingFactsReorderCards = context.prepareActionableChanges(`ALEX MORGAN
alex.morgan@example.com

EXPERIENCE
Lead Data Analyst 2017 - 2024
Northstar Research
- Built customer analytics workflows.

EDUCATION
M.Sc. in Data Science with a capstone in Applied Analytics, 2013 - 2016
advised by Dr. Taylor Reed and Dr. Morgan Stone.
Northbridge Institute of Technology`, [
  {
    id: "education-existing-facts-reorder",
    type: "rewrite",
    section: "Education",
    mode: "replace",
    originalText: `M.Sc. in Data Science with a capstone in Applied Analytics, 2013 - 2016
advised by Dr. Taylor Reed and Dr. Morgan Stone.`,
    suggestedText: `M.Sc. in Data Science, 2013 - 2016
Northbridge Institute of Technology
Capstone: Applied Analytics (advised by Dr. Taylor Reed and Dr. Morgan Stone)`,
    whyItHelps: "Reorders the education entry for readability and puts the degree and institution first.",
    evidence: "Resume supported.",
    supportLevel: "resume_supported",
    riskLevel: "low"
  }
]);
assert.equal(
  educationExistingFactsReorderCards.length,
  0,
  "reordering facts already present in a structured entry should not become a review comment"
);

const unapplicableRewriteCards = context.prepareActionableChanges(`ALEX MORGAN

STATEMENT
Research engineer.

EXPERIENCE
Lead Data Analyst 2017 - 2024
Northstar Research
- Built customer analytics workflows.`, [
  {
    id: "unapplicable-rewrite",
    type: "rewrite",
    section: "Experience",
    mode: "replace",
    originalText: "This sentence does not exist in the resume.",
    suggestedText: "A replacement that cannot be anchored.",
    whyItHelps: "Matches the target role.",
    evidence: "Resume supported.",
    supportLevel: "resume_supported",
    riskLevel: "low"
  }
]);
assert.equal(
  unapplicableRewriteCards.length,
  1,
  "an otherwise valid AI card should remain valid data even when its current anchor is stale"
);
assert.equal(
  context.isConcreteChangeNoOpForResume(`ALEX MORGAN

STATEMENT
Research engineer.

EXPERIENCE
Lead Data Analyst 2017 - 2024
Northstar Research
- Built customer analytics workflows.`, unapplicableRewriteCards[0]),
  true,
  "preview and acceptance should detect when a valid rewrite cannot produce its displayed After result"
);

const publicationFormatOnlyCards = context.prepareActionableChanges(`ALEX MORGAN
alex.morgan@example.com

EXPERIENCE
Lead Data Analyst 2017 2024
Northstar Research
Built customer analytics workflows.

EDUCATION
B.Sc. in Statistics 2009 2013
Northbridge University

PUBLICATIONS
Low Rank Field-Weighted Factorization Machines for Low Latency Item Recommendation
2024
ACM Recommender Systems (RecSys)
K. Rivera, S. Kim, A. Morgan, R. Patel, T. Nguyen, P. Davis`, [
  {
    type: "rewrite",
    section: "PUBLICATIONS",
    mode: "replace",
    original_text: `Low Rank Field-Weighted Factorization Machines for Low Latency Item Recommendation
2024
ACM Recommender Systems (RecSys)
K. Rivera, S. Kim, A. Morgan, R. Patel, T. Nguyen, P. Davis`,
    suggested_text: `Low Rank Field-Weighted Factorization Machines for Low Latency Item Recommendation 2024
ACM Recommender Systems (RecSys)
K. Rivera, S. Kim, A. Morgan, R. Patel, T. Nguyen, P. Davis`,
    why: "Corrects formatting by placing the year on the same line as the publication title and standardizes author separation.",
    evidence: "resume_supported",
    risk_level: "low"
  }
]);
assert.equal(publicationFormatOnlyCards.length, 0, "publication year placement and spacing-only rewrites should not become comments");

const publicationYearRemovalCards = context.prepareActionableChanges(`ALEX MORGAN
alex.morgan@example.com

EXPERIENCE
Lead Data Analyst 2017 2024
Northstar Research
Built customer analytics workflows.

EDUCATION
B.Sc. in Statistics 2009 2013
Northbridge University

PUBLICATIONS
Low Rank Field-Weighted Factorization Machines for Low Latency Item Recommendation 2024
ACM Recommender Systems (RecSys)
K. Rivera, S. Kim, A. Morgan, R. Patel, T. Nguyen, P. Davis`, [
  {
    type: "rewrite",
    section: "PUBLICATIONS",
    mode: "replace",
    original_text: `Low Rank Field-Weighted Factorization Machines for Low Latency Item Recommendation 2024
ACM Recommender Systems (RecSys)
K. Rivera, S. Kim, A. Morgan, R. Patel, T. Nguyen, P. Davis`,
    suggested_text: `Low Rank Field-Weighted Factorization Machines for Low Latency Item Recommendation
ACM Recommender Systems (RecSys)
K. Rivera, S. Kim, A. Morgan, R. Patel, T. Nguyen, P. Davis`,
    why: "Improves publication formatting.",
    evidence: "resume_supported",
    risk_level: "low"
  }
]);
assert.equal(publicationYearRemovalCards.length, 0, "publication rewrites that remove an existing mandatory year should be rejected");

const localFallbackCards = context.prepareActionableChanges(
  resumeMissingExperienceYear,
  context.generateChanges(resumeMissingExperienceYear, context.buildJobAnalysis(resumeMissingExperienceYear, "machine learning production models"))
);
assert.ok(localFallbackCards.length > 0, "local fallback should produce comments when AI returns no cards");

const spellingCheckCards = context.collectResumeCheckChanges(`ALEX MORGAN
050-555-0198 alex.morgan@example.com

EXPERIENCE
Lead Data Analyst 2022
Northstar Research
- Strong project managment experinece.
- E ective communication with signi fi cant outcomes.

EDUCATION
B.Sc. Statistics 2009 - 2013
Northbridge University`, "");
const spellingCheckCard = spellingCheckCards.find((card) => card.id.startsWith("spelling-"));
assert.ok(spellingCheckCard, "resume check should create a spelling-fix comment");
assert.equal(spellingCheckCard.originalText, "- Strong project managment experinece.");
assert.ok(
  spellingCheckCards.some((card) => card.spellingBefore === "managment" && card.spellingAfter === "management"),
  "resume check should create a separate spelling card for managment"
);
assert.ok(
  spellingCheckCards.some((card) => card.spellingBefore === "experinece" && card.spellingAfter === "experience"),
  "resume check should create a separate spelling card for experinece"
);
assert.ok(
  spellingCheckCards.some((card) => card.spellingBefore === "E ective" && card.spellingAfter === "Effective"),
  "resume check should catch PDF-split spelling artifacts as separate cards"
);
assert.ok(
  context.collectResumeCheckChanges(`ALEX MORGAN
050-555-0198 alex.morgan@example.com

STRENGTHS
- ective Communication and Business Understanding.

EXPERIENCE
Lead Data Analyst 2022
Northstar Research

EDUCATION
B.Sc. Statistics 2009 - 2013
Northbridge University`).some((card) => card.spellingBefore === "ective" && card.spellingAfter === "Effective"),
  "resume check should catch truncated PDF spelling artifacts like ective -> Effective"
);
assert.ok(
  spellingCheckCards.some((card) => card.spellingBefore === "signi fi cant" && card.spellingAfter === "significant"),
  "resume check should catch each PDF-split spelling artifact separately"
);

const specificStrangCards = context.collectResumeCheckChanges(`ALEX MORGAN
050-555-0198 alex.morgan@example.com

STATEMENT
Experienced Lead Data Analyst with a strang track record of leading impactful projects

EXPERIENCE
Lead Data Analyst 2022
Northstar Research

EDUCATION
B.Sc. Statistics 2009 - 2013
Northbridge University`);
assert.ok(
  specificStrangCards.some((card) =>
    card.originalText === "Experienced Lead Data Analyst with a strang track record of leading impactful projects"
    && card.suggestedText === "Experienced Lead Data Analyst with a strong track record of leading impactful projects"
  ),
  "resume check should catch the exact 'strang track record' spelling typo"
);
const specificStrangCard = specificStrangCards.find((card) => card.originalText.includes("strang track record"));
assert.equal(specificStrangCard.type, "spelling_check", "spelling cards should use a specific spelling_check type");
const specificStrangHtml = context.renderChangeCard(specificStrangCard);
assert.match(specificStrangHtml, /<div class="text-box ">strang<\/div>/, "single-word spelling card should show only the typo in Before");
assert.match(specificStrangHtml, /<textarea[^>]*>strong<\/textarea>/, "single-word spelling card should show only the correction in After");
assert.doesNotMatch(
  specificStrangHtml,
  /<div class="text-box ">Experienced Lead Data Analyst with a strang track record/,
  "single-word spelling card should not put the full sentence in the Before box"
);

const valueSpellingCards = context.collectResumeCheckChanges(`ALEX MORGAN
050-555-0198 alex.morgan@example.com

STATEMENT
Experienced Lead Data Analyst delivering substantial business valuee.

EXPERIENCE
Lead Data Analyst 2022
Northstar Research

EDUCATION
B.Sc. Statistics 2009 - 2013
Northbridge University`);
assert.ok(
  valueSpellingCards.some((card) =>
    card.originalText.includes("valuee")
    && card.suggestedText.includes("value.")
  ),
  "resume check should catch safe common prose typos like valuee -> value"
);

const multiTypoStatementCards = context.collectResumeCheckChanges(`ALEX MORGAN
050-555-0198 alex.morgan@example.com

STATEMENT
Experienced Lead Data Analyst delivering substatial business valuee.

EXPERIENCE
Lead Data Analyst 2022
Northstar Research

EDUCATION
B.Sc. Statistics 2009 - 2013
Northbridge University`).filter((card) => card.type === "spelling_check");
assert.equal(multiTypoStatementCards.length, 2, "two typos in one sentence should produce two separate spelling comments");
assert.ok(
  multiTypoStatementCards.some((card) => card.spellingBefore === "substatial" && card.spellingAfter === "substantial"),
  "multi-typo sentence should have a separate substantial spelling card"
);
assert.ok(
  multiTypoStatementCards.some((card) => card.spellingBefore === "valuee" && card.spellingAfter === "value"),
  "multi-typo sentence should have a separate value spelling card"
);

const fuzzySpellingCards = context.collectResumeCheckChanges(`ALEX MORGAN
050-555-0198 alex.morgan@example.com

STATEMENT
Experienced Data Researh Specialist with a strong track record of leading impactful projects

EXPERIENCE
Lead Data Analyst 2022
Northstar Research

EDUCATION
B.Sc. Statistics 2009 - 2013
Northbridge University`);
assert.ok(
  fuzzySpellingCards.some((card) =>
    card.originalText.includes("Data Researh Specialist")
    && card.suggestedText.includes("Data Research Specialist")
  ),
  "resume check should catch near-miss spelling typos even when they are not exact dictionary entries"
);

const grammarOnlySpellingCards = context.collectResumeCheckChanges(`ALEX MORGAN
050-555-0198 alex.morgan@example.com

EXPERIENCE
Lead Data Analyst 2022
Northstar Research
- Used experiments and data analysis to improve product decisions.

EDUCATION
B.Sc. Statistics 2009 - 2013
Northbridge University`);
assert.equal(
  grammarOnlySpellingCards.some((card) => card.spellingBefore === "decisions" || card.spellingAfter === "decision"),
  false,
  "spelling checks must never propose a singular/plural grammar change such as decisions -> decision"
);

const spellingCaseCards = context.collectResumeCheckChanges(`ALEX MORGAN
050-555-0198 alex.morgan@example.com

EXPERIENCE
Lead Data Analyst 2022
Northstar Research
- Experinece with MANAGMENT processes.

EDUCATION
B.Sc. Statistics 2009 - 2013
Northbridge University`);
assert.ok(
  spellingCaseCards.some((card) => card.suggestedText === "- Experience with MANAGMENT processes."),
  "spelling corrections should preserve mixed-case fixes but leave all-uppercase words alone"
);
assert.ok(
  !spellingCaseCards.some((card) => /MANAGEMENT/.test(card.suggestedText)),
  "spelling corrections should not rewrite all-uppercase words or acronyms"
);

const entityLineSpellingCards = context.collectResumeCheckChanges(`ALEX MORGAN
050-555-0198 alex.morgan@example.com

EXPERIENCE
Valuee Data Analyst 2022
Atlas Valuee
- Delivered measurable business valuee.

EDUCATION
B.Sc. Statistics 2009 - 2013
Northbridge University

PUBLICATIONS
Valuee Research Paper 2024
N. Valuee, J. Lee`);
assert.ok(
  entityLineSpellingCards.some((card) => card.originalText === "- Delivered measurable business valuee."),
  "spelling should still check experience bullet prose"
);
assert.ok(
  !entityLineSpellingCards.some((card) => /Valuee Data Analyst|Atlas Valuee|Valuee Research Paper|N\. Valuee/.test(card.originalText)),
  "spelling should skip job titles, company lines, publication titles, and author rows"
);

const spellingUrlCards = context.collectResumeCheckChanges(`ALEX MORGAN
050-555-0198 alex.morgan@example.com

EXPERIENCE
Lead Data Analyst 2022
Northstar Research
- Portfolio: https://example.com/managment
- Contact: spelling@example.com

EDUCATION
B.Sc. Statistics 2009 - 2013
Northbridge University`);
assert.equal(
  spellingUrlCards.filter((card) => card.id.startsWith("spelling-")).length,
  0,
  "spelling checks should not rewrite URLs or email lines"
);

const rewriteChange = {
  id: "rewrite-exp-1",
  type: "rewrite",
  section: "Experience",
  originalText: "Built customer analytics workflows to improve audience segmentation workflows",
  suggestedText: "Built customer analytics workflows to improve audience segmentation workflows and optimize production models.",
  whyItHelps: "",
  evidence: "",
  riskLevel: "low",
  supportLevel: "resume_supported",
  status: "pending",
  mode: "replace",
  commentNumber: 4
};
const rewriteHtml = context.formatResumeForPrint(`ALEX MORGAN
050-555-0198 alex.morgan@example.com

EXPERIENCE
Lead Data Analyst 2022
Northstar Research
- Built customer analytics workflows to improve audience segmentation workflows and optimize production machine learning models.

EDUCATION
M.Sc. in Data Science 2013-2016
Northbridge Institute`);
const markedRewrite = context.addCommentMarkerToHtml(rewriteHtml, context.getCommentMarkerCandidates(rewriteChange), rewriteChange);
assert.match(markedRewrite.html, /Built customer analytics workflows[\s\S]*resume-comment-marker/);

const intelResumeHtml = context.formatResumeForPrint(`ALEX MORGAN
alex.morgan@example.com

EXPERIENCE
Lead Data Analyst 2017 2024
Northstar Research
Built customer analytics workflows.
Software Developer 2012 2013
Vertex Research
Built reporting tools for the internal data platform.

EDUCATION
B.Sc. in Statistics 2009 2013
Northbridge University`);
const intelQuestionChange = {
  id: "vertex-question",
  type: "ask_user",
  section: "Missing Evidence",
  originalText: "Software Developer responsibilities at Vertex Research",
  suggestedText: "",
  promptText: "Could you please provide 1-2 specific responsibilities or accomplishments from your time as a Software Developer at Vertex Research?",
  whyItHelps: "",
  evidence: "",
  riskLevel: "high",
  supportLevel: "user_confirmation_needed",
  status: "pending",
  mode: "appendUserConfirmed",
  missingTerm: "Specific experience",
  requiresUserWording: true,
  commentNumber: 6
};
const markedVertex = context.addCommentMarkerToHtml(intelResumeHtml, context.getCommentMarkerCandidates(intelQuestionChange), intelQuestionChange);
assert.match(markedVertex.matched, /Vertex Research|Software Developer/i, "Vertex Research-specific question should anchor near the Vertex Research entry, not stay unanchored");

const firstMarkerHtml = context.addCommentMarkerToHtml(
  context.formatResumeForPrint(`ALEX

STRENGTHS
Effective Communication and collaboration
Business Understanding.`),
  ["collaboration"],
  { ...intelQuestionChange, id: "collaboration-skills", commentNumber: 10 }
).html;
const secondMarkerHtml = context.addCommentMarkerToHtml(
  firstMarkerHtml,
  ["skills"],
  { ...intelQuestionChange, id: "skills-followup", section: "Strengths", commentNumber: 6 }
).html;
assert.doesNotMatch(
  secondMarkerHtml,
  /aria-label=&quot;Open comment|aria-label="Open comment 6"&gt;6|data-comment-id=&quot;/,
  "comment markers should not be inserted into another marker's HTML attributes"
);
assert.match(
  secondMarkerHtml,
  /<button class="resume-comment-marker[\s\S]*Open comment 10[\s\S]*<\/button>/,
  "existing comment marker should remain valid after another marker is added"
);

const unresolvedExperienceHtml = context.renderChangeCard({
  ...intelQuestionChange,
  placement: "",
  suggestedText: "",
  userDraftText: ""
});
assert.doesNotMatch(unresolvedExperienceHtml, /Think About|Follow-up Questions/, "unresolved placement should not show generic follow-up questions");
assert.match(unresolvedExperienceHtml, /Choose one or more relevant sections first/, "unresolved placement should ask for relevant section selection first");
assert.match(unresolvedExperienceHtml, /Which section is relevant\?/, "placement prompt should use the agreed wording");
assert.match(unresolvedExperienceHtml, /type="checkbox" value="skills"/, "placement should allow multiple section choices");
assert.doesNotMatch(unresolvedExperienceHtml, /\(suggested\)/i, "placement options should not show suggested labels");
assert.doesNotMatch(
  unresolvedExperienceHtml,
  /What project, product, course, or experiment|What did you personally do|Which tools, models, data|Was there an outcome/,
  "unresolved placement should not show broad multi-question prompts"
);

const normalizedVertexQuestion = context.normalizeAiQuestions([
  {
    question: "Could you please provide 1-2 specific responsibilities or accomplishments from your time as a Software Developer at Vertex Research?",
    why_it_matters: "Adds role-specific detail.",
    related_job_requirement: "Software Developer responsibilities at Vertex Research"
  }
])[0];
assert.equal(normalizedVertexQuestion.missingTerm, "Software Developer at Vertex Research", "question topic should use concrete role/company instead of Specific experience");

const teachingRoleExpansionQuestion = context.normalizeAiQuestions([
  {
    question: "For your Course Assistant role at Northbridge Institute, could you provide specific details about your responsibilities or notable contributions beyond teaching the courses?",
    why_it_matters: "The role emphasizes strong communication and collaboration.",
    related_job_requirement: "Northbridge Institute"
  }
])[0];
assert.equal(teachingRoleExpansionQuestion.missingTerm, "Specific experience", "a bare institution must not become a Missing Experience topic");
assert.equal(
  context.prepareActionableChanges(resumeMissingExperienceYear, [teachingRoleExpansionQuestion]).length,
  0,
  "a vague request to expand an existing role should not create a Missing Experience card"
);

const normalizedProgrammingQuestion = context.normalizeAiQuestions([
  {
    question: "What programming languages are you proficient in, and at what level?",
    why_it_matters: "Programming languages are requested.",
    related_job_requirement: "Programming languages"
  }
])[0];
assert.equal(normalizedProgrammingQuestion.missingTerm, "Programming Languages", "programming-language questions should get a specific topic");

const emptyAfterRewrite = context.normalizeAiChangeCard({
  id: "empty-statement-rewrite",
  type: "rewrite",
  section: "Statement",
  original_text: "Experienced research engineer.",
  suggested_text: "",
  support_level: "resume_supported"
}, 0);
assert.equal(
  context.prepareActionableChanges("STATEMENT\nExperienced research engineer.", [emptyAfterRewrite]).length,
  0,
  "a malformed rewrite with an empty After value must not reach the review UI"
);

const normalizedPhdQuestion = context.normalizeAiQuestions([{
  question: "Do you have experience with PhD?",
  why_it_matters: "The role lists an advanced degree.",
  related_job_requirement: "PhD"
}])[0];
assert.equal(normalizedPhdQuestion.missingTerm, "PhD", "PhD should remain an academic qualification topic");
assert.equal(normalizedPhdQuestion.promptText, "Do you hold a PhD?", "PhD questions must not be phrased as programming experience");
assert.deepEqual(
  Array.from(context.getPlacementOptions(normalizedPhdQuestion).map(([value]) => value)),
  ["education", "omit"],
  "an academic qualification must not be offered as a Skills or Experience placement"
);

function countListItems(html) {
  return (String(html || "").match(/<li>/g) || []).length;
}

const skillConfirmationHtml = context.renderChangeCard({
  ...normalizedProgrammingQuestion,
  placement: "skills",
  skillDraftText: "Python, SQL"
});
assert.match(skillConfirmationHtml, /Skills to add/, "skills placement should ask for a compact skill list");
assert.match(skillConfirmationHtml, /Level \(optional\)/, "skills placement should offer an optional level field");
assert.doesNotMatch(
  skillConfirmationHtml,
  /What project, product, course, or experiment|What did you personally do|Which tools, models, data/,
  "skills placement should not ask experience-style broad questions"
);
assert.ok(countListItems(skillConfirmationHtml) === 0, "skills placement should not show a generic follow-up question list");
assert.doesNotMatch(skillConfirmationHtml, /AI Rephrase/, "Skills placement should not show AI Rephrase");

const staleNewBulletHtml = context.renderExperiencePlacementFields({
  ...normalizedVertexQuestion,
  placement: "experience",
  placements: ["experience"],
  experienceEntryKey: "experience-1",
  experienceAction: "new",
  experienceDraftText: "Stale text from a different job.",
  experienceDraftContext: "experience-0|new|"
});
assert.doesNotMatch(
  staleNewBulletHtml,
  /Stale text from a different job\./,
  "a new Experience bullet must start empty when a previous draft belongs to another job"
);

elements.get("#resumeInput").value = `ALEX MORGAN
alex.morgan@example.com

EXPERIENCE
Lead Data Analyst 2017 2024
Northstar Research
Built customer analytics workflows.
Software Developer 2012 2013
Vertex Research
Built reporting tools for the internal data platform.

EDUCATION
B.Sc. in Statistics 2009 2013
Northbridge University`;
const experienceConfirmationHtml = context.renderChangeCard({
  ...normalizedVertexQuestion,
  placement: "experience",
  experienceEntryKey: "experience-1",
  experienceDraftText: "Used Python scripts for SDK experiments."
});
assert.match(experienceConfirmationHtml, /Which job title\?/, "experience placement should ask which job title");
assert.match(experienceConfirmationHtml, /Before/, "experience placement should show the selected existing bullet context");
assert.match(experienceConfirmationHtml, /AI Rephrase/, "Experience placement should show AI Rephrase");
assert.doesNotMatch(
  experienceConfirmationHtml,
  /What project, product, course, or experiment|Which tools, models, data, prompts/,
  "experience placement should not show generic broad prompts"
);
assert.ok(countListItems(experienceConfirmationHtml) <= 4, "experience placement should keep follow-up questions short");

const normalRewriteHtml = context.renderChangeCard({
  id: "rewrite-statement",
  type: "rewrite",
  section: "STATEMENT",
  originalText: "Experienced researcher.",
  suggestedText: "Senior researcher.",
  whyItHelps: "Tightens wording.",
  evidence: "Resume supported",
  riskLevel: "low",
  supportLevel: "resume_supported",
  status: "pending"
});
assert.doesNotMatch(normalRewriteHtml, /AI Rephrase/, "ordinary rewrite suggestions should not show AI Rephrase");

const multiPlacementChange = {
  ...normalizedVertexQuestion,
  placements: ["skills", "experience", "other"],
  placement: "skills",
  skillDraftText: "Python",
  experienceEntryKey: "experience-1",
  experienceDraftText: "Used Python scripts for SDK experiments.",
  otherSectionName: "Achievements",
  otherPlacementText: "Maybe this belongs in Achievements instead."
};
const multiPlacementHtml = context.renderChangeCard(multiPlacementChange);
assert.match(multiPlacementHtml, /Preview Skills/, "multi-placement card should expose a Skills preview button");
assert.match(multiPlacementHtml, /Preview Experience/, "multi-placement card should expose an Experience preview button");
assert.match(multiPlacementHtml, /Preview Other/, "Other should support previewing the custom section change");
assert.match(multiPlacementHtml, /Add to Skills/, "Skills placement should have its own add button");
assert.match(multiPlacementHtml, /Add to Experience/, "Experience placement should have its own add button");
assert.match(multiPlacementHtml, /Save Other Section/, "Other should have its own save button");
assert.match(multiPlacementHtml, /Section name/, "Other should ask for the custom section name");
assert.match(multiPlacementHtml, /What should be added or asked\?/, "Other should show a section-specific note field");
assert.match(multiPlacementHtml, /AI Rephrase/, "Non-skill placement sections should expose AI Rephrase");
assert.match(multiPlacementHtml, /Do not add/, "placement options should explain omit as do not add");

const cSkillHtml = context.renderChangeCard({
  ...normalizedProgrammingQuestion,
  id: "c-skill-card",
  missingTerm: "C",
  placements: ["skills"],
  placement: "skills"
});
assert.match(cSkillHtml, /value="C"/, "skills placement should prefill the specific missing skill and allow editing");

elements.get("#finalResume").value = "";
context.previewChangeOnResume(multiPlacementChange, null, "experience");
assert.match(
  elements.get("#pdfPreview").innerHTML,
  /Used Python scripts for SDK experiments/,
  "Experience preview should show the Experience-only change"
);
assert.doesNotMatch(
  elements.get("#pdfPreview").innerHTML,
  /<h2>Skills<\/h2>|SKILLS/,
  "Experience preview should not also preview the Skills change"
);
assert.equal(
  Boolean(multiPlacementChange.previewedPlacementKeys?.experience),
  true,
  "Experience preview should record only the Experience placement as previewed"
);
assert.equal(
  Boolean(multiPlacementChange.previewedPlacementKeys?.skills),
  false,
  "Experience preview should not mark Skills as previewed"
);

const placementApi = context.window.__roleFitTest;
const partialPlacementChange = {
  ...multiPlacementChange,
  id: "partial-placement-change",
  status: "pending",
  acceptedPlacements: [],
  previewedPlacementKeys: {},
  pass: placementApi.passes.missingExperience
};
placementApi.resetState();
const partialPlacementResume = elements.get("#resumeInput").value;
elements.get("#resumeInput").value = partialPlacementResume;
elements.get("#finalResume").value = "";
placementApi.setCurrentChanges([partialPlacementChange]);
context.previewChangeOnResume(partialPlacementChange, null, "skills");
placementApi.acceptPlacementFromCard(partialPlacementChange, "skills");
assert.equal(partialPlacementChange.status, "partial", "accepting one selected section should keep a multi-section card open");
assert.match(elements.get("#finalResume").value, /SKILLS\nPython|Skills\nPython/i, "partial placement acceptance should apply the accepted Skills change");
assert.match(elements.get("#finalResume").value, /EXPERIENCE[\s\S]*Lead Data Analyst/, "Add to Skills should preserve the original Experience section");
assert.match(elements.get("#finalResume").value, /EDUCATION[\s\S]*B\.Sc\. in Statistics/, "Add to Skills should preserve the original Education section");
assert.doesNotMatch(
  elements.get("#finalResume").value,
  /Used Python scripts for SDK experiments/,
  "partial placement acceptance should not apply the unaccepted Experience change"
);
assert.doesNotMatch(
  context.renderChangeCard(partialPlacementChange),
  /<h4>Skills<\/h4>/,
  "after adding one selected placement, that placement editor should disappear from the open card"
);
context.previewChangeOnResume(partialPlacementChange, null, "experience");
placementApi.acceptPlacementFromCard(partialPlacementChange, "experience");
assert.equal(partialPlacementChange.status, "partial", "Other note should keep the card open until saved too");
context.previewChangeOnResume(partialPlacementChange, null, "other");
placementApi.acceptPlacementFromCard(partialPlacementChange, "other");
assert.equal(partialPlacementChange.status, "accepted", "after every selected section is handled, the missing-experience card should close");
assert.match(elements.get("#finalResume").value, /Used Python scripts for SDK experiments/, "final placement acceptance should apply the Experience change too");
assert.match(elements.get("#finalResume").value, /ACHIEVEMENTS\n- Maybe this belongs in Achievements instead\./i, "Other placement should create or update the named custom section");

// Missing experience flow: every numbered card adds its skill; odd-numbered
// cards create a job and an Award, while even-numbered cards add a bullet to
// the existing Lead Data Analyst entry.
const missingExperienceFlowResume = `ALEX MORGAN
alex.morgan@example.com

STATEMENT
Research engineer focused on machine learning.

EXPERIENCE
Lead Data Analyst 2017 - 2024
Northstar Research
- Led production machine-learning experiments.

EDUCATION
M.Sc. in Data Science 2013 - 2016
Northbridge Institute

SKILLS
Machine Learning`;
const missingExperienceFlowTarget = context.getExperienceTargets(missingExperienceFlowResume)[0];
const missingExperienceFlowCards = [
  {
    id: "missing-flow-1-cpp",
    missingTerm: "C++",
    skillDraftText: "C++",
    experienceEntryKey: "__new_experience__",
    experienceNewTitle: "C++ Engineer",
    experienceNewCompany: "Compiler Labs",
    experienceNewYears: "2026",
    experienceDraftText: "Built C++ tooling for model validation.",
    otherSectionName: "Awards",
    otherPlacementText: "Received a C++ innovation award.",
    placements: ["skills", "experience", "other"],
    acceptedPlacements: ["skills", "experience", "other"]
  },
  {
    id: "missing-flow-2-python",
    missingTerm: "Python",
    skillDraftText: "Python",
    experienceEntryKey: missingExperienceFlowTarget.key,
    experienceTargetTitle: missingExperienceFlowTarget.title,
    experienceTargetCompany: missingExperienceFlowTarget.company,
    experienceTargetYears: missingExperienceFlowTarget.years,
    experienceAction: "new",
    experienceDraftText: "Automated experiment analysis with Python.",
    placements: ["skills", "experience"],
    acceptedPlacements: ["skills", "experience"]
  },
  {
    id: "missing-flow-3-java",
    missingTerm: "Java",
    skillDraftText: "Java",
    experienceEntryKey: "__new_experience__",
    experienceNewTitle: "Java Engineer",
    experienceNewCompany: "Platform Systems",
    experienceNewYears: "2025",
    experienceDraftText: "Built Java services for experimentation.",
    otherSectionName: "Awards",
    otherPlacementText: "Received a Java delivery award.",
    placements: ["skills", "experience", "other"],
    acceptedPlacements: ["skills", "experience", "other"]
  },
  {
    id: "missing-flow-4-sql",
    missingTerm: "SQL",
    skillDraftText: "SQL",
    experienceEntryKey: missingExperienceFlowTarget.key,
    experienceTargetTitle: missingExperienceFlowTarget.title,
    experienceTargetCompany: missingExperienceFlowTarget.company,
    experienceTargetYears: missingExperienceFlowTarget.years,
    experienceAction: "new",
    experienceDraftText: "Queried experiment data with SQL.",
    placements: ["skills", "experience"],
    acceptedPlacements: ["skills", "experience"]
  }
].map((change, index) => ({
  ...intelQuestionChange,
  ...change,
  type: "ask_user",
  section: "Missing Experience",
  placement: "skills",
  requiresUserWording: true,
  mode: "appendUserConfirmed",
  status: "accepted",
  acceptanceSequence: index + 1
}));
placementApi.resetState();
elements.get("#resumeInput").value = missingExperienceFlowResume;
elements.get("#finalResume").value = "";
placementApi.setCurrentChanges(missingExperienceFlowCards);
const missingExperienceFlowResult = context.getResumeForPlacementTargets();
assert.match(
  missingExperienceFlowResult,
  /Programming Languages: C\+\+ • Python • Java • SQL/,
  "missing experience flow should add every confirmed programming language to the shared Skills subsection"
);
assert.match(
  missingExperienceFlowResult,
  /C\+\+ Engineer 2026\nCompiler Labs\n- Built C\+\+ tooling for model validation\./,
  "odd missing-experience card one should create its own Experience entry"
);
assert.match(
  missingExperienceFlowResult,
  /Java Engineer 2025\nPlatform Systems\n- Built Java services for experimentation\./,
  "odd missing-experience card three should create its own Experience entry"
);
assert.match(
  missingExperienceFlowResult,
  /Lead Data Analyst 2017 - 2024\nNorthstar Research\n- Led production machine-learning experiments\.\n- Automated experiment analysis with Python\.\n- Queried experiment data with SQL\./,
  "even missing-experience cards should add bullets to the original selected Experience entry"
);
assert.match(
  missingExperienceFlowResult,
  /AWARDS\n- Received a C\+\+ innovation award\.\n- Received a Java delivery award\./,
  "odd missing-experience cards should add Awards without dropping the rest of the resume"
);
placementApi.resetState();

const noPreviewPlacementChange = {
  ...multiPlacementChange,
  id: "no-preview-placement-change",
  status: "pending",
  acceptedPlacements: [],
  previewedPlacementKeys: {},
  pass: placementApi.passes.missingExperience
};
placementApi.resetState();
elements.get("#resumeInput").value = partialPlacementResume;
elements.get("#finalResume").value = "";
placementApi.setCurrentChanges([noPreviewPlacementChange]);
placementApi.acceptPlacementFromCard(noPreviewPlacementChange, "skills");
placementApi.acceptPlacementFromCard(noPreviewPlacementChange, "experience");
placementApi.acceptPlacementFromCard(noPreviewPlacementChange, "other");
assert.equal(noPreviewPlacementChange.status, "accepted", "placements should be saveable without opening Preview first");
assert.match(elements.get("#finalResume").value, /ALEX MORGAN/, "saving additions without preview must preserve the original header");
assert.match(elements.get("#finalResume").value, /EXPERIENCE[\s\S]*Lead Data Analyst/, "saving additions without preview must preserve the original Experience section");
assert.match(elements.get("#finalResume").value, /EDUCATION[\s\S]*B\.Sc\. in Statistics/, "saving additions without preview must preserve the original Education section");
assert.match(elements.get("#finalResume").value, /SKILLS\nPython|Skills\nPython/i, "saving additions without preview should add Skills");
assert.match(elements.get("#finalResume").value, /ACHIEVEMENTS\n- Maybe this belongs in Achievements instead\./i, "saving additions without preview should add the selected custom section");

const rejectRemainingPlacementChange = {
  ...multiPlacementChange,
  id: "reject-remaining-placement",
  status: "pending",
  acceptedPlacements: [],
  previewedPlacementKeys: {},
  pass: placementApi.passes.missingExperience
};
placementApi.resetState();
elements.get("#resumeInput").value = partialPlacementResume;
elements.get("#finalResume").value = "";
placementApi.setCurrentChanges([rejectRemainingPlacementChange]);
context.previewChangeOnResume(rejectRemainingPlacementChange, null, "skills");
placementApi.acceptPlacementFromCard(rejectRemainingPlacementChange, "skills");
placementApi.rejectChangeFromCard(rejectRemainingPlacementChange);
assert.equal(rejectRemainingPlacementChange.status, "accepted", "rejecting a partially handled card should close only the remaining request");
assert.match(elements.get("#finalResume").value, /SKILLS\nPython|Skills\nPython/i, "rejecting the remaining request should preserve the already accepted Skills placement");
assert.doesNotMatch(elements.get("#finalResume").value, /Used Python scripts for SDK experiments/, "rejecting the remaining request should not apply its unaccepted Experience placement");

const alreadyPresentSkillBase = `${partialPlacementResume}\n\nSKILLS\nMachine Learning`;
const alreadyPresentSkillResume = context.applySingleChange(alreadyPresentSkillBase, {
  ...intelQuestionChange,
  placements: ["skills"],
  placement: "skills",
  skillDraftText: "Machine Learning",
  status: "pending"
});
assert.equal(alreadyPresentSkillResume, alreadyPresentSkillBase, "adding an already present skill should be a clean no-op");
assert.doesNotMatch(alreadyPresentSkillResume, /SELECTED PROJECTS/, "a no-op skill addition should never fall back to an unrelated Projects section");

const projectExperienceResume = `ALEX MORGAN
alex.morgan@example.com

EXPERIENCE
Lead Data Analyst 2017 2024
Northstar Research
Built customer analytics workflows.
Software Developer 2012 2013
Vertex Research
Built reporting tools for the internal data platform.

EDUCATION
B.Sc. in Statistics 2009 2013
Northbridge University`;
const projectAndExperienceChange = {
  ...intelQuestionChange,
  id: "project-and-experience",
  placements: ["projects", "experience"],
  placement: "projects",
  projectName: "Python project",
  projectYear: "2024",
  projectDetails: "Built a Python parser.",
  experienceEntryKey: "experience-1",
  experienceAction: "enhance",
  experienceBulletIndex: "0",
  experienceDraftText: "Programmed C scripts for the internal data platform.",
  status: "pending",
  previewedPlacementKeys: {}
};
elements.get("#resumeInput").value = projectExperienceResume;
elements.get("#finalResume").value = "";
context.previewChangeOnResume(projectAndExperienceChange, null, "experience");
assert.match(
  stripTags(elements.get("#pdfPreview").innerHTML),
  /Programmed C scripts for[\s\S]*internal[\s\S]*data platform/,
  "Experience preview should use the Experience draft even when Project is also selected"
);
assert.doesNotMatch(
  elements.get("#pdfPreview").innerHTML,
  /Python project|Built a Python parser/,
  "Experience preview should not show the Project placement"
);
placementApi.resetState();
elements.get("#resumeInput").value = projectExperienceResume;
elements.get("#finalResume").value = "";
projectAndExperienceChange.acceptedPlacements = [];
placementApi.setCurrentChanges([projectAndExperienceChange]);
context.previewChangeOnResume(projectAndExperienceChange, null, "experience");
placementApi.acceptPlacementFromCard(projectAndExperienceChange, "experience");
assert.match(
  elements.get("#finalResume").value,
  /- Programmed C scripts for the internal data platform\./,
  "Add to Experience should apply the selected Experience replacement"
);
assert.doesNotMatch(
  elements.get("#finalResume").value,
  /Python project|Built a Python parser/,
  "Add to Experience should not apply the Project placement"
);

const skillEducationExperienceResume = `ALEX MORGAN
alex.morgan@example.com

EXPERIENCE
Data Analyst 2020 2024
Northstar Research
Built recommendation experiments.

EDUCATION
B.Sc. in Statistics 2009 2013
Northbridge University

SKILLS
Machine Learning • Statistical Analysis`;
const skillEducationExperienceChange = {
  ...intelQuestionChange,
  id: "skill-education-experience",
  placements: ["skills", "education", "experience"],
  placement: "skills",
  skillDraftText: "C",
  educationAction: "new",
  educationProgram: "C Programming Course",
  educationInstitution: "Coursera",
  educationYear: "2022",
  educationDetails: "Completed practical programming exercises.",
  experienceEntryKey: "experience-0",
  experienceAction: "enhance",
  experienceBulletIndex: "0",
  experienceDraftText: "Built recommendation experiments in C.",
  status: "pending",
  acceptedPlacements: [],
  previewedPlacementKeys: {},
  pass: placementApi.passes.missingExperience
};
placementApi.resetState();
elements.get("#resumeInput").value = skillEducationExperienceResume;
elements.get("#finalResume").value = "";
placementApi.setCurrentChanges([skillEducationExperienceChange]);
context.previewChangeOnResume(skillEducationExperienceChange, null, "skills");
assert.match(elements.get("#pdfPreview").innerHTML, /Machine Learning[\s\S]*C/, "Skills preview should show the added C skill");
assert.match(elements.get("#pdfPreview").innerHTML, /<mark class="resume-preview-highlight">C<\/mark>/, "adding one skill should highlight only that skill");
assert.doesNotMatch(elements.get("#pdfPreview").innerHTML, /resume-preview-section-highlight/, "adding one skill to an existing Skills section must not highlight the whole section");
assert.doesNotMatch(elements.get("#pdfPreview").innerHTML, /C Programming Course/, "Skills preview should not also preview Education");
placementApi.acceptPlacementFromCard(skillEducationExperienceChange, "skills");
assert.match(elements.get("#finalResume").value, /SKILLS\nMachine Learning • Statistical Analysis • C/i, "Add to Skills should add single-letter C as an exact skill item");
assert.equal(skillEducationExperienceChange.status, "partial", "multi-placement card should stay open after Skills is added");
const skillEducationExperienceAfterSkills = elements.get("#finalResume").value;

const multiLanguagePlacementChange = {
  ...intelQuestionChange,
  id: "multi-language-placement-flow",
  placements: ["skills"],
  placement: "skills",
  skillDraftText: "Python, Java, C++",
  skillLevelText: "Python: advanced, Java: intermediate",
  status: "pending",
  acceptedPlacements: [],
  previewedPlacementKeys: {},
  pass: placementApi.passes.missingExperience
};
elements.get("#resumeInput").value = skillEducationExperienceResume;
elements.get("#finalResume").value = "";
placementApi.setCurrentChanges([multiLanguagePlacementChange]);
context.previewChangeOnResume(multiLanguagePlacementChange, null, "skills");
assert.match(
  elements.get("#pdfPreview").innerHTML,
  /Programming Languages:[\s\S]*Python \(advanced\)[\s\S]*Java \(intermediate\)[\s\S]*C\+\+/,
  "Skills preview should show multiple programming languages grouped under Programming Languages"
);
placementApi.acceptPlacementFromCard(multiLanguagePlacementChange, "skills");
assert.match(
  elements.get("#finalResume").value,
  /SKILLS\nMachine Learning • Statistical Analysis\nProgramming Languages: Python \(advanced\) • Java \(intermediate\) • C\+\+/,
  "Add to Skills should persist multiple programming languages in a Programming Languages subsection"
);
assert.doesNotMatch(
  elements.get("#finalResume").value,
  /(?:^|[•\n]\s*)(advanced|intermediate)(?:\s*[•\n]|$)/i,
  "language levels should not be added as standalone skill items"
);

const overlappingSkillPlacementChange = {
  ...intelQuestionChange,
  id: "overlapping-skill-preview",
  placements: ["skills"],
  placement: "skills",
  skillDraftText: "Model Evaluation, Evaluation",
  status: "pending",
  acceptedPlacements: [],
  previewedPlacementKeys: {},
  pass: placementApi.passes.missingExperience
};
elements.get("#resumeInput").value = skillEducationExperienceResume;
elements.get("#finalResume").value = "";
placementApi.setCurrentChanges([overlappingSkillPlacementChange]);
context.previewChangeOnResume(overlappingSkillPlacementChange, null, "skills");
assert.match(
  elements.get("#pdfPreview").innerHTML,
  /<mark class="resume-preview-highlight">Model Evaluation<\/mark>[\s\S]*<mark class="resume-preview-highlight">Evaluation<\/mark>/,
  "Skills preview should highlight every added skill, including overlapping names"
);
assert.doesNotMatch(
  elements.get("#pdfPreview").innerHTML,
  /<mark class="resume-preview-highlight">Model <mark class="resume-preview-highlight">Evaluation/,
  "Skills preview should not nest a short skill highlight inside a longer skill highlight"
);

const multiLanguageSkillsResume = context.applySingleChange(skillEducationExperienceResume, {
  ...intelQuestionChange,
  placements: ["skills"],
  placement: "skills",
  skillDraftText: "Python: advanced, Java: intermediate, C++",
  status: "pending"
});
assert.match(
  multiLanguageSkillsResume,
  /Programming Languages: Python \(advanced\) • Java \(intermediate\) • C\+\+/,
  "multiple programming languages should be grouped under a Programming Languages skill row and preserve levels"
);
assert.doesNotMatch(
  multiLanguageSkillsResume,
  /Python: advanced|Java: intermediate/,
  "skill levels should normalize to parenthesized format instead of colon fragments"
);

const optionalLevelSkillsResume = context.applySingleChange(skillEducationExperienceResume, {
  ...intelQuestionChange,
  placements: ["skills"],
  placement: "skills",
  skillDraftText: "Python",
  skillLevelText: "advanced",
  status: "pending"
});
assert.match(
  optionalLevelSkillsResume,
  /Machine Learning • Statistical Analysis • Python \(advanced\)/,
  "single skill level field should attach the level to that skill"
);
assert.equal(
  JSON.stringify(context.getSkillDraft({ skillDraftText: "C", skillLevelText: "advanced" })),
  JSON.stringify(["C (advanced)"]),
  "plain level text should modify the selected skill, not become a standalone skill"
);
assert.equal(
  JSON.stringify(context.getSkillDraft({ skillDraftText: "C", skillLevelText: "advance" })),
  JSON.stringify(["C (advanced)"]),
  "common level typo 'advance' should normalize to advanced instead of becoming a standalone skill"
);
assert.equal(
  JSON.stringify(context.getSkillDraft({ skillDraftText: "C: advance" })),
  JSON.stringify(["C (advanced)"]),
  "colon level syntax with 'advance' should normalize to C (advanced)"
);
assert.doesNotMatch(
  optionalLevelSkillsResume,
  /(?:^|[•\n]\s*)Advanced(?:\s*[•\n]|$)/,
  "skill level should not be inserted as a separate Advanced skill"
);

const sequentialProgrammingResume = context.applySingleChange(`ALEX MORGAN
alex.morgan@example.com

EXPERIENCE
Data Analyst 2020 2024
Northstar Research
Built recommendation experiments.

EDUCATION
B.Sc. in Statistics 2009 2013
Northbridge University

SKILLS
Machine Learning • C`, {
  ...intelQuestionChange,
  placements: ["skills"],
  placement: "skills",
  skillDraftText: "Java",
  status: "pending"
});
assert.match(
  sequentialProgrammingResume,
  /SKILLS\nMachine Learning\nProgramming Languages: C • Java/i,
  "adding a second programming language later should create the Programming Languages row"
);
assert.doesNotMatch(
  sequentialProgrammingResume,
  /Machine Learning • C • Java/,
  "programming languages should not remain mixed into the general skills row once there are several"
);

const secondProgrammingAfterLevelResume = context.applySingleChange(`ALEX MORGAN
alex.morgan@example.com

EXPERIENCE
Data Analyst 2020 2024
Northstar Research
Built recommendation experiments.

EDUCATION
B.Sc. in Statistics 2009 2013
Northbridge University

SKILLS
Machine Learning • C (advanced)`, {
  ...intelQuestionChange,
  placements: ["skills"],
  placement: "skills",
  skillDraftText: "Java",
  status: "pending"
});
assert.match(
  secondProgrammingAfterLevelResume,
  /SKILLS\nMachine Learning\nProgramming Languages: C \(advanced\) • Java/i,
  "adding a second language after a leveled programming skill should keep both languages"
);
assert.equal(
  JSON.stringify(context.getSkillDraft({ skillDraftText: "C, Java", skillLevelText: "advanced" })),
  JSON.stringify(["C", "Java"]),
  "a plain level should not become a standalone skill or attach ambiguously when multiple skills are listed"
);
const multiLanguageNoStandaloneLevelResume = context.applySingleChange(skillEducationExperienceResume, {
  ...intelQuestionChange,
  placements: ["skills"],
  placement: "skills",
  skillDraftText: "C, Java",
  skillLevelText: "advanced",
  status: "pending"
});
assert.match(
  multiLanguageNoStandaloneLevelResume,
  /SKILLS\nMachine Learning • Statistical Analysis\nProgramming Languages: C • Java/i,
  "multiple programming languages with an ambiguous plain level should still create a Programming Languages row"
);
assert.doesNotMatch(
  multiLanguageNoStandaloneLevelResume,
  /(?:^|[•\n]\s*)Advanced(?:\s*[•\n]|$)/i,
  "ambiguous level text should never be added as its own skill"
);

elements.get("#resumeInput").value = skillEducationExperienceResume;
elements.get("#finalResume").value = skillEducationExperienceAfterSkills;
placementApi.setCurrentChanges([skillEducationExperienceChange]);
context.previewChangeOnResume(skillEducationExperienceChange, null, "education");
assert.match(elements.get("#pdfPreview").innerHTML, /C Programming Course/, "Education preview should show the education placement");
assert.doesNotMatch(elements.get("#pdfPreview").innerHTML, /Built recommendation experiments in C/, "Education preview should not also preview Experience");
placementApi.acceptPlacementFromCard(skillEducationExperienceChange, "education");
assert.match(elements.get("#finalResume").value, /C Programming Course 2022\nCoursera\nCompleted practical programming exercises\./, "Add to Education should append the education entry after preview");

context.previewChangeOnResume(skillEducationExperienceChange, null, "experience");
assert.match(stripTags(elements.get("#pdfPreview").innerHTML), /Built recommendation[\s\S]*experiments in C\s*\./, "Experience preview should show the rewritten bullet");
assert.equal(
  (elements.get("#pdfPreview").innerHTML.match(/C Programming Course/g) || []).length,
  1,
  "Experience preview should keep accepted Education visible but not apply it a second time"
);
placementApi.acceptPlacementFromCard(skillEducationExperienceChange, "experience");
assert.match(
  elements.get("#finalResume").value,
  /Data Analyst 2020 - 2024\nNorthstar Research\n- Built recommendation experiments in C\./,
  "Add to Experience should rewrite the selected existing Experience bullet"
);
assert.doesNotMatch(
  elements.get("#finalResume").value,
  /Built recommendation experiments\.\n- Built recommendation experiments in C\./,
  "rewriting an existing Experience bullet should not append a duplicate bullet"
);
assert.equal(skillEducationExperienceChange.status, "accepted", "multi-placement card should close after all selected placements are added");
assert.match(elements.get("#finalResume").value, /- Built recommendation experiments in C\./, "Add to Experience should apply the rewritten bullet");

const projectFormatChange = {
  ...intelQuestionChange,
  placements: ["projects"],
  placement: "projects",
  projectName: "Role Tailor",
  projectYear: "2022",
  projectLabel: "Open source",
  projectDetails: "Tailored resumes in C.",
  status: "pending"
};
const projectFormatResume = context.applySingleChange(skillEducationExperienceResume, projectFormatChange);
assert.match(projectFormatResume, /SELECTED PROJECTS\nRole Tailor 2022\nOpen source\n- Tailored resumes in C\./, "project format should use project name, year, optional context, and bullet");
assert.doesNotMatch(projectFormatResume, /Personal project/, "project format should not add a generic Personal project line by default");
const designedProjectHtml = context.formatDesignedResumeForPrint(projectFormatResume);
assert.match(
  designedProjectHtml,
  /designed-projects-section[\s\S]*<h3>Role Tailor<\/h3>[\s\S]*entry-company">Open source[\s\S]*entry-years">2022[\s\S]*<li>Tailored resumes in C\.<\/li>/,
  "designed Projects should render as a dated entry with context and bullets"
);
const projectBeforeOverflowResume = `${skillEducationExperienceResume}

PUBLICATIONS
Resume Evaluation Methods 2024
Example Conference
N. Example

SELECTED PROJECTS
Role Tailor 2022
Open source
- Tailored resumes in C.

PATENTS
Resume Scoring Method 2023
N. Example`;
const projectBeforeOverflowHtml = context.formatDesignedResumeForPrint(projectBeforeOverflowResume);
assert.match(
  projectBeforeOverflowHtml,
  /designed-main[\s\S]*Selected Projects[\s\S]*Role Tailor/,
  "Selected Projects must remain in the first-page main layout"
);
assert.doesNotMatch(
  projectBeforeOverflowHtml,
  /designed-continuation/,
  "publications and patents should remain on page one when the resume is short enough"
);
const tooFullDesignedResume = `${projectBeforeOverflowResume}

EXPERIENCE
Lead Data Analyst 2017 - 2024
Northstar Research
- Led a large-scale recommendation research program across multiple product surfaces, combining statistical experimentation, production model development, stakeholder alignment, and detailed measurement of user and business outcomes.
- Designed and executed a sequence of online experiments that required complex implementation planning, cross-functional coordination, analysis of heterogeneous data sources, and clear written communication of conclusions.
- Partnered with product managers and engineers to translate ambiguous business problems into rigorous research plans, production-ready approaches, and decision frameworks used by teams across the organization.
- Built monitoring and evaluation workflows for machine-learning systems, investigated unexpected changes in performance, and documented practical improvements for future launches.
- Coordinated recurring research reviews that brought together experimental findings, technical tradeoffs, delivery risks, and clear next steps for senior decision makers.

ACHIEVEMENTS
- Led a long-running cross-functional program that improved product decisions through repeated experimentation, technical analysis, and communication with multiple stakeholder groups.
- Delivered a second major initiative that required extensive planning, implementation, measurement, and documented business outcomes across several teams.

STRENGTHS
- Evidence-grounded technical leadership and clear communication across research, product, engineering, and executive stakeholders.
- Deep expertise in designing reliable experiments and translating complex results into product decisions.`;
const tooFullDesignedPlan = context.getDesignedPageBudgetPlan(tooFullDesignedResume);
const tooFullDesignedHtml = context.formatDesignedResumeForPrint(tooFullDesignedResume);
assert.ok(tooFullDesignedPlan.sidebarSections.length > 0, "a full first page should move an eligible compact optional section to the side column");
assert.match(
  tooFullDesignedHtml,
  /designed-continuation[\s\S]*Publications[\s\S]*Resume Evaluation Methods[\s\S]*Patents[\s\S]*Resume Scoring Method/,
  "a full resume should move Publications and Patents to the allowed continuation page"
);
const unavoidableOverBudgetResume = `${tooFullDesignedResume}

VOLUNTEER EXPERIENCE
Technical Mentor 2018 - 2024
Community Program
- Supported recurring mentoring sessions for early-career engineers, including preparation of learning material, one-to-one guidance, and practical feedback on technical project work.
- Coordinated volunteer workshops with organizers and participants, adapting material to different backgrounds and documenting useful resources for future cohorts.
- Helped participants frame technical decisions, debug project work, and communicate their results clearly to peers and prospective employers.
- Created structured learning plans for a wide range of participants, combining hands-on exercises, individual feedback, follow-up support, and clear written material that could be reused across the program.
- Collaborated with organizers to improve the program based on participant feedback, attendance patterns, recurring technical difficulties, and changing needs across several cohorts.
- Maintained ongoing communication with volunteers and participants, ensuring sessions had appropriate preparation, useful technical examples, and a respectful, supportive environment.
- Presented practical workshops that explained complex technical topics through concrete examples, guided practice, and detailed answers to participant questions.`;
const unavoidableOverBudgetPlan = context.getDesignedPageBudgetPlan(unavoidableOverBudgetResume);
assert.equal(unavoidableOverBudgetPlan.overBudget, true, "a resume that remains too long after side-column and continuation placement should be flagged");
assert.match(
  context.getDesignedPageBudgetNotice(unavoidableOverBudgetResume, "designed"),
  /Page 1 is too full[\s\S]*Keep Longer Resume[\s\S]*Get Shortening Suggestions/,
  "an overlong designed resume should offer an explicit keep-or-shorten choice"
);
assert.equal(
  context.getDesignedPageBudgetNotice(unavoidableOverBudgetResume, "ats"),
  "",
  "the designed page-budget notice should not appear in ATS mode"
);
elements.get("#resumeInput").value = skillEducationExperienceResume;
elements.get("#finalResume").value = "";
context.previewChangeOnResume(projectFormatChange, null, "projects");
assert.match(
  elements.get("#pdfPreview").innerHTML,
  /resume-preview-section-highlight[\s\S]*Selected Projects[\s\S]*Role Tailor[\s\S]*Tailored resumes in C\./,
  "previewing a new Projects section should highlight the entire inserted section"
);
const incompleteProjectChange = {
  ...projectFormatChange,
  id: "incomplete-project-stays-open",
  projectName: "",
  projectYear: "",
  projectDetails: "Built a truthful project bullet.",
  previewedPlacementKeys: {},
  status: "pending"
};
placementApi.resetState();
placementApi.setActivePass(placementApi.passes.missingExperience);
placementApi.setCurrentChanges([incompleteProjectChange]);
elements.get("#resumeInput").value = skillEducationExperienceResume;
elements.get("#finalResume").value = "";
elements.get("#aiStatus").textContent = "Old page-level error";
context.renderChanges();
context.renderActiveCommentPanel(incompleteProjectChange);
context.previewChangeOnResume(incompleteProjectChange, null, "projects");
assert.equal(elements.get("#activeCommentPanel").hidden, false, "an incomplete project Preview should keep the comment window open");
assert.match(elements.get("#activeCommentPanel").innerHTML, /Project placement needs at least Project name and Year/, "an incomplete project should show its validation error inside the comment window");
assert.equal(elements.get("#aiStatus").textContent, "", "a Project field error should not be repeated in the page header");
incompleteProjectChange.projectName = "RoleFit Evaluator";
incompleteProjectChange.projectYear = "2026";
context.previewChangeOnResume(incompleteProjectChange, null, "projects");
assert.equal(elements.get("#activeCommentPanel").hidden, false, "a corrected project should stay in the same comment window");
assert.doesNotMatch(elements.get("#activeCommentPanel").innerHTML, /Project placement needs at least Project name and Year/, "project validation text should clear after the missing fields are supplied");
assert.match(elements.get("#pdfPreview").innerHTML, /RoleFit Evaluator/, "the corrected project should preview from the same open comment");
const existingProjectsResume = `${skillEducationExperienceResume}

SELECTED PROJECTS
Legacy Tool 2020
Internal tool
- Maintained reports.`;
const projectIntoExistingSectionChange = {
  ...projectFormatChange,
  id: "project-into-existing-section",
  previewedPlacementKeys: {},
  status: "pending"
};
elements.get("#resumeInput").value = existingProjectsResume;
elements.get("#finalResume").value = "";
context.previewChangeOnResume(projectIntoExistingSectionChange, null, "projects");
assert.match(
  elements.get("#pdfPreview").innerHTML,
  /<mark class="resume-preview-highlight">Role Tailor<\/mark>[\s\S]*<mark class="resume-preview-highlight">2022<\/mark>[\s\S]*<mark class="resume-preview-highlight">Open source<\/mark>[\s\S]*<mark class="resume-preview-highlight">Tailored resumes in C\.<\/mark>/,
  "previewing a new Project in an existing Projects section should highlight all inserted project fields"
);
placementApi.resetState();
elements.get("#resumeInput").value = existingProjectsResume;
elements.get("#finalResume").value = "";
placementApi.setCurrentChanges([projectIntoExistingSectionChange]);
context.previewChangeOnResume(projectIntoExistingSectionChange, null, "projects");
placementApi.acceptPlacementFromCard(projectIntoExistingSectionChange, "projects");
assert.match(elements.get("#finalResume").value, /EXPERIENCE[\s\S]*Data Analyst/, "adding a Project should preserve Experience");
assert.match(elements.get("#finalResume").value, /EDUCATION[\s\S]*B\.Sc\. in Statistics/, "adding a Project should preserve Education");
assert.match(elements.get("#finalResume").value, /SKILLS[\s\S]*Machine Learning/, "adding a Project should preserve Skills");
assert.match(elements.get("#finalResume").value, /SELECTED PROJECTS[\s\S]*Legacy Tool 2020[\s\S]*Role Tailor 2022[\s\S]*- Tailored resumes in C\./, "Add to Projects should persist the new project inside the existing Projects section");
const acceptedProjectChange = {
  ...projectFormatChange,
  id: "accepted-project-does-not-disappear",
  status: "pending",
  previewedPlacementKeys: {}
};
placementApi.resetState();
elements.get("#resumeInput").value = skillEducationExperienceResume;
elements.get("#finalResume").value = "";
placementApi.setCurrentChanges([acceptedProjectChange]);
context.previewChangeOnResume(acceptedProjectChange, null, "projects");
placementApi.acceptPlacementFromCard(acceptedProjectChange, "projects");
assert.match(elements.get("#finalResume").value, /SELECTED PROJECTS\nRole Tailor 2022\nOpen source\n- Tailored resumes in C\./, "accepted new project should appear in the final resume");
context.applyAcceptedChanges();
assert.match(
  elements.get("#finalResume").value,
  /SELECTED PROJECTS\nRole Tailor 2022\nOpen source\n- Tailored resumes in C\./,
  "accepted new project should not disappear when accepted changes are rebuilt"
);

const targetsAfterNewProject = context.getProjectTargets(elements.get("#finalResume").value);
assert.ok(
  targetsAfterNewProject.some((target) => target.name === "Role Tailor" && target.year === "2022"),
  "a newly added Project should be parsed as a selectable target for later comments"
);
const followupNewProjectChange = {
  ...intelQuestionChange,
  id: "followup-new-project",
  placements: ["projects"],
  placement: "projects",
  projectAction: "new_bullet",
  projectEntryKey: targetsAfterNewProject.find((target) => target.name === "Role Tailor").key,
  projectDetails: "Added Java parsing support.",
  status: "pending",
  previewedPlacementKeys: {}
};
const followupNewProjectHtml = context.renderChangeCard(followupNewProjectChange);
assert.match(
  followupNewProjectHtml,
  /Role Tailor - 2022/,
  "later comments should show a newly added Project in the project selector"
);
assert.match(
  context.applySingleChange(elements.get("#finalResume").value, followupNewProjectChange),
  /Role Tailor 2022\nOpen source\n- Tailored resumes in C\.\n- Added Java parsing support\./,
  "later comments should add a bullet under the newly added Project"
);

const existingProjectResume = `ALEX MORGAN
alex.morgan@example.com

EXPERIENCE
Data Analyst 2020 2024
Northstar Research
Built recommendation experiments.

EDUCATION
B.Sc. in Statistics 2009 2013
Northbridge University

SELECTED PROJECTS
Role Tailor 2022
- Tailored resumes in C.`;
const existingProjectBulletChange = {
  ...intelQuestionChange,
  id: "existing-project-bullet",
  placements: ["projects"],
  placement: "projects",
  projectAction: "new_bullet",
  projectEntryKey: "project-0",
  projectDetails: "Added Java parsing support.",
  status: "pending",
  previewedPlacementKeys: {}
};
elements.get("#resumeInput").value = existingProjectResume;
elements.get("#finalResume").value = "";
context.previewChangeOnResume(existingProjectBulletChange, null, "projects");
assert.match(elements.get("#pdfPreview").innerHTML, /Added Java parsing support/, "existing Project preview should show the new project bullet");
assert.match(
  context.applySingleChange(existingProjectResume, existingProjectBulletChange),
  /Role Tailor 2022\n- Tailored resumes in C\.\n- Added Java parsing support\./,
  "Project placement should add a new bullet to the selected existing project"
);
const existingProjectRewriteChange = {
  ...existingProjectBulletChange,
  id: "existing-project-rewrite",
  projectAction: "rewrite",
  projectBulletIndex: "0",
  projectDetails: "Tailored resumes in C and Java."
};
assert.match(
  context.applySingleChange(existingProjectResume, existingProjectRewriteChange),
  /Role Tailor 2022\n- Tailored resumes in C and Java\./,
  "Project placement should rewrite only the selected project bullet"
);

const strengthsOtherChange = {
  ...intelQuestionChange,
  id: "other-strengths",
  placements: ["other"],
  placement: "other",
  otherSectionName: "Strengths",
  otherAction: "enhance",
  otherItemIndex: "0",
  otherPlacementText: "Strong technical communication in cross-functional teams.",
  status: "pending",
  previewedPlacementKeys: {}
};
const strengthsResume = `ALEX MORGAN
alex.morgan@example.com

EXPERIENCE
Lead Data Analyst 2017 2024
Northstar Research
Built customer analytics workflows.

EDUCATION
B.Sc. in Statistics 2009 2013
Northbridge University

STRENGTHS
- Strong leadership and project management skills.`;
elements.get("#resumeInput").value = strengthsResume;
elements.get("#finalResume").value = "";
const strengthsOtherHtml = context.renderChangeCard(strengthsOtherChange);
assert.match(strengthsOtherHtml, /Rewrite an existing item/, "Other should expose existing-item rewrite when the named section exists");
assert.match(strengthsOtherHtml, /Which existing item\?/, "Other should ask which section item to rewrite");
context.previewChangeOnResume(strengthsOtherChange, null, "other");
assert.match(elements.get("#pdfPreview").innerHTML, /Strong[\s\S]*technical communication in cross-functional teams/, "Other preview should show the rewritten section item");
assert.match(
  context.applySingleChange(strengthsResume, strengthsOtherChange),
  /STRENGTHS\n- Strong technical communication in cross-functional teams\./,
  "Other placement should replace the selected existing section item"
);
placementApi.resetState();
elements.get("#resumeInput").value = strengthsResume;
elements.get("#finalResume").value = "";
placementApi.setCurrentChanges([strengthsOtherChange]);
context.previewChangeOnResume(strengthsOtherChange, null, "other");
placementApi.acceptPlacementFromCard(strengthsOtherChange, "other");
assert.match(
  elements.get("#finalResume").value,
  /STRENGTHS\n- Strong technical communication in cross-functional teams\./,
  "Add to Other should persist the previewed rewrite of an existing custom-section item"
);
assert.equal(strengthsOtherChange.status, "accepted", "Add to Other should close the card when Other is the selected placement");

const strengthsNewBulletChange = {
  ...intelQuestionChange,
  id: "other-strengths-new",
  placements: ["other"],
  placement: "other",
  otherSectionName: "Strengths",
  otherPlacementText: "Super Python",
  status: "pending",
  previewedPlacementKeys: {}
};
const strengthsNewBulletHtml = context.renderChangeCard(strengthsNewBulletChange);
assert.match(strengthsNewBulletHtml, /Add a new item/, "Other should default to adding a new item even when the section exists");
assert.doesNotMatch(strengthsNewBulletHtml, /Which existing item\?/, "Other should not default to editing an existing item");
assert.match(
  context.applySingleChange(strengthsResume, strengthsNewBulletChange),
  /STRENGTHS\n- Strong leadership and project management skills\.\n- Super Python\./,
  "Other placement should add a new Strengths bullet by default"
);
placementApi.resetState();
elements.get("#resumeInput").value = strengthsResume;
elements.get("#finalResume").value = "";
placementApi.setCurrentChanges([strengthsNewBulletChange]);
context.previewChangeOnResume(strengthsNewBulletChange, null, "other");
assert.match(
  elements.get("#pdfPreview").innerHTML,
  /Strong leadership[\s\S]*Super Python/,
  "Other preview should show the new item inside the existing section"
);
placementApi.acceptPlacementFromCard(strengthsNewBulletChange, "other");
assert.match(
  elements.get("#finalResume").value,
  /STRENGTHS\n- Strong leadership and project management skills\.\n- Super Python\./,
  "Add to Other should persist a new item inside an existing custom section"
);

const achievementsTypoSectionChange = {
  ...intelQuestionChange,
  id: "other-achievments-new",
  placements: ["other"],
  placement: "other",
  otherSectionName: "Achievments",
  otherPlacementText: "I achieve something in C.",
  status: "pending"
};
const achievementsTypoResume = context.applySingleChange(strengthsResume, achievementsTypoSectionChange);
assert.match(
  achievementsTypoResume,
  /EDUCATION\nB\.Sc\. in Statistics 2009 2013\nNorthbridge University\n\nACHIEVEMENTS\n- I achieve something in C\./,
  "misspelled Achievements custom section should be normalized and inserted as a real section after Education"
);
assert.match(
  context.formatResumeForPrint(achievementsTypoResume),
  /<h2>Achievements<\/h2>[\s\S]*<li>I achieve something in C\.<\/li>/,
  "Achievements should render as its own section, not as Education detail text"
);

const customAwardsSectionChange = {
  ...intelQuestionChange,
  id: "other-awards-new",
  placements: ["other"],
  placement: "other",
  otherSectionName: "Awards",
  otherPlacementText: "Best paper award for applied research.",
  status: "pending"
};
const customAwardsResume = context.applySingleChange(strengthsResume, customAwardsSectionChange);
assert.match(
  customAwardsResume,
  /EDUCATION\nB\.Sc\. in Statistics 2009 2013\nNorthbridge University\n\nAWARDS\n- Best paper award for applied research\./,
  "unknown Other section titles should be inserted as separate resume sections after Education"
);
assert.match(
  context.normalizeFinalResumeText(customAwardsResume),
  /EDUCATION\nB\.Sc\. in Statistics 2009 - 2013\nNorthbridge University\n\nAWARDS\n- Best paper award for applied research\./,
  "custom uppercase sections should survive normalization as real sections"
);
assert.match(
  context.formatResumeForPrint(customAwardsResume),
  /<h2>Awards<\/h2>[\s\S]*<li>Best paper award for applied research\.<\/li>/,
  "custom Other sections should render with standard section heading and bullet formatting"
);
placementApi.resetState();
elements.get("#resumeInput").value = strengthsResume;
elements.get("#finalResume").value = "";
placementApi.setCurrentChanges([customAwardsSectionChange]);
context.previewChangeOnResume(customAwardsSectionChange, null, "other");
assert.match(
  elements.get("#pdfPreview").innerHTML,
  /<h2>Awards<\/h2>[\s\S]*Best paper award for applied research/,
  "Other preview should show a newly created custom section using normal resume section formatting"
);
placementApi.acceptPlacementFromCard(customAwardsSectionChange, "other");
assert.match(
  elements.get("#finalResume").value,
  /AWARDS\n- Best paper award for applied research\./,
  "Add to Other should persist a newly created custom section"
);
const laterAwardsRewriteChange = {
  ...intelQuestionChange,
  id: "other-awards-rewrite-later",
  placements: ["other"],
  placement: "other",
  otherSectionName: "Awards",
  otherAction: "enhance",
  otherItemIndex: "0",
  otherPlacementText: "Best paper award for production-focused applied research.",
  status: "pending"
};
const laterAwardsHtml = context.renderChangeCard(laterAwardsRewriteChange);
assert.match(laterAwardsHtml, /value="enhance" selected(?![^>]*disabled)/, "a later skill card should enable rewriting an Awards item added earlier");
assert.match(laterAwardsHtml, /Best paper award for applied research/, "a later skill card should show the existing Awards item as the rewrite target");
assert.match(
  context.applySingleChange(elements.get("#finalResume").value, laterAwardsRewriteChange),
  /AWARDS\n- Best paper award for production-focused applied research\./,
  "a later skill card should rewrite an item in an Awards section added earlier"
);

const volunteerChange = {
  ...intelQuestionChange,
  id: "volunteer-experience",
  placements: ["other"],
  placement: "other",
  otherSectionName: "Volunteer Experience",
  volunteerTitle: "Shelter Volunteer",
  volunteerPlace: "Local Shelter",
  volunteerYears: "2021",
  volunteerDetails: "Helped coordinate shelter intake in Java.",
  status: "pending",
  previewedPlacementKeys: {}
};
const volunteerHtml = context.renderChangeCard(volunteerChange);
assert.match(volunteerHtml, /Volunteer title \/ role/, "Volunteer Experience should ask for a structured volunteer role");
assert.match(volunteerHtml, /Organization \/ place/, "Volunteer Experience should ask for the volunteer organization");
assert.match(volunteerHtml, /Bullet \/ detail/, "Volunteer Experience should ask for one descriptive bullet");
const volunteerResume = context.applySingleChange(strengthsResume, volunteerChange);
assert.match(
  volunteerResume,
  /VOLUNTEER EXPERIENCE\nShelter Volunteer 2021\nLocal Shelter\n- Helped coordinate shelter intake in Java\./,
  "Volunteer Experience should be created as its own dated section"
);
assert.match(
  volunteerResume,
  /EDUCATION\nB\.Sc\. in Statistics 2009 2013\nNorthbridge University\n\nVOLUNTEER EXPERIENCE/,
  "Volunteer Experience should start as a separate section after Education"
);
const designedVolunteerHtml = context.formatDesignedResumeForPrint(volunteerResume);
assert.match(designedVolunteerHtml, /<h2>Volunteer Experience<\/h2>/, "designed resume should render Volunteer Experience as a real section");
assert.match(designedVolunteerHtml, /<h3>Shelter Volunteer<\/h3>/, "designed Volunteer Experience should render the volunteer role as the entry title");
assert.match(designedVolunteerHtml, /<p class="entry-company">Local Shelter<\/p>/, "designed Volunteer Experience should render the organization under the role");

const experienceDraftContextResume = `ALEX MORGAN
alex.morgan@example.com

EXPERIENCE
Lead Data Analyst 2017 2024
Northstar Research
- Built customer analytics workflows.
- Utilized data-driven methodologies.

EDUCATION
B.Sc. in Statistics 2009 2013
Northbridge University`;
elements.get("#resumeInput").value = experienceDraftContextResume;
elements.get("#finalResume").value = "";
const firstExperienceTarget = context.getExperienceTargets(experienceDraftContextResume)[0];
const rephrasedExperienceChange = {
  ...intelQuestionChange,
  id: "rephrased-existing-experience",
  placements: ["experience"],
  placement: "experience",
  experienceEntryKey: firstExperienceTarget.key,
  experienceAction: "enhance",
  experienceBulletIndex: "1",
  experienceDraftText: "Utilized data-driven methodologies in Python production workflows."
};
context.syncDraftContextForField(rephrasedExperienceChange, "experienceDraftText");
assert.equal(
  context.getContextualExperienceDraftValue(rephrasedExperienceChange, "fallback"),
  "Utilized data-driven methodologies in Python production workflows.",
  "rephrased existing Experience draft should remain attached to the selected bullet context"
);
rephrasedExperienceChange.experienceBulletIndex = "0";
assert.equal(
  context.getContextualExperienceDraftValue(rephrasedExperienceChange, "Built customer analytics workflows."),
  "Built customer analytics workflows.",
  "existing Experience draft should reset when the user switches to a different bullet"
);

const teachingPreviewHtml = context.formatResumeForPrint(`ALEX

EXPERIENCE
Lead Data Analyst 2017 2024
Northstar Research
Built customer analytics workflows.
Course Assistant 2013 2016
Northbridge Institute
Taught courses in Data Fundamentals.`);
const teachingHighlight = context.highlightChangeInHtml(
  teachingPreviewHtml,
  [
    "Course Assistant 2013 - 2016\nNorthbridge Institute\nTaught courses in Data Fundamentals.",
    "Course Assistant 2013 2016"
  ],
  { section: "Experience" }
);
assert.doesNotMatch(teachingHighlight.html, /resume-preview-section-highlight/, "item-specific preview should not highlight the whole Experience section");
assert.match(teachingHighlight.html, /resume-preview-highlight/, "item-specific preview should highlight a matching block");

const noOpTeachingRewrite = context.normalizeAiChangeCard({
  id: "noop-teaching-rewrite",
  type: "rewrite",
  section: "Experience",
  original_text: "Course Assistant 2013 2016\nNorthbridge Institute of Technology\nFacilitated workshops in data analysis, programming, and statistics.",
  suggested_text: "Course Assistant 2013 2016\nNorthbridge Institute of Technology\nFacilitated workshops in data analysis, programming, and statistics.",
  why_it_helps: "De-emphasizes the course assistant role.",
  support_level: "resume_supported",
  risk_level: "low"
}, 0);
assert.equal(
  context.prepareActionableChanges(intelResumeHtml.replace(/<[^>]*>/g, ""), [noOpTeachingRewrite]).length,
  0,
  "no-op rewrite cards with identical before/after text should be filtered out"
);

const unanchoredRewriteHighlight = context.highlightChangeInHtml(
  teachingPreviewHtml,
  ["Text that does not exist in this resume"],
  { section: "Experience", type: "rewrite", mode: "replace", originalText: "Text that does not exist in this resume", suggestedText: "Replacement text" }
);
assert.doesNotMatch(
  unanchoredRewriteHighlight.html,
  /resume-preview-section-highlight/,
  "unanchored rewrite preview should not highlight the whole section"
);

const experienceFlowResume = `ALEX MORGAN
alex.morgan@example.com

EXPERIENCE
Lead Data Analyst 2017 2024
Northstar Research
Built customer analytics workflows.
Software Developer 2012 2013
Vertex Research
Built reporting tools for the internal data platform.

EDUCATION
B.Sc. in Statistics 2009 2013
Northbridge University`;
const experienceTargets = context.getExperienceTargets(experienceFlowResume);
assert.equal(experienceTargets.length, 2, "experience placement should parse selectable job entries");
assert.match(experienceTargets[1].label, /Software Developer - Vertex Research/);

const stuckBulletResume = `ALEX MORGAN
alex.morgan@example.com

EXPERIENCE
Lead Data Analyst 2017 2024
Northstar Research
Built customer analytics workflows.
Translated business requirements into research solutions.

EDUCATION
B.Sc. in Statistics 2009 2013
Northbridge University`;
elements.get("#resumeInput").value = stuckBulletResume;
elements.get("#finalResume").value = "";
const selectedSecondBulletHtml = context.renderChangeCard({
  ...intelQuestionChange,
  placement: "experience",
  placements: ["experience"],
  experienceEntryKey: "experience-0",
  experienceAction: "enhance",
  experienceBulletIndex: "1",
  experienceDraftText: "Stale Atlas bullet text.",
  experienceDraftContext: "experience-0|enhance|0"
});
assert.match(
  selectedSecondBulletHtml,
  /<textarea[^>]*data-draft-field="experienceDraftText"[^>]*>Translated business requirements into research solutions\.<\/textarea>/,
  "experience rewrite window should follow the selected bullet, not stale draft text from another bullet"
);
assert.doesNotMatch(
  selectedSecondBulletHtml,
  /Stale Atlas bullet text/,
  "stale experience draft text should not appear after selecting a different bullet"
);

const newBulletHtml = context.renderChangeCard({
  ...intelQuestionChange,
  placement: "experience",
  placements: ["experience"],
  experienceEntryKey: "experience-1",
  experienceAction: "new"
});
assert.match(
  newBulletHtml,
  /<textarea[^>]*data-draft-field="experienceDraftText"[^>]*><\/textarea>/,
  "new Experience bullet should start with an empty writing window"
);

const newExperienceWithInheritedBulletHtml = context.renderChangeCard({
  ...intelQuestionChange,
  placement: "experience",
  placements: ["experience"],
  experienceEntryKey: "__new_experience__",
  experienceDraftText: "Built customer analytics workflows, improving audience segmentation workflows.",
  experienceDraftContext: "experience-0|new|"
});
assert.match(
  newExperienceWithInheritedBulletHtml,
  /<textarea[^>]*data-draft-field="experienceDraftText"[^>]*><\/textarea>/,
  "a new Experience entry must clear a bullet inherited from an existing role"
);
assert.doesNotMatch(
  newExperienceWithInheritedBulletHtml,
  /Built customer analytics workflows/,
  "a new Experience entry must not show an existing role's bullet in its evidence window"
);

const defaultExistingNewBulletChange = {
  ...intelQuestionChange,
  id: "default-existing-new-bullet",
  placement: "experience",
  placements: ["experience"],
  experienceAction: "new",
  experienceDraftText: "Added C monitoring to production experiments."
};
const defaultExistingNewBulletResume = context.applySingleChange(stuckBulletResume, defaultExistingNewBulletChange);
assert.match(
  defaultExistingNewBulletResume,
  /Northstar Research[\s\S]*- Added C monitoring to production experiments\.[\s\S]*EDUCATION/,
  "an AI-generated card with no stored job key should add a new bullet to the visibly selected first job"
);

const defaultExistingRewriteChange = {
  ...intelQuestionChange,
  id: "default-existing-rewrite",
  placement: "experience",
  placements: ["experience"],
  experienceAction: "enhance",
  experienceBulletIndex: "0",
  experienceDraftText: "Directed C-based customer analytics experiments."
};
const defaultExistingRewriteResume = context.applySingleChange(stuckBulletResume, defaultExistingRewriteChange);
assert.match(
  defaultExistingRewriteResume,
  /- Directed C-based customer analytics experiments\./,
  "an AI-generated card with no stored job key should rewrite the selected first Experience bullet"
);
assert.doesNotMatch(
  defaultExistingRewriteResume,
  /Built customer analytics workflows\./,
  "rewriting the default Experience target should replace the old bullet"
);

const newExperienceChange = {
  ...intelQuestionChange,
  placement: "experience",
  placements: ["experience"],
  experienceEntryKey: "__new_experience__",
  experienceNewTitle: "Analytics Consultant",
  experienceNewCompany: "Example AI",
  experienceNewYears: "2016 - 2018",
  experienceDraftText: "Built ranking models in Python.",
  experienceDraftContext: "__new_experience__|new_experience|"
};
const newExperienceResume = context.applySingleChange(experienceFlowResume, newExperienceChange);
assert.match(
  newExperienceResume,
  /Lead Data Analyst 2017 2024[\s\S]*Analytics Consultant 2016 - 2018[\s\S]*Software Developer 2012 2013/,
  "new Experience entries should be inserted in reverse chronological order by years"
);
placementApi.resetState();
elements.get("#resumeInput").value = experienceFlowResume;
elements.get("#finalResume").value = "";
const newExperiencePreviewChange = {
  ...newExperienceChange,
  id: "new-experience-preview-highlight",
  status: "pending",
  previewedPlacementKeys: {}
};
placementApi.setCurrentChanges([newExperiencePreviewChange]);
context.previewChangeOnResume(newExperiencePreviewChange, null, "experience");
assert.match(
  elements.get("#pdfPreview").innerHTML,
  /resume-preview-entry-highlight[\s\S]*<p>Analytics Consultant 2016 - 2018<\/p>[\s\S]*<p>Example AI<\/p>[\s\S]*<li>Built ranking models in Python\.<\/li>/,
  "previewing a new Experience entry should group its title, company, and bullet in one coherent highlight"
);
placementApi.acceptPlacementFromCard(newExperiencePreviewChange, "experience");
assert.match(elements.get("#finalResume").value, /EXPERIENCE[\s\S]*Analytics Consultant 2016 - 2018[\s\S]*Example AI[\s\S]*- Built ranking models in Python\./, "Add to Experience should persist a new job entry");
assert.match(elements.get("#finalResume").value, /EDUCATION[\s\S]*B\.Sc\. in Statistics/, "adding a new Experience entry should preserve Education");
const targetsAfterNewExperience = context.getExperienceTargets(newExperienceResume);
assert.ok(
  targetsAfterNewExperience.some((target) => target.title === "Analytics Consultant" && target.company === "Example AI"),
  "newly added Experience entries should be parsed as selectable targets for later comments"
);

placementApi.resetState();
elements.get("#resumeInput").value = experienceFlowResume;
elements.get("#finalResume").value = "";
const repeatedPythonJobChange = {
  ...newExperienceChange,
  id: "new-python-job-complete-highlight",
  experienceNewTitle: "Python",
  experienceNewCompany: "Python",
  experienceNewYears: "2021",
  experienceDraftText: "Something python.",
  experienceDraftContext: "__new_experience__|new_experience|",
  status: "pending",
  previewedPlacementKeys: {}
};
placementApi.setCurrentChanges([repeatedPythonJobChange]);
context.previewChangeOnResume(repeatedPythonJobChange, null, "experience");
const repeatedPythonJobPreview = elements.get("#pdfPreview").innerHTML;
assert.match(
  repeatedPythonJobPreview,
  /resume-preview-entry-highlight[\s\S]*<p>Python 2021<\/p>[\s\S]*<p>Python<\/p>[\s\S]*<li>Something python\.<\/li>/,
  "a new job preview should highlight title, company, and bullet when the title and company are identical"
);

const repeatedPythonJobResume = context.applySingleChange(experienceFlowResume, repeatedPythonJobChange);
const repeatedPythonJobTarget = context.getExperienceTargets(repeatedPythonJobResume)
  .find((target) => target.title === "Python" && target.company === "Python");
assert.ok(repeatedPythonJobTarget, "the newly added Python job should be available for a later missing-experience comment");
const repeatedPythonBulletRewrite = {
  ...intelQuestionChange,
  id: "rewrite-python-job-bullet-highlight",
  placement: "experience",
  placements: ["experience"],
  experienceEntryKey: repeatedPythonJobTarget.key,
  experienceTargetTitle: repeatedPythonJobTarget.title,
  experienceTargetCompany: repeatedPythonJobTarget.company,
  experienceTargetYears: repeatedPythonJobTarget.years,
  experienceAction: "enhance",
  experienceBulletIndex: "0",
  experienceOriginalBullet: repeatedPythonJobTarget.bullets[0],
  experienceDraftText: "Something python and C++.",
  experienceDraftContext: `${repeatedPythonJobTarget.key}|enhance|0`,
  status: "pending",
  previewedPlacementKeys: {}
};
elements.get("#resumeInput").value = repeatedPythonJobResume;
elements.get("#finalResume").value = "";
placementApi.setCurrentChanges([repeatedPythonBulletRewrite]);
context.previewChangeOnResume(repeatedPythonBulletRewrite, null, "experience");
const repeatedPythonBulletPreview = elements.get("#pdfPreview").innerHTML;
assert.match(
  repeatedPythonBulletPreview,
  /<li>Something python <mark class="resume-preview-highlight">and C\+\+<\/mark>\.<\/li>/,
  "rewriting a newly added job bullet should highlight only the added phrase"
);
assert.doesNotMatch(
  repeatedPythonBulletPreview,
  /<p><mark class="resume-preview-highlight">Python<\/mark><\/p>/,
  "the company line should not be highlighted when only its job bullet changed"
);

placementApi.resetState();
elements.get("#resumeInput").value = experienceFlowResume;
elements.get("#finalResume").value = experienceFlowResume;
const acceptedPythonExperience = {
  ...newExperienceChange,
  id: "accepted-python-experience",
  status: "accepted",
  acceptanceSequence: 1
};
const javaAfterPythonExperience = {
  ...intelQuestionChange,
  id: "java-after-python-experience",
  placement: "experience",
  placements: ["experience"],
  experienceAction: "new",
  experienceDraftText: "Added Java integration coverage.",
  status: "pending"
};
placementApi.setCurrentChanges([acceptedPythonExperience, javaAfterPythonExperience]);
const javaAfterPythonHtml = context.renderChangeCard(javaAfterPythonExperience);
assert.match(
  javaAfterPythonHtml,
  /Analytics Consultant - Example AI - 2016 - 2018/,
  "a Java follow-up should list a Python experience entry accepted before the Java card opened"
);
assert.match(
  elements.get("#finalResume").value,
  /Analytics Consultant 2016 - 2018[\s\S]*Example AI[\s\S]*Built ranking models in Python\./,
  "opening a later Experience card should synchronize it with the accepted Python entry"
);
placementApi.resetState();

elements.get("#resumeInput").value = experienceFlowResume;
elements.get("#finalResume").value = experienceFlowResume;
const acceptedCppExperience = {
  ...newExperienceChange,
  id: "accepted-cpp-experience",
  experienceNewTitle: "C++",
  experienceNewCompany: "C++",
  experienceNewYears: "2022",
  experienceDraftText: "Built C++ tooling.",
  status: "accepted",
  acceptanceSequence: 1
};
const pythonAfterCppExperience = {
  ...intelQuestionChange,
  id: "python-after-cpp-experience",
  placement: "experience",
  placements: ["experience"],
  experienceAction: "new",
  experienceDraftText: "Automated test workflows with Python.",
  status: "pending"
};
placementApi.setCurrentChanges([acceptedCppExperience, pythonAfterCppExperience]);
const pythonAfterCppHtml = context.renderChangeCard(pythonAfterCppExperience);
assert.match(
  elements.get("#finalResume").value,
  /C\+\+ 2022\nC\+\+\n- Built C\+\+ tooling\./,
  "materializing an accepted C++ Experience entry should retain its complete block"
);
assert.match(
  pythonAfterCppHtml,
  /C\+\+ - C\+\+ - 2022/,
  "a Python follow-up should list a previously accepted C++ Experience entry"
);
const cPlusPlusTarget = context.getExperienceTargets(elements.get("#finalResume").value)
  .find((target) => target.title === "C++" && target.company === "C++");
assert.ok(cPlusPlusTarget, "the accepted C++ job should remain a selectable Experience target");
pythonAfterCppExperience.experienceEntryKey = cPlusPlusTarget.key;
pythonAfterCppExperience.experienceTargetTitle = "";
pythonAfterCppExperience.experienceTargetCompany = "";
pythonAfterCppExperience.experienceTargetYears = "";
const cPlusPlusWithPython = context.applySingleChange(elements.get("#finalResume").value, pythonAfterCppExperience);
assert.match(
  cPlusPlusWithPython,
  /C\+\+ 2022\nC\+\+\n- Built C\+\+ tooling\.\n- Automated test workflows with Python\./,
  "Python should be addable as a new bullet under the accepted C++ Experience entry"
);
placementApi.resetState();
const customTitleExperienceResume = `ALEX MORGAN
alex.morgan@example.com

EXPERIENCE
Lead Data Analyst 2017 - 2024
Northstar Research
- Built customer analytics workflows.
C something 2022
C something
- Built a C experiment.

EDUCATION
B.Sc. in Statistics 2009 - 2013
Northbridge University`;
const customTitleExperienceTargets = context.getExperienceTargets(customTitleExperienceResume);
assert.equal(customTitleExperienceTargets.length, 2, "custom job titles added by the app should remain separate Experience targets");
assert.equal(customTitleExperienceTargets[1].title, "C something");
assert.equal(customTitleExperienceTargets[1].company, "C something");
const customTitleFollowupChange = {
  ...intelQuestionChange,
  id: "followup-custom-title-experience",
  placement: "experience",
  placements: ["experience"],
  experienceEntryKey: customTitleExperienceTargets[1].key,
  experienceAction: "enhance",
  experienceBulletIndex: "0",
  experienceDraftText: "Built a C and Python experiment.",
  status: "pending"
};
assert.match(
  context.applySingleChange(customTitleExperienceResume, customTitleFollowupChange),
  /C something 2022\nC something\n- Built a C and Python experiment\./,
  "later comments should be able to rewrite a bullet under a custom Experience title"
);
elements.get("#resumeInput").value = experienceFlowResume;
elements.get("#finalResume").value = newExperienceResume;
const followupNewExperienceChange = {
  ...intelQuestionChange,
  id: "followup-new-experience",
  placement: "experience",
  placements: ["experience"],
  experienceEntryKey: targetsAfterNewExperience.find((target) => target.title === "Analytics Consultant").key,
  experienceAction: "new",
  experienceDraftText: "Added Java evaluation tooling.",
  status: "pending"
};
const followupNewExperienceHtml = context.renderChangeCard(followupNewExperienceChange);
assert.match(
  followupNewExperienceHtml,
  /Analytics Consultant - Example AI/,
  "later comments should show newly added Experience entries in the job-title selector"
);
assert.match(
  context.applySingleChange(newExperienceResume, followupNewExperienceChange),
  /Analytics Consultant 2016 - 2018\nExample AI\n- Built ranking models in Python\.\n- Added Java evaluation tooling\./,
  "later comments should be able to add a bullet under a newly added Experience entry"
);

const crossPlacementResume = `ALEX MORGAN
alex.morgan@example.com

EXPERIENCE
Lead Data Analyst 2017 - 2024
Northstar Research
- Led machine-learning experiments.

EDUCATION
B.Sc. in Statistics 2009 - 2013
Northbridge University
M.Sc. in Data Science 2013 - 2016
Northbridge Institute

SELECTED PROJECTS
Resume Analyzer 2024
- Parsed resume content.`;
const acceptedProjectTargetRefreshChange = {
  ...intelQuestionChange,
  id: "accepted-project-target-refresh",
  placement: "projects",
  placements: ["projects"],
  acceptedPlacements: ["projects"],
  projectAction: "new",
  projectName: "Evaluation Toolkit",
  projectYear: "2025",
  projectLabel: "Personal project",
  projectDetails: "Built an evaluation workflow.",
  status: "accepted",
  acceptanceSequence: 1
};
const followupProjectTargetRefreshChange = {
  ...intelQuestionChange,
  id: "followup-project-target-refresh",
  placement: "projects",
  placements: ["projects"],
  projectAction: "new_bullet",
  projectEntryKey: "project-1",
  projectTargetName: "Evaluation Toolkit",
  projectTargetYear: "2025",
  projectDetails: "Added a Python comparison run.",
  status: "pending"
};
placementApi.resetState();
elements.get("#resumeInput").value = crossPlacementResume;
elements.get("#finalResume").value = crossPlacementResume;
placementApi.setCurrentChanges([acceptedProjectTargetRefreshChange, followupProjectTargetRefreshChange]);
const followupProjectHtml = context.renderChangeCard(followupProjectTargetRefreshChange);
assert.match(
  followupProjectHtml,
  /Evaluation Toolkit - 2025/,
  "a follow-up Project card should show a Project accepted by an earlier card"
);
const projectMaterialized = elements.get("#finalResume").value;
assert.match(
  projectMaterialized,
  /Evaluation Toolkit 2025\nPersonal project\n- Built an evaluation workflow\./,
  "opening a later Project card should synchronize it with the accepted Project"
);
assert.match(
  context.applySingleChange(projectMaterialized, followupProjectTargetRefreshChange),
  /Evaluation Toolkit 2025\nPersonal project\n- Built an evaluation workflow\.\n- Added a Python comparison run\./,
  "a follow-up Project card should add a bullet under the accepted Project"
);

const initialEducationTargets = context.getEducationTargets(crossPlacementResume);
const mastersTarget = initialEducationTargets.find((target) => target.degree === "M.Sc. in Data Science");
assert.ok(mastersTarget, "the baseline M.Sc. entry should be selectable before adding later education");
const acceptedEducationChange = {
  ...intelQuestionChange,
  id: "accepted-education-target-refresh",
  placement: "education",
  placements: ["education"],
  acceptedPlacements: ["education"],
  educationAction: "new",
  educationProgram: "Advanced ML Course",
  educationInstitution: "Example Institute",
  educationYear: "2025",
  educationDetails: "Focused on evaluation methods.",
  status: "accepted",
  acceptanceSequence: 1
};
const followupEducationChange = {
  ...intelQuestionChange,
  id: "followup-education-target-refresh",
  placement: "education",
  placements: ["education"],
  educationAction: "existing",
  educationEntryKey: mastersTarget.key,
  educationTargetDegree: mastersTarget.degree,
  educationTargetInstitution: mastersTarget.institution,
  educationTargetYears: mastersTarget.years,
  educationDetails: "Implemented the capstone work in Python.",
  status: "pending"
};
placementApi.setCurrentChanges([acceptedEducationChange, followupEducationChange]);
const followupEducationHtml = context.renderChangeCard(followupEducationChange);
assert.match(
  followupEducationHtml,
  /M\.Sc\. in Data Science - Northbridge Institute - 2013 - 2016/,
  "an Education snapshot should keep the selected M.Sc. entry after a newer entry changes positional keys"
);
const educationMaterialized = elements.get("#finalResume").value;
assert.match(
  educationMaterialized,
  /Advanced ML Course 2025\nExample Institute\nFocused on evaluation methods\./,
  "opening a later Education card should synchronize it with the accepted entry"
);
assert.match(
  context.applySingleChange(educationMaterialized, followupEducationChange),
  /M\.Sc\. in Data Science 2013 - 2016\nNorthbridge Institute\nImplemented the capstone work in Python\./,
  "an Education follow-up must still add detail to the originally selected M.Sc. entry"
);
placementApi.resetState();

const enhanceVertexChange = {
  ...intelQuestionChange,
  placement: "experience",
  experienceEntryKey: experienceTargets[1].key,
  experienceAction: "enhance",
  experienceBulletIndex: "0",
  suggestedText: "Programmed C++ scripts for data-quality experiments."
};
const enhancedVertexResume = context.applySingleChange(experienceFlowResume, enhanceVertexChange);
assert.match(
  enhancedVertexResume,
  /- Programmed C\+\+ scripts for data-quality experiments\./,
  "experience placement should replace the selected existing bullet with the rewritten bullet"
);
assert.doesNotMatch(
  enhancedVertexResume,
  /Built reporting tools for the internal data platform\. Used Python scripts/,
  "experience placement should not append text when enhancing an existing bullet"
);

const wrappedExperienceBulletResume = `ALEX MORGAN
alex.morgan@example.com

EXPERIENCE
Lead Data Analyst 2017 - 2024
Northstar Research
Built customer analytics workflows to improve audience segmentation workflows and optimize
production machine learning models. Utilized data science techniques to design and
execute experiments for evaluating campaign performance, overseeing planning,
implementation, and conducting detailed analysis.

EDUCATION
B.Sc. in Statistics 2009 - 2013
Northbridge University`;
const wrappedExperienceTarget = context.getExperienceTargets(wrappedExperienceBulletResume)[0];
const wrappedExperienceRewrite = {
  ...intelQuestionChange,
  id: "wrapped-existing-experience-rewrite",
  placement: "experience",
  placements: ["experience"],
  requiresUserWording: true,
  mode: "appendUserConfirmed",
  experienceEntryKey: wrappedExperienceTarget.key,
  experienceAction: "enhance",
  experienceBulletIndex: "0",
  experienceDraftText: "Built customer analytics workflows to improve audience segmentation workflows and optimize production machine learning models. Utilized data science techniques to design and execute experiments for evaluating campaign performance, overseeing planning, implementation, and conducting detailed analysis and collaboration.",
  status: "pending"
};
const rewrittenWrappedExperienceResume = context.applySingleChange(wrappedExperienceBulletResume, wrappedExperienceRewrite);
assert.match(
  rewrittenWrappedExperienceResume,
  /- Built customer analytics workflows[\s\S]*detailed analysis and collaboration\./,
  "a rewrite should replace a long Experience bullet reconstructed from wrapped PDF lines"
);
assert.doesNotMatch(
  rewrittenWrappedExperienceResume,
  /optimize\nproduction machine learning models/,
  "a wrapped source bullet should not remain beside its rewritten replacement"
);
placementApi.resetState();
elements.get("#resumeInput").value = wrappedExperienceBulletResume;
elements.get("#finalResume").value = "";
placementApi.setCurrentChanges([wrappedExperienceRewrite]);
context.previewChangeOnResume(wrappedExperienceRewrite, null, "experience");
assert.match(
  elements.get("#pdfPreview").innerHTML,
  /analysis <mark class="resume-preview-highlight">and collaboration<\/mark>\./,
  "a wrapped existing Experience rewrite preview should highlight only the added phrase"
);
placementApi.acceptPlacementFromCard(wrappedExperienceRewrite, "experience");
assert.match(
  elements.get("#finalResume").value,
  /detailed analysis and collaboration\./,
  "accepting a wrapped existing Experience rewrite should save the same replacement shown in Preview"
);

const duplicateBulletResume = `ALEX MORGAN
alex.morgan@example.com

EXPERIENCE
Lead Data Analyst 2017 2024
Northstar Research
Built internal tools.
Software Developer 2012 2013
Vertex Research
Built internal tools.

EDUCATION
B.Sc. in Statistics 2009 2013
Northbridge University`;
elements.get("#resumeInput").value = duplicateBulletResume;
elements.get("#finalResume").value = "";
const duplicateTargets = context.getExperienceTargets(duplicateBulletResume);
const duplicateBulletChange = {
  ...intelQuestionChange,
  placement: "experience",
  placements: ["experience"],
  experienceEntryKey: duplicateTargets[1].key,
  experienceAction: "enhance",
  experienceBulletIndex: "0",
  experienceDraftText: "Built internal tools in C++ for SDK validation.",
  experienceDraftContext: `${duplicateTargets[1].key}|enhance|0`,
  previewedPlacementKeys: {}
};
context.previewChangeOnResume(duplicateBulletChange, null, "experience");
assert.match(
  stripTags(elements.get("#pdfPreview").innerHTML),
  /Built internal[\s\S]*tools in C\+\+ for SDK validation/,
  "Experience rewrite preview should show the rewritten selected bullet"
);
assert.doesNotMatch(
  elements.get("#pdfPreview").innerHTML,
  /resume-preview-section-highlight/,
  "Experience rewrite preview should not fall back to highlighting the whole section"
);
const duplicateBulletUpdated = context.applySingleChange(duplicateBulletResume, duplicateBulletChange);
assert.match(
  duplicateBulletUpdated,
  /Northstar Research\nBuilt internal tools\.[\s\S]*Vertex Research\n- Built internal tools in C\+\+ for SDK validation\./,
  "Experience rewrite should replace the selected job bullet only, even when another job has identical bullet text"
);

const oneWordExperienceDiff = {
  ...intelQuestionChange,
  id: "one-word-experience-diff",
  placement: "experience",
  placements: ["experience"],
  experienceEntryKey: "experience-0",
  experienceAction: "enhance",
  experienceBulletIndex: "0",
  experienceDraftText: "Built collaborative internal tools.",
  experienceDraftContext: "experience-0|enhance|0",
  previewedPlacementKeys: {}
};
elements.get("#resumeInput").value = duplicateBulletResume;
elements.get("#finalResume").value = "";
context.previewChangeOnResume(oneWordExperienceDiff, null, "experience");
assert.match(
  elements.get("#pdfPreview").innerHTML,
  /Built <mark class="resume-preview-highlight">collaborative<\/mark> internal tools/,
  "one-word Experience rewrites should highlight only the changed word"
);
assert.doesNotMatch(
  elements.get("#pdfPreview").innerHTML,
  /<li class="resume-preview-highlight">Built collaborative internal tools/,
  "one-word Experience rewrites should not highlight the whole bullet"
);

const twoSeparateWordDiffs = {
  ...oneWordExperienceDiff,
  id: "two-separate-word-diffs",
  experienceEntryKey: duplicateTargets[1].key,
  experienceDraftText: "Built collaborative internal Python tools.",
  experienceDraftContext: `${duplicateTargets[1].key}|enhance|0`
};
elements.get("#resumeInput").value = duplicateBulletResume;
elements.get("#finalResume").value = "";
context.previewChangeOnResume(twoSeparateWordDiffs, null, "experience");
assert.match(
  elements.get("#pdfPreview").innerHTML,
  /Built <mark class="resume-preview-highlight">collaborative<\/mark> internal <mark class="resume-preview-highlight">Python<\/mark> tools/,
  "separate changed words in one bullet should each be highlighted"
);

const sentenceInsertionResume = `ALEX MORGAN
alex.morgan@example.com

EXPERIENCE
Lead Data Analyst 2017 - 2024
Northstar Research
- Built recommendation models. Deployed them to production.

EDUCATION
B.Sc. in Statistics 2009 - 2013
Northbridge University`;
const sentenceInsertionTargets = context.getExperienceTargets(sentenceInsertionResume);
const middleSentenceInsertion = {
  ...intelQuestionChange,
  id: "middle-sentence-insertion",
  placement: "experience",
  placements: ["experience"],
  experienceEntryKey: sentenceInsertionTargets[0].key,
  experienceAction: "enhance",
  experienceBulletIndex: "0",
  experienceDraftText: "Built recommendation models. Evaluated them with A/B tests. Deployed them to production.",
  experienceDraftContext: `${sentenceInsertionTargets[0].key}|enhance|0`,
  previewedPlacementKeys: {}
};
elements.get("#resumeInput").value = sentenceInsertionResume;
elements.get("#finalResume").value = "";
context.previewChangeOnResume(middleSentenceInsertion, null, "experience");
const middleSentencePreview = elements.get("#pdfPreview").innerHTML;
assert.match(
  middleSentencePreview,
  /Built recommendation models\. <mark class="resume-preview-highlight">Evaluated them with A\/B tests\.<\/mark> Deployed them to production\./,
  "inserting a sentence in the middle of an Experience bullet should highlight only the new sentence"
);
assert.doesNotMatch(
  middleSentencePreview,
  /<li class="resume-preview-highlight">Built recommendation models\./,
  "a middle-sentence insertion should not highlight the entire Experience bullet"
);

const endingSentenceInsertion = {
  ...middleSentenceInsertion,
  id: "ending-sentence-insertion",
  experienceDraftText: "Built recommendation models. Deployed them to production. Monitored the release after launch."
};
elements.get("#resumeInput").value = sentenceInsertionResume;
elements.get("#finalResume").value = "";
context.previewChangeOnResume(endingSentenceInsertion, null, "experience");
const endingSentencePreview = elements.get("#pdfPreview").innerHTML;
assert.match(
  endingSentencePreview,
  /Built recommendation models\. Deployed them to production\. <mark class="resume-preview-highlight">Monitored the release after launch\.<\/mark>/,
  "appending a sentence to an Experience bullet should highlight only the new ending sentence"
);
assert.doesNotMatch(
  endingSentencePreview,
  /<li class="resume-preview-highlight">Built recommendation models\./,
  "an ending-sentence insertion should not highlight the entire Experience bullet"
);

const intelDuplicateTargetHtml = elements.get("#pdfPreview").innerHTML;
assert.doesNotMatch(
  intelDuplicateTargetHtml.match(/Northstar Research<\/p>([\s\S]*?)<p>Software Developer/)?.[1] || "",
  /resume-preview-highlight/,
  "an Experience rewrite should not highlight a similar bullet under a different job"
);

placementApi.resetState();
elements.get("#resumeInput").value = experienceFlowResume;
elements.get("#finalResume").value = "";
const acceptedExperienceRewrite = {
  ...intelQuestionChange,
  id: "accepted-experience-rewrite-stays",
  placement: "experience",
  placements: ["experience"],
  experienceEntryKey: experienceTargets[1].key,
  experienceAction: "enhance",
  experienceBulletIndex: "0",
  experienceDraftText: "Programmed C++ scripts for data-quality experiments.",
  status: "pending",
  previewedPlacementKeys: {}
};
placementApi.setCurrentChanges([acceptedExperienceRewrite]);
context.previewChangeOnResume(acceptedExperienceRewrite, null, "experience");
placementApi.acceptPlacementFromCard(acceptedExperienceRewrite, "experience");
assert.match(
  elements.get("#finalResume").value,
  /- Programmed C\+\+ scripts for data-quality experiments\./,
  "accepted Experience rewrite should appear in the final resume"
);
context.applyAcceptedChanges();
assert.match(
  elements.get("#finalResume").value,
  /- Programmed C\+\+ scripts for data-quality experiments\./,
  "accepted Experience rewrite should not disappear when accepted changes are rebuilt"
);

const duplicateCompanyResume = `ALEX MORGAN
alex.morgan@example.com

EXPERIENCE
Data Analyst 2020 2024
Northstar Research
Built ranking models.
Analytics Consultant 2018 2020
Northstar Research
Built ranking models.

EDUCATION
B.Sc. in Statistics 2009 2013
Northbridge University`;
const duplicateCompanyTargets = context.getExperienceTargets(duplicateCompanyResume);
const duplicateCompanyNewBullet = {
  ...intelQuestionChange,
  placement: "experience",
  placements: ["experience"],
  experienceEntryKey: duplicateCompanyTargets[1].key,
  experienceAction: "new",
  experienceDraftText: "Added Java evaluation tooling.",
  status: "pending"
};
const duplicateCompanyUpdated = context.applySingleChange(duplicateCompanyResume, duplicateCompanyNewBullet);
assert.match(
  duplicateCompanyUpdated,
  /Data Analyst 2020 2024\nNorthstar Research\nBuilt ranking models\.\nAnalytics Consultant 2018 2020\nNorthstar Research\nBuilt ranking models\.\n- Added Java evaluation tooling\./,
  "new Experience bullet should be inserted under the selected role even when the company name repeats"
);

const educationExistingDetailChange = {
  ...intelQuestionChange,
  placement: "education",
  placements: ["education"],
  educationAction: "existing",
  educationEntryKey: "education-0",
  educationDetails: "Implemented capstone experiments in Python.",
  educationDraftContext: "existing|education-0|"
};
const educationWithDetail = context.applySingleChange(`ALEX MORGAN
alex.morgan@example.com

EXPERIENCE
Lead Data Analyst 2022
Northstar Research

EDUCATION
M.Sc. in Data Science 2013 2016
Northbridge Institute
advised by Dr. Taylor Reed and Dr. Morgan Stone.
B.Sc. in Statistics 2009 2013
Northbridge University`, educationExistingDetailChange);
assert.match(
  educationWithDetail,
  /M\.Sc\. in Data Science 2013 2016\nNorthbridge Institute\nadvised by Dr. Taylor Reed and Dr. Morgan Stone\.\nImplemented capstone experiments in Python\.\nB\.Sc\./,
  "Education placement should add a new detail under the selected existing education entry"
);

const newVertexBulletChange = {
  ...intelQuestionChange,
  placement: "experience",
  experienceEntryKey: experienceTargets[1].key,
  experienceAction: "new",
  suggestedText: "Used Python scripts for quality-monitoring experiments."
};
const newVertexBulletResume = context.applySingleChange(experienceFlowResume, newVertexBulletChange);
assert.match(
  newVertexBulletResume,
  /Vertex Research\nBuilt reporting tools for the internal data platform\.\n- Used Python scripts for quality-monitoring experiments\./,
  "experience placement should add a new bullet under the selected job"
);
elements.get("#resumeInput").value = experienceFlowResume;
elements.get("#finalResume").value = "";
context.previewChangeOnResume(newVertexBulletChange, null, "experience");
assert.match(
  elements.get("#pdfPreview").innerHTML,
  /<li class="resume-preview-highlight">Used Python scripts for quality-monitoring experiments\.<\/li>/,
  "previewing a new Experience bullet should highlight the complete newly inserted bullet, not only a repeated word"
);

const screenshotStyleExperienceResume = `ALEX MORGAN
alex.morgan@example.com

EXPERIENCE
Senior Data Scientist, ShopStream
2020 - 2024
- Developed recommendation models for e-commerce personalization.
- Partnered with product managers and engineers to deploy machine learning models into production environments.

EDUCATION
M.Sc. Computer Science, Example University
2015 - 2017

SKILLS
Machine Learning • A/B Testing`;
const screenshotStyleExperienceTarget = context.getExperienceTargets(screenshotStyleExperienceResume)[0];
assert.equal(screenshotStyleExperienceTarget.title, "Senior Data Scientist", "comma-separated job title and company should remain selectable");
assert.equal(screenshotStyleExperienceTarget.company, "ShopStream", "comma-separated company should remain selectable");
const inconsistentModeExperienceChange = {
  ...intelQuestionChange,
  id: "inconsistent-mode-new-experience-bullet",
  type: "ask_user",
  mode: "noteOnly",
  requiresUserWording: false,
  placements: ["experience"],
  placement: "experience",
  experienceEntryKey: screenshotStyleExperienceTarget.key,
  experienceAction: "new",
  experienceDraftText: "Something production something",
  status: "pending",
  previewedPlacementKeys: {}
};
placementApi.resetState();
elements.get("#resumeInput").value = screenshotStyleExperienceResume;
elements.get("#finalResume").value = "";
placementApi.setCurrentChanges([inconsistentModeExperienceChange]);
context.previewChangeOnResume(inconsistentModeExperienceChange, null, "experience");
assert.match(
  elements.get("#pdfPreview").innerHTML,
  /<li class="resume-preview-highlight">Something production something\.<\/li>/,
  "Experience preview should highlight the complete typed new bullet even if a provider sent an inconsistent mode"
);
placementApi.acceptPlacementFromCard(inconsistentModeExperienceChange, "experience");
assert.match(
  elements.get("#finalResume").value,
  /ShopStream\n2020 - 2024[\s\S]*- Something production something\./,
  "Add to Experience should persist a typed new bullet even if a provider sent an inconsistent mode"
);

const multiSentenceRewrite = {
  id: "multi-sentence-rewrite",
  type: "rewrite",
  section: "Statement",
  originalText: "Experienced Lead Data Analyst with a strong track record of leading impactful projects in machine learning, big data, and recommendation systems.",
  suggestedText: "Lead Data Analyst with a strong track record in machine learning and recommendation systems. Leads data-driven product improvements from research through production.",
  whyItHelps: "Rewrites the statement.",
  evidence: "Resume supported",
  riskLevel: "low",
  supportLevel: "resume_supported",
  status: "pending",
  mode: "replace"
};
elements.get("#resumeInput").value = `ALEX MORGAN
alex.morgan@example.com

STATEMENT
${multiSentenceRewrite.originalText}

EXPERIENCE
Lead Data Analyst 2022
Northstar Research

EDUCATION
B.Sc. Statistics 2009 - 2013
Northbridge University`;
elements.get("#finalResume").value = "";
context.previewChangeOnResume(multiSentenceRewrite, { value: multiSentenceRewrite.suggestedText });
assert.match(
  elements.get("#pdfPreview").innerHTML,
  /<mark class="resume-preview-highlight">Lead Data Analyst[\s\S]*through production\.<\/mark>/,
  "multi-sentence rewrites should highlight the full rewritten paragraph when a small diff would be unclear"
);

const punctuationOnlyStatementRewrite = {
  id: "punctuation-only-statement-rewrite",
  type: "rewrite",
  section: "Statement",
  originalText: "Experienced researcher.",
  suggestedText: "Experienced researcher!",
  whyItHelps: "Uses the preferred punctuation.",
  evidence: "Resume supported",
  riskLevel: "low",
  supportLevel: "resume_supported",
  status: "pending",
  mode: "replace"
};
elements.get("#resumeInput").value = `ALEX MORGAN
alex.morgan@example.com

STATEMENT
Experienced researcher.

EXPERIENCE
Lead Data Analyst 2022
Northstar Research

EDUCATION
B.Sc. Statistics 2009 - 2013
Northbridge University`;
elements.get("#finalResume").value = "";
context.previewChangeOnResume(punctuationOnlyStatementRewrite, { value: punctuationOnlyStatementRewrite.suggestedText });
assert.match(
  elements.get("#pdfPreview").innerHTML,
  /<p class="resume-preview-highlight">Experienced researcher!<\/p>/,
  "a tiny Statement rewrite should still preview the changed statement block"
);

const longBeforeShortAfterCard = context.renderChangeCard({
  id: "long-window",
  type: "rewrite",
  section: "Skills",
  originalText: "Machine Learning Statistical Analysis Big Data Business Oriented Deployment and Productionization A/B Testing Ethics and Privacy Multitasking",
  suggestedText: "Machine Learning, Statistical Analysis, Big Data, Deployment & Productionization, A/B Testing, Ethics & Privacy",
  whyItHelps: "",
  evidence: "",
  riskLevel: "low",
  supportLevel: "resume_supported",
  status: "pending",
  mode: "replace",
  commentNumber: 1
});
assert.equal(
  (longBeforeShortAfterCard.match(/large-text-window/g) || []).length,
  2,
  "Before and After windows should both become large when either side has long text"
);

const designedEducationHtml = context.formatDesignedResumeForPrint(`ALEX MORGAN
alex.morgan@example.com

EXPERIENCE
Lead Data Analyst 2022
Northstar Research

EDUCATION
Python course 2021
La la la
Perl Course 2022
Courses il Bla bla`);
assert.match(
  designedEducationHtml,
  /<p class="entry-company">Courses il Bla bla<\/p>/,
  "added education provider should render as the institution/provider line even without university keywords"
);
assert.doesNotMatch(
  designedEducationHtml,
  /<p class="entry-authors">Courses il Bla bla<\/p>/,
  "added education provider should not be styled as optional details"
);

const designedCertificationHtml = context.formatDesignedResumeForPrint(`ALEX MORGAN
alex.morgan@example.com

EXPERIENCE
Lead Data Analyst 2022
Northstar Research

EDUCATION
B.Sc. Statistics 2009 - 2013
Northbridge University

CERTIFICATIONS
Perl certificate 2020
1258`);
assert.match(designedCertificationHtml, /certification-row/, "designed Certifications should render grouped credential rows");
assert.doesNotMatch(designedCertificationHtml, /<li>1258<\/li>/, "certificate issuer should not become a separate bullet");

const certificationCredentialChange = {
  ...intelQuestionChange,
  id: "certification-credential",
  placements: ["certifications"],
  placement: "certifications",
  certificationName: "Building RAG Applications",
  certificationIssuer: "Cohere",
  certificationYear: "2024",
  certificationCredentialId: "987654321",
  status: "pending"
};
const certificationCredentialResume = context.applySingleChange(strengthsResume, certificationCredentialChange);
assert.match(
  certificationCredentialResume,
  /CERTIFICATIONS\nBuilding RAG Applications 2024\nCohere \| Credential ID: 987654321/,
  "certification placement should keep issuer and credential ID together in one grouped entry"
);
const designedCredentialHtml = context.formatDesignedResumeForPrint(certificationCredentialResume);
assert.match(designedCredentialHtml, /Building RAG Applications/, "designed certification should show the certificate name");
assert.match(designedCredentialHtml, /Cohere \| Credential ID: 987654321/, "designed certification should show issuer and credential ID on the same detail line");
assert.doesNotMatch(designedCredentialHtml, /<li>Credential ID: 987654321<\/li>/, "credential ID should not become a separate bullet");

const pdfPreview = elements.get("#pdfPreview");
const pdfPreviewPanel = elements.get("#pdfPreviewPanel");
const activeCommentPanel = elements.get("#activeCommentPanel");
const missingExperiencePanel = elements.get("#missingExperiencePanel");
const changeCards = elements.get("#changeCards");
const finalResume = elements.get("#finalResume");
const resumeInput = elements.get("#resumeInput");
const exportStyleSelect = elements.get("#exportStyleSelect");
const aiStatus = elements.get("#aiStatus");

resumeInput.value = rewriteHtml.replace(/<[^>]*>/g, "");
finalResume.value = `ALEX MORGAN
050-555-0198 alex.morgan@example.com

EXPERIENCE
Lead Data Analyst 2022
Northstar Research
- Built customer analytics workflows to improve audience segmentation workflows and optimize production machine learning models.

EDUCATION
M.Sc. in Data Science 2013-2016
Northbridge Institute`;
exportStyleSelect.value = "ats";
context.previewChangeOnResume(rewriteChange, { value: rewriteChange.suggestedText });
assert.equal(pdfPreviewPanel.hidden, false, "preview should open the preview panel");
assert.match(pdfPreview.innerHTML, /Return to Review/, "preview should include return-to-review control");
assert.equal(activeCommentPanel.hidden, false, "preview should keep/open the active comment panel");

const testApi = context.window.__roleFitTest;
testApi.resetState();
assert.ok(
  testApi.buildLocalSuggestionFallbackCards(resumeMissingExperienceYear, "machine learning production models").length > 0,
  "test API fallback should produce comments when malformed AI JSON prevents using model output"
);
const specificFallbackCards = testApi.buildLocalSuggestionFallbackCards(resumeMissingExperienceYear, "Python Java SQL RAG");
assert.ok(specificFallbackCards.length >= 2, "job-specific fallback should produce one card per uncovered requirement");
assert.doesNotMatch(
  specificFallbackCards.map((card) => card.missingTerm || card.promptText || "").join("\n"),
  /Targeted job evidence/i,
  "job-specific fallback should never use the vague Targeted job evidence placeholder"
);
assert.match(
  specificFallbackCards.map((card) => card.missingTerm || "").join(" "),
  /(Python|Java|SQL|RAG|rag)/i,
  "job-specific fallback should name concrete missing requirements"
);
assert.equal(
  testApi.buildLocalSuggestionFallbackCards(`ALEX MORGAN
050-555-0198 alex.morgan@example.com

EXPERIENCE
Lead Data Analyst 2022
Northstar Research
- Utilized data-driven methodologies to inform decision-making and strategy.`, "").length,
  0,
  "fallback should not produce phrasing-polish comments during general resume review"
);
const staleNumberChange = {
  id: "stale-number",
  type: "ask_header",
  section: "Header",
  originalText: "",
  suggestedText: "",
  promptText: "The resume header is missing the full name.",
  whyItHelps: "",
  evidence: "Missing from header.",
  riskLevel: "high",
  supportLevel: "user_confirmation_needed",
  status: "pending",
  mode: "headerConfirmation",
  missingTerm: "full name",
  requiresUserWording: true,
  requiresHeaderWording: true,
  headerField: "name",
  pass: testApi.passes.cleanup,
  commentNumber: 5
};

resumeInput.value = resumeMissingName;
finalResume.value = "";
testApi.setActivePass(testApi.passes.cleanup);
testApi.setCurrentChanges([staleNumberChange]);
testApi.renderChanges();
assert.equal(staleNumberChange.commentNumber, 1, "single visible open comment should be renumbered to 1");
assert.match(pdfPreview.innerHTML, />1<\/button>/, "preview should show renumbered marker 1");
assert.doesNotMatch(pdfPreview.innerHTML, />5<\/button>/, "preview should not keep stale marker 5");

staleNumberChange.commentNumber = 5;
testApi.renderNumberedCommentPreview();
assert.equal(staleNumberChange.commentNumber, 1, "direct preview render should also renumber stale comments");
assert.match(pdfPreview.innerHTML, />1<\/button>/, "direct preview should show marker 1");
assert.doesNotMatch(pdfPreview.innerHTML, />5<\/button>/, "direct preview should not show stale marker 5");
assert.doesNotMatch(
  pdfPreview.innerHTML,
  /resume-preview-highlight/,
  "numbered comment view should not use the preview highlight class"
);

const cssSource = await readFile(new URL("../src/styles.css", import.meta.url), "utf8");
const commentAnchorRule = cssSource.match(/\.resume-comment-anchor\s*\{([\s\S]*?)\}/)?.[1] || "";
assert.doesNotMatch(
  commentAnchorRule,
  /background:\s*rgba\(255,\s*236,\s*102/i,
  "numbered comment anchors should not look like yellow preview highlights"
);

const headerFirstChange = {
  ...staleNumberChange,
  id: "header-first",
  status: "pending",
  commentNumber: 5
};
const laterDateChange = {
  ...context.collectMissingDateQuestions(resumeMissingExperienceYear)[0],
  pass: testApi.passes.cleanup,
  commentNumber: 1
};
testApi.setCurrentChanges([laterDateChange, headerFirstChange]);
testApi.renderChanges();
assert.equal(headerFirstChange.commentNumber, 1, "missing header comments should sort before resume-body comments");
assert.equal(laterDateChange.commentNumber, 2, "body comments should follow header comments");
assert.match(pdfPreview.innerHTML, /Needs placement preview, no exact resume line yet:[\s\S]*>1<\/button>/, "unanchored missing header marker should use renumbered value 1");

const allHeaderChanges = context.collectMissingHeaderQuestions(resumeMissingAllHeaderFields).map((change) => ({
  ...change,
  pass: testApi.passes.cleanup,
  commentNumber: 20
}));
const bodyDateChange = {
  ...context.collectMissingDateQuestions(resumeMissingAllHeaderFields)[0],
  pass: testApi.passes.cleanup,
  commentNumber: 2
};
resumeInput.value = resumeMissingAllHeaderFields;
finalResume.value = "";
testApi.setCurrentChanges([bodyDateChange, ...allHeaderChanges]);
testApi.renderChanges();
assert.equal(
  JSON.stringify(allHeaderChanges.map((change) => change.commentNumber)),
  JSON.stringify([1, 2, 3]),
  "multiple missing header fields should take the first comment numbers"
);
assert.equal(bodyDateChange.commentNumber, 4, "resume-body comments should follow all missing header comments");
assert.match(pdfPreview.innerHTML, /Needs placement preview, no exact resume line yet:[\s\S]*>1<\/button>[\s\S]*>2<\/button>[\s\S]*>3<\/button>/, "unanchored header markers should show 1, 2, 3 in the banner");

testApi.setCurrentChanges([staleNumberChange]);
resumeInput.value = resumeMissingName;
finalResume.value = "";
testApi.renderChanges();
testApi.rejectChangeFromCard(staleNumberChange);
assert.equal(staleNumberChange.status, "rejected");
assert.equal(staleNumberChange.commentNumber, "", "rejected comment should lose its number");
assert.doesNotMatch(pdfPreview.innerHTML, /resume-comment-marker/, "rejected comment marker should disappear from preview");
testApi.refreshResumeCheckPass(resumeMissingName);
assert.equal(
  testApi.getCurrentChanges().filter((change) => change.status === "pending" || change.status === "needs_user_writing").length,
  0,
  "rejected missing-name comment should not be recreated by the next resume check"
);
assert.doesNotMatch(pdfPreview.innerHTML, /resume-comment-marker/, "rejected comment marker should stay gone after rerun");
testApi.ensureFinalResumeText();
assert.match(aiStatus.textContent, /already reviewed or dismissed/i, "export warning should acknowledge dismissed mandatory card");
assert.doesNotMatch(aiStatus.textContent, /review the mandatory cards first/i, "export warning should not ask to review dismissed cards again");
assert.match(pdfPreview.innerHTML, /All comments are done/, "preview should show a done message when no open comments remain");
assert.match(
  pdfPreview.innerHTML,
  /updated resume preview is ready\.[\s\S]*View Updated Preview/i,
  "done message should explain that the preview is updated with accepted changes"
);
assert.doesNotMatch(pdfPreview.innerHTML, /ready below/i, "done message should not say the preview is below");
assert.match(
  pdfPreview.innerHTML,
  /data-action="preview-export-style"[\s\S]*ATS-friendly[\s\S]*Designed/i,
  "done message should expose format options next to the updated preview button"
);
assert.match(
  pdfPreview.innerHTML,
  /data-action="export-pdf-inline"[\s\S]*Export PDF/i,
  "done message should expose Export PDF next to the updated preview controls"
);
assert.match(
  pdfPreview.innerHTML,
  /data-action="return-review"[\s\S]*Return to Review/i,
  "done message should expose a clear return-to-review button"
);
aiStatus.textContent = "The resume still has missing essential fields. You can export anyway, but review the mandatory cards first.";
testApi.setCurrentChanges([]);
testApi.renderNumberedCommentPreview();
assert.doesNotMatch(
  aiStatus.textContent,
  /review the mandatory cards first/i,
  "stale missing-essential-fields errors should clear when no comments remain"
);

testApi.resetState();
resumeInput.value = resumeMissingExperienceYear;
finalResume.value = "";
testApi.setActivePass(testApi.passes.cleanup);
const backgroundSuggestion = {
  ...generalPhrasingRewrite,
  id: "background-suggestion",
  status: "pending",
  pass: testApi.passes.suggestions
};
testApi.setPassChanges(testApi.passes.suggestions, [backgroundSuggestion], { activate: false });
assert.equal(
  testApi.getActivePass(),
  testApi.passes.cleanup,
  "updating Suggestions in the background should not switch away from Resume Check"
);
assert.match(pdfPreview.innerHTML, /Resume Check/, "preview should remain on the active Resume Check pass");
assert.match(
  pdfPreview.innerHTML,
  /1 open comment remains in Suggestions/,
  "done/current-pass preview should mention open comments in the other pass"
);
assert.doesNotMatch(
  pdfPreview.innerHTML,
  /updated resume preview is ready/i,
  "updated preview callout should wait until all passes have no open comments"
);
assert.match(pdfPreview.innerHTML, /data-preview-pass="cleanup"/, "preview pass control should expose a clickable Resume Check button");
assert.match(pdfPreview.innerHTML, /data-preview-pass="suggestions"/, "preview pass control should expose a clickable Suggestions button");
assert.match(pdfPreview.innerHTML, /data-preview-pass="missing_experience"/, "preview pass control should expose a clickable Missing Experience button");

context.markPassesLoading([testApi.passes.suggestions, testApi.passes.missingExperience]);
assert.match(elements.get("#suggestionsPassBtn").textContent, /Suggestions - thinking$/, "Suggestions tab should show thinking while AI is running");
assert.match(elements.get("#missingExperiencePassBtn").textContent, /Missing Experience - thinking$/, "Missing Experience tab should show thinking while AI is running");
assert.doesNotMatch(elements.get("#suggestionsPassBtn").textContent, /\(0\)/, "thinking tabs should not show a misleading zero count");
assert.match(pdfPreview.innerHTML, /Suggestions - thinking/, "preview pass pill should show Suggestions thinking without needing a click");
assert.match(pdfPreview.innerHTML, /Missing Experience - thinking/, "preview pass pill should show Missing Experience thinking without needing a click");
assert.doesNotMatch(pdfPreview.innerHTML, /thinking\.\.\./, "thinking labels should not use three dots");
context.clearPassesLoading([testApi.passes.suggestions, testApi.passes.missingExperience]);
testApi.setPassChanges(testApi.passes.suggestions, [], { activate: false });
testApi.setPassChanges(testApi.passes.missingExperience, [], { activate: false });
assert.match(elements.get("#suggestionsPassBtn").textContent, /Suggestions - none/, "empty completed AI tab should say none");
assert.match(elements.get("#missingExperiencePassBtn").textContent, /Missing Experience - none/, "empty completed Missing Experience tab should say none");
assert.match(pdfPreview.innerHTML, /Suggestions - none/, "preview pass pill should show completed empty Suggestions state immediately");
assert.match(pdfPreview.innerHTML, /Missing Experience - none/, "preview pass pill should show completed empty Missing Experience state immediately");

const doneSuggestion = {
  ...generalPhrasingRewrite,
  id: "done-suggestion",
  pass: testApi.passes.suggestions,
  status: "pending"
};
testApi.setPassChanges(testApi.passes.suggestions, [doneSuggestion], { activate: false });
assert.match(pdfPreview.innerHTML, /Suggestions - 1/, "preview pass pill should show the completed Suggestions count immediately");
testApi.rejectChangeFromCard(doneSuggestion);
assert.match(elements.get("#suggestionsPassBtn").textContent, /Suggestions - done/, "completed AI tab with handled comments should say done");

const autoCleanup = {
  ...staleNumberChange,
  id: "auto-cleanup",
  status: "pending",
  pass: testApi.passes.cleanup
};
const autoSuggestion = {
  ...generalPhrasingRewrite,
  id: "auto-suggestion",
  status: "pending",
  pass: testApi.passes.suggestions
};
const autoMissing = {
  ...normalizedProgrammingQuestion,
  id: "auto-missing",
  status: "pending",
  pass: testApi.passes.missingExperience
};
testApi.resetState();
resumeInput.value = resumeMissingName;
finalResume.value = "";
testApi.setCurrentChanges([autoCleanup, autoSuggestion, autoMissing]);
testApi.setActivePass(testApi.passes.cleanup);
testApi.rejectChangeFromCard(autoCleanup);
assert.equal(testApi.getActivePass(), testApi.passes.suggestions, "finishing Resume Check should move to the next tab with open comments");
testApi.rejectChangeFromCard(autoSuggestion);
assert.equal(testApi.getActivePass(), testApi.passes.missingExperience, "finishing Suggestions should move to Missing Experience when it has open comments");

testApi.resetState();
resumeInput.value = `ALEX MORGAN
alex.morgan@example.com

EXPERIENCE
Data Analyst 2020 2024
Northstar Research
Built recommendation systems.

EDUCATION
B.Sc. Statistics 2009 2013
Northbridge University

SKILLS
Machine Learning • Statistical Analysis`;
finalResume.value = "";
const missingPythonComment = {
  ...normalizedProgrammingQuestion,
  id: "missing-python-table",
  missingTerm: "Python",
  promptText: "Do you have real, resume-worthy experience with Python?",
  status: "pending",
  pass: testApi.passes.missingExperience
};
testApi.setCurrentChanges([missingPythonComment]);
testApi.setActivePass(testApi.passes.missingExperience);
testApi.renderChanges();
assert.doesNotMatch(pdfPreview.innerHTML, /missing-experience-review-list/, "Missing Experience list should not be embedded above the resume");
assert.equal(missingExperiencePanel.hidden, false, "Missing Experience side panel should appear next to the resume");
assert.match(missingExperiencePanel.innerHTML, /missing-experience-review-list/, "Missing Experience comments should render as a compact side-panel list");
assert.match(missingExperiencePanel.innerHTML, /missing-experience-label-button[\s\S]*Python/, "Missing Experience list should show the skill/topic label");
assert.match(missingExperiencePanel.innerHTML, /missing-experience-row" data-missing-experience-id="missing-python-table"/, "Missing Experience row should carry the same id as the label button");
assert.match(missingExperiencePanel.innerHTML, /data-comment-id="missing-python-table"/, "Missing Experience number button should also be clickable by id");
assert.doesNotMatch(pdfPreview.innerHTML, /resume-comment-anchor/, "Missing Experience comments should not be anchored inside the resume before placement is chosen");
assert.equal(testApi.openMissingExperienceCommentById("missing-python-table"), true, "Missing Experience side-panel row should open its comment by id");
assert.equal(missingExperiencePanel.hidden, true, "Opening a Missing Experience comment should hide the side list and use that side space");
assert.equal(activeCommentPanel.hidden, false, "Opening a Missing Experience comment should show the active comment panel");
assert.match(activeCommentPanel.innerHTML, /Python/, "Opening a Missing Experience side-panel row should show the selected topic");

const remainingMissingComment = {
  ...missingPythonComment,
  id: "missing-java-return-list",
  missingTerm: "Java",
  promptText: "Do you have real, resume-worthy experience with Java?"
};
testApi.setCurrentChanges([missingPythonComment, remainingMissingComment]);
testApi.setActivePass(testApi.passes.missingExperience);
context.renderActiveCommentPanel(missingPythonComment);
testApi.rejectChangeFromCard(missingPythonComment);
assert.equal(activeCommentPanel.hidden, true, "closing one Missing Experience card should close its comment panel");
assert.equal(missingExperiencePanel.hidden, false, "the remaining Missing Experience list should return automatically");
assert.match(missingExperiencePanel.innerHTML, /Java/, "the returned list should show the next outstanding topic");

const acceptedMissingComment = {
  ...missingPythonComment,
  id: "missing-kotlin-return-list",
  missingTerm: "Kotlin",
  promptText: "Do you have real, resume-worthy experience with Kotlin?",
  placements: ["skills"],
  placement: "skills",
  acceptedPlacements: [],
  skillDraftText: "Kotlin",
  status: "pending"
};
const remainingAfterAccept = {
  ...remainingMissingComment,
  id: "missing-java-after-accept",
  status: "pending"
};
resumeInput.value = resumeMissingExperienceYear;
finalResume.value = "";
testApi.resetState();
testApi.setCurrentChanges([acceptedMissingComment, remainingAfterAccept]);
testApi.setActivePass(testApi.passes.missingExperience);
context.renderActiveCommentPanel(acceptedMissingComment);
testApi.acceptPlacementFromCard(acceptedMissingComment, "skills");
assert.equal(activeCommentPanel.hidden, true, "accepting one complete Missing Experience card should close its comment panel");
assert.equal(missingExperiencePanel.hidden, false, "the remaining Missing Experience list should return automatically after accepting");
assert.match(missingExperiencePanel.innerHTML, /Java/, "the returned list after accepting should show the next outstanding topic");

const verboseCollaborationQuestion = {
  ...missingPythonComment,
  id: "missing-collaboration-verbose",
  status: "pending",
  missingTerm: "Details of collaboration beyond general statements",
  promptText: "What details of collaboration can you confirm?",
  evidence: "The resume has general cross-functional statements but no concrete collaboration example."
};
const shortCollaborationQuestion = {
  ...missingPythonComment,
  id: "missing-collaboration-short",
  status: "pending",
  missingTerm: "collaboration",
  promptText: "Do you have resume-worthy experience with collaboration?",
  evidence: "Collaboration is listed in the job requirements."
};
const dedupedCollaborationQuestions = context.prepareActionableChanges(
  resumeInput.value,
  [verboseCollaborationQuestion, shortCollaborationQuestion]
);
assert.equal(dedupedCollaborationQuestions.length, 1, "a verbose collaboration description and a collaboration topic should produce one Missing Experience question");
const distinctProgrammingQuestions = context.prepareActionableChanges(
  resumeInput.value,
  ["C++", "Python", "Java", "Perl"].map((term, index) => ({
    ...missingPythonComment,
    id: `missing-language-${index}`,
    missingTerm: term,
    promptText: `Do you have real, resume-worthy experience with ${term}?`,
    evidence: "The job lists programming languages as a requirement."
  }))
);
assert.equal(distinctProgrammingQuestions.length, 4, "each missing programming language should stay as its own question");
testApi.setCurrentChanges([verboseCollaborationQuestion]);
testApi.setActivePass(testApi.passes.missingExperience);
activeCommentPanel.hidden = true;
testApi.renderChanges();
assert.match(missingExperiencePanel.innerHTML, /<button[^>]*>Collaboration<\/button>/, "the Missing Experience list should use a short topic label");
assert.equal(testApi.openMissingExperienceCommentById("missing-collaboration-verbose"), true, "the concise Missing Experience row should open its full comment");
assert.match(activeCommentPanel.innerHTML, /Details of collaboration beyond general statements/, "the opened comment should retain the detailed topic explanation");

const suffixInsertionHighlight = {
  ...middleSentenceInsertion,
  id: "suffix-two-word-insertion",
  experienceDraftText: "Built recommendation models. Deployed them to production with Python.",
  experienceDraftContext: `${sentenceInsertionTargets[0].key}|enhance|0`
};
elements.get("#resumeInput").value = sentenceInsertionResume;
elements.get("#finalResume").value = "";
context.previewChangeOnResume(suffixInsertionHighlight, null, "experience");
assert.match(
  elements.get("#pdfPreview").innerHTML,
  /Deployed them to production <mark class="resume-preview-highlight">with Python<\/mark>\./,
  "adding two words to an existing Experience bullet should highlight only those words"
);
assert.doesNotMatch(
  elements.get("#pdfPreview").innerHTML,
  /<li class="resume-preview-highlight">Deployed them to production with Python\./,
  "a short Experience suffix should not highlight the whole bullet"
);

const structuredEducationRewriteResume = `ALEX MORGAN
alex.morgan@example.com

EXPERIENCE
Lead Data Analyst 2017 - 2024
Northstar Research
Built customer analytics workflows.

EDUCATION
M.Sc. in Data Science with a capstone in Applied Analytics, 2013 - 2016
advised by Dr. Taylor Reed and Dr. Morgan Stone.
Northbridge Institute of Technology
B.Sc. in Statistics 2009 - 2013
Northbridge University`;
const structuredEducationRewrite = {
  id: "structured-education-rewrite",
  type: "rewrite",
  section: "Education",
  originalText: `M.Sc. in Data Science with a capstone in Applied Analytics,
advised by Dr. Taylor Reed and Dr. Morgan Stone.`,
  suggestedText: "M.Sc. in Data Science",
  whyItHelps: "De-emphasizes capstone detail for the target role.",
  evidence: "resume_supported",
  riskLevel: "low",
  supportLevel: "resume_supported",
  status: "pending",
  mode: "replace"
};
elements.get("#resumeInput").value = structuredEducationRewriteResume;
elements.get("#finalResume").value = "";
placementApi.resetState();
placementApi.setCurrentChanges([structuredEducationRewrite]);
context.previewChangeOnResume(structuredEducationRewrite, null);
assert.match(
  elements.get("#pdfPreview").innerHTML,
  /resume-preview-(?:highlight|section-highlight)[\s\S]*M\.Sc\. in Data Science/,
  "a structured Education rewrite should open Preview instead of reporting an unmatched change"
);
assert.doesNotMatch(
  elements.get("#pdfPreview").innerHTML,
  /advised by Dr. Taylor Reed and Dr. Morgan Stone/,
  "Education Preview should remove the adviser detail specified by the rewrite"
);
placementApi.acceptChangeFromCard(structuredEducationRewrite, null);
assert.equal(structuredEducationRewrite.status, "accepted", "a structured Education rewrite should be accepted");
assert.match(
  elements.get("#finalResume").value,
  /M\.Sc\. in Data Science 2013 - 2016\nNorthbridge Institute of Technology/,
  "accepting an Education rewrite should preserve the years and institution"
);
assert.doesNotMatch(
  elements.get("#finalResume").value,
  /capstone in Applied Analytics|advised by Dr. Taylor Reed/,
  "accepting an Education rewrite should remove only the capstone/adviser detail requested"
);

const removalPreviewResume = `ALEX MORGAN
alex.morgan@example.com

STATEMENT
Research engineer focused on machine learning.

EXPERIENCE
Lead Data Analyst 2020 - 2024
Northstar Research
- Built recommendation experiments.
Course Assistant 2016 - 2018
Example University
- Facilitated Data Fundamentals.

EDUCATION
B.Sc. in Statistics 2012 - 2016
Example University`;
const removeTeachingBullet = {
  id: "remove-teaching-bullet-preview",
  type: "remove_or_deemphasize",
  section: "Experience",
  originalText: "- Facilitated Data Fundamentals.",
  suggestedText: "Consider removing this less relevant teaching bullet.",
  whyItHelps: "This role is less relevant to the target position.",
  evidence: "Resume supported",
  riskLevel: "low",
  supportLevel: "resume_supported",
  status: "pending",
  mode: "removeOrReplace"
};
elements.get("#resumeInput").value = removalPreviewResume;
elements.get("#finalResume").value = "";
context.previewChangeOnResume(removeTeachingBullet, null);
assert.match(
  elements.get("#pdfPreview").innerHTML,
  /resume-preview-removal-section-block[\s\S]*Lead Data Analyst[\s\S]*Course Assistant/,
  "a removal preview should show the remaining Experience section as context"
);
assert.doesNotMatch(
  elements.get("#pdfPreview").innerHTML,
  /Facilitated Data Fundamentals/,
  "a removal preview should omit the exact Experience bullet"
);
const removeTeachingSubsection = {
  ...removeTeachingBullet,
  id: "remove-teaching-subsection-preview",
  originalText: "Example University",
  suggestedText: "Consider removing this less relevant teaching role."
};
context.previewChangeOnResume(removeTeachingSubsection, null);
assert.match(
  elements.get("#pdfPreview").innerHTML,
  /resume-preview-removal-section-block[\s\S]*Lead Data Analyst/,
  "removing an Experience subsection should mark the remaining Experience section as context"
);
assert.doesNotMatch(
  elements.get("#pdfPreview").innerHTML,
  /Course Assistant|Facilitated Data Fundamentals/,
  "removing an Experience subsection should omit the title, workplace, and bullets from the preview"
);
assert.doesNotMatch(
  context.applySingleChange(removalPreviewResume, removeTeachingSubsection),
  /Course Assistant|Example University\n- Facilitated Data Fundamentals/,
  "accepting an Experience subsection removal should remove the structured role, not only its company line"
);
const removeUnknownExperienceItem = {
  ...removeTeachingBullet,
  id: "remove-unmatched-experience-preview",
  originalText: "An old item that cannot be found in the parsed resume."
};
context.previewChangeOnResume(removeUnknownExperienceItem, null);
assert.match(
  elements.get("#pdfPreview").innerHTML, /<div class="resume-preview-removal-section-block">[\s\S]*<h2>Experience<\/h2>[\s\S]*<\/div>/,
  "an unmatched removal preview should mark the relevant whole section instead of another section"
);

const extractedRemovalResume = `ALEX MORGAN
alex.morgan@example.com

EXPERIENCE
Lead Data Analyst 2017 2024
Northstar Research
Built customer analytics workflows.
Course Assistant 2013 - 2016
Northbridge Institute of Technology
Facilitated workshops in data analysis, programming, and statistics.
Software Engineering Intern 2015
Cedar Research

EDUCATION
B.Sc. in Statistics 2009 2013
Northbridge University`;
const emptyAfterExperienceRemoval = {
  id: "empty-after-experience-removal",
  type: "remove_or_deemphasize",
  section: "Experience",
  originalText: `Course Assistant 2013 2016
Northbridge Institute of Technology
Facilitated workshops in data analysis, programming, and statistics.`,
  suggestedText: "",
  whyItHelps: "This role is less relevant to the target role.",
  evidence: "resume_supported",
  riskLevel: "low",
  supportLevel: "resume_supported",
  status: "pending",
  mode: "removeOrReplace"
};
elements.get("#resumeInput").value = extractedRemovalResume;
elements.get("#finalResume").value = "";
placementApi.resetState();
placementApi.setCurrentChanges([emptyAfterExperienceRemoval]);
context.previewChangeOnResume(emptyAfterExperienceRemoval, null);
assert.match(
  elements.get("#pdfPreview").innerHTML,
  /resume-preview-removal-section-block[\s\S]*Lead Data Analyst[\s\S]*Software Engineering Intern/,
  "an empty After field should preview the resume without the removed Experience subsection"
);
assert.doesNotMatch(
  elements.get("#pdfPreview").innerHTML,
  /Course Assistant|Taught courses in Data Fundamentals/,
  "an empty After field should omit the selected extracted Experience block from Preview"
);
placementApi.acceptChangeFromCard(emptyAfterExperienceRemoval, null);
assert.equal(emptyAfterExperienceRemoval.status, "accepted", "an empty After field should be accepted as a deletion");
assert.doesNotMatch(
  elements.get("#finalResume").value,
  /Course Assistant|Northbridge Institute of Technology|Taught courses in Data Fundamentals/,
  "accepting an empty After deletion should remove the entire selected Experience subsection"
);
assert.match(
  elements.get("#finalResume").value,
  /Lead Data Analyst[\s\S]*Software Engineering Intern[\s\S]*Cedar Research/,
  "deleting an Experience subsection should preserve the surrounding roles"
);

testApi.resetState();
const spellingStatementResume = `ALEX MORGAN
050-555-0198 alex.morgan@example.com

STATEMENT
Experienced Lead Data Analyst with a strang track record of leading impactful projects

EXPERIENCE
Lead Data Analyst 2022
Northstar Research

EDUCATION
B.Sc. Statistics 2009 - 2013
Northbridge University`;
const spellingStatementCard = {
  ...context.collectResumeCheckChanges(spellingStatementResume).find((card) => card.originalText.includes("strang track record")),
  pass: testApi.passes.cleanup
};
resumeInput.value = spellingStatementResume;
finalResume.value = "";
testApi.setActivePass(testApi.passes.cleanup);
testApi.setCurrentChanges([spellingStatementCard]);
testApi.renderChanges();
assert.match(changeCards.innerHTML + pdfPreview.innerHTML, /Spelling Check/i, "spelling cards should be labeled as spelling checks in the UI");
elements.get("#jobInput").value = "Data Scientist role requiring Python";
assert.match(
  context.renderChangeCard(spellingStatementCard),
  /change-card pending improvement mandatory/,
  "spelling checks should keep the red Resume Check treatment even when a job description exists"
);
elements.get("#jobInput").value = "";
assert.match(
  pdfPreview.innerHTML,
  /<mark class="resume-comment-anchor">strang/,
  "numbered comments should mark the specific typo word"
);
context.previewChangeOnResume(spellingStatementCard, { value: spellingStatementCard.suggestedText });
assert.match(
  pdfPreview.innerHTML,
  /<mark class="resume-preview-highlight">strong<\/mark>/,
  "spelling preview should highlight the corrected word"
);
assert.equal(context.getChangePriorityClass(spellingStatementCard), "mandatory", "Resume Check spelling comments should use the red priority treatment");
assert.match(context.getCommentColorClass(spellingStatementCard), /mandatory/, "spelling comment markers should not use the blue job-specific treatment");

const extractedStrengthResume = `ALEX MORGAN
050-555-0198 alex.morgan@example.com

EXPERIENCE
Lead Data Analyst 2017 - 2024
Northstar Research

EDUCATION
B.Sc. in Statistics 2009 - 2013
Northbridge University

STRENGTHS
- E ective Communication and Business Understanding.`;
const extractedStrengthSpelling = context.suggestSpellingFixes(extractedStrengthResume)
  .find((change) => change.spellingBefore === "E ective");
assert.ok(extractedStrengthSpelling, "PDF-extracted E ective should produce a local spelling card");
assert.equal(
  context.suggestSpellingFixes(extractedStrengthResume)
    .filter((change) => /E ective Communication/.test(change.originalText)).length,
  1,
  "a broad PDF spelling artifact should not also create an overlapping ective correction"
);
resumeInput.value = extractedStrengthResume;
finalResume.value = "";
context.previewChangeOnResume(extractedStrengthSpelling, { value: "Effective" });
assert.match(
  pdfPreview.innerHTML,
  /<mark class="resume-preview-highlight">Effective<\/mark> Communication and Business Understanding/,
  "PDF spelling preview should highlight only Effective, not the following unchanged words"
);
assert.doesNotMatch(
  pdfPreview.innerHTML,
  /<mark class="resume-preview-highlight">Effective Communication/,
  "PDF spelling preview should not highlight a broad unchanged phrase"
);
const truncatedEffectiveSpelling = {
  id: "truncated-effective-spelling",
  type: "spelling_check",
  section: "Strengths",
  originalText: "ective Communication and Business Understanding.",
  suggestedText: "Effective Communication and Business Understanding.",
  spellingBefore: "ective",
  spellingAfter: "Effective",
  whyItHelps: "Fixes spelling mistakes.",
  evidence: "ective Communication and Business Understanding.",
  riskLevel: "low",
  supportLevel: "resume_supported",
  status: "pending",
  mode: "replace"
};
resumeInput.value = `ALEX MORGAN
alex.morgan@example.com

STRENGTHS
ective Communication and Business Understanding.`;
finalResume.value = "";
context.previewChangeOnResume(truncatedEffectiveSpelling, { value: "Effective" });
assert.match(
  pdfPreview.innerHTML,
  /<mark class="resume-preview-highlight">Effective<\/mark> Communication and Business Understanding/,
  "a truncated spelling artifact should highlight only the corrected word"
);
assert.doesNotMatch(
  pdfPreview.innerHTML,
  /<mark class="resume-preview-highlight">(?:Ef)?fective Communication and/,
  "a truncated spelling artifact must never fall back to highlighting the unchanged phrase"
);
resumeInput.value = `ALEX MORGAN
alex.morgan@example.com

STRENGTHS
Effective Communication and Business Understanding.`;
finalResume.value = "";
context.previewChangeOnResume(truncatedEffectiveSpelling, { value: "Effective" });
assert.doesNotMatch(
  pdfPreview.innerHTML,
  /resume-preview-highlight/,
  "a stale truncated spelling card must not highlight text inside an already-correct word"
);
assert.doesNotMatch(
  pdfPreview.innerHTML,
  /EffEffective/,
  "a stale truncated spelling card must not corrupt an already-correct word during preview"
);
const staleSpellingHtml = context.formatResumeForPrint(`ALEX MORGAN
050-555-0198 alex.morgan@example.com

STRENGTHS
Effective Communication and Business Understanding.`);
const staleSpellingMarker = context.addCommentMarkerToHtml(
  staleSpellingHtml,
  context.getCommentMarkerCandidates({
    type: "spelling_check",
    section: "Strengths",
    originalText: "ective Communication and Business Understanding.",
    suggestedText: "Effective Communication and Business Understanding.",
    spellingBefore: "ective",
    spellingAfter: "Effective",
    status: "pending"
  }),
  {
    id: "stale-spelling-effective",
    commentNumber: 1,
    type: "spelling_check",
    section: "Strengths",
    originalText: "ective Communication and Business Understanding.",
    suggestedText: "Effective Communication and Business Understanding.",
    spellingBefore: "ective",
    spellingAfter: "Effective",
    status: "pending"
  }
);
assert.equal(staleSpellingMarker.matched, "", "stale spelling comments should not highlight a similar already-correct phrase");
assert.doesNotMatch(staleSpellingMarker.html, /resume-comment-anchor/, "stale spelling comments should not mark the wrong visible text");

const focusedRewriteMarkerHtml = context.formatResumeForPrint(`ALEX MORGAN
alex.morgan@example.com

STRENGTHS
- Effective communication and business understanding.`);
const focusedRewriteMarkerChange = {
  id: "focused-rewrite-marker",
  type: "rewrite",
  section: "Strengths",
  originalText: "Effective communication and business understanding.",
  suggestedText: "Effective communication and stakeholder alignment.",
  status: "pending",
  mode: "replace",
  commentNumber: 1
};
const focusedRewriteMarker = context.addCommentMarkerToHtml(
  focusedRewriteMarkerHtml,
  context.getCommentMarkerCandidates(focusedRewriteMarkerChange),
  focusedRewriteMarkerChange
);
assert.match(
  focusedRewriteMarker.html,
  /Effective communication and <mark class="resume-comment-anchor">business understanding\./,
  "numbered rewrite comments should anchor on the changed original words, not the unchanged start of the sentence"
);
assert.doesNotMatch(
  focusedRewriteMarker.html,
  /<mark class="resume-comment-anchor">Effective communication and/,
  "numbered rewrite comments should not highlight unchanged words before the actual edit"
);

testApi.resetState();
resumeInput.value = resumeMissingCompany;
finalResume.value = context.normalizeFinalResumeText(resumeMissingCompany);
const previewCompanyCard = {
  ...missingCompanyCard,
  suggestedText: "Northstar Research",
  pass: testApi.passes.cleanup,
  status: "needs_user_writing"
};
testApi.setCurrentChanges([previewCompanyCard]);
testApi.setActivePass(testApi.passes.cleanup);
context.previewChangeOnResume(previewCompanyCard, { value: "Northstar Research" });
assert.match(
  pdfPreview.innerHTML,
  /<mark class="resume-preview-highlight">Northstar Research<\/mark>/,
  "required-field preview should highlight the inserted company value"
);

const lastExperienceMissingCompanyResume = `ALEX MORGAN
050-555-0198 alex.morgan@example.com

EXPERIENCE
Lead Data Analyst 2017 - 2024
Northstar Research
- Built customer analytics workflows.
Software Engineering Intern 2015

EDUCATION
M.Sc. in Data Science 2013 - 2016
Northbridge Institute of Technology`;
const lastExperienceCompanyCard = context.collectMissingRequiredFieldQuestions(lastExperienceMissingCompanyResume)
  .find((change) => change.requiredField === "company" && /Software Engineering Intern/.test(change.entryLabel));
assert.ok(lastExperienceCompanyCard, "the final Experience entry before Education should ask for its missing workplace");
resumeInput.value = lastExperienceMissingCompanyResume;
finalResume.value = context.normalizeFinalResumeText(lastExperienceMissingCompanyResume);
elements.get("#exportStyleSelect").value = "designed";
const designedCompanyPreviewCard = {
  ...lastExperienceCompanyCard,
  suggestedText: "Cedar Research",
  pass: testApi.passes.cleanup,
  status: "needs_user_writing"
};
testApi.resetState();
testApi.setCurrentChanges([designedCompanyPreviewCard]);
testApi.setActivePass(testApi.passes.cleanup);
context.previewChangeOnResume(designedCompanyPreviewCard, { value: "Cedar Research" });
assert.match(
  pdfPreview.innerHTML,
  /<h3>Software Engineering Intern<\/h3>[\s\S]*<mark class="resume-preview-highlight">Cedar Research<\/mark>[\s\S]*entry-years">2015/,
  "designed preview should insert and highlight the missing workplace beneath the correct final Experience role"
);
testApi.acceptChangeFromCard(designedCompanyPreviewCard, { value: "Cedar Research" });
assert.match(
  finalResume.value,
  /Software Engineering Intern 2015\nCedar Research\n\nEDUCATION/,
  "saving the workplace should persist it before Education"
);
assert.equal(
  context.collectMissingRequiredFieldQuestions(finalResume.value)
    .filter((change) => change.requiredField === "company" && /Software Engineering Intern/.test(change.entryLabel)).length,
  0,
  "the workplace question should disappear after Cedar Research is saved"
);
const acceptedNewExperience = {
  id: "accepted-new-role-after-company",
  type: "ask_user",
  section: "Experience",
  missingTerm: "Python",
  promptText: "Do you have experience with Python?",
  requiresUserWording: true,
  mode: "appendUserConfirmed",
  placement: "experience",
  placements: ["experience"],
  acceptedPlacements: ["experience"],
  experienceEntryKey: "__new_experience__",
  experienceNewTitle: "Applied Data Analyst",
  experienceNewCompany: "Example Labs",
  experienceNewYears: "2025 - Present",
  experienceDraftText: "Built evaluation tooling in Python.",
  acceptanceSequence: 2,
  status: "accepted",
  pass: testApi.passes.missingExperience
};
resumeInput.value = lastExperienceMissingCompanyResume;
finalResume.value = "";
testApi.resetState();
testApi.setCurrentChanges([
  { ...designedCompanyPreviewCard, suggestedText: "Cedar Research", acceptanceSequence: 1, status: "accepted" },
  acceptedNewExperience
]);
testApi.ensureFinalResumeText();
assert.match(finalResume.value, /Software Engineering Intern 2015\nCedar Research/, "accepted workplace must remain in the rebuilt current resume");
const currentExperienceTargets = context.getExperienceTargets(finalResume.value);
assert.deepEqual(
  Array.from(currentExperienceTargets.map((target) => target.label)),
  [
    "Applied Data Analyst - Example Labs - 2025 - Present",
    "Lead Data Analyst - Northstar Research - 2017 - 2024",
    "Software Engineering Intern - Cedar Research - 2015"
  ],
  "later Missing Experience cards must use the current accepted resume, including newly added roles and corrected workplaces"
);
elements.get("#exportStyleSelect").value = "ats";

const structureLikeChange = {
  ...backgroundSuggestion,
  id: "structure-like-change",
  mode: "reorderSection",
  type: "reorder_section",
  section: "Education",
  originalText: "Education",
  suggestedText: "Education"
};
assert.equal(context.getSuggestionKind(structureLikeChange), "improvement", "structure-style changes should use the unified resume-improvement category");
assert.doesNotMatch(context.renderCommentLegend(), /Resume structure/i, "comment legend should not show a separate Resume Structure color");

testApi.setCurrentChanges([staleNumberChange, backgroundSuggestion]);
testApi.setActivePass(testApi.passes.cleanup);
context.previewChangeOnResume(staleNumberChange, { value: "ALEX MORGAN" });
assert.match(
  pdfPreview.innerHTML,
  /1 other open comment remains: 1 in Suggestions/,
  "single-comment preview should mention open comments outside the previewed card"
);
assert.match(
  activeCommentPanel.innerHTML,
  /card-action-notice[\s\S]*1 other open comment remains: 1 in Suggestions[\s\S]*card-actions/,
  "active comment card should repeat the remaining-comments notice near the action buttons"
);
const secondCleanupComment = {
  ...context.collectMissingDateQuestions(resumeMissingExperienceYear)[0],
  id: "second-cleanup-comment",
  pass: testApi.passes.cleanup,
  status: "pending"
};
testApi.setCurrentChanges([staleNumberChange, secondCleanupComment, backgroundSuggestion]);
testApi.setActivePass(testApi.passes.cleanup);
context.previewChangeOnResume(staleNumberChange, { value: "ALEX MORGAN" });
assert.match(
  pdfPreview.innerHTML,
  /2 other open comments remain: 1 more in Resume Check, 1 in Suggestions/,
  "single-comment preview should mention remaining comments in both the current and other passes"
);

testApi.resetState();
resumeInput.value = resumeMissingExperienceYear;
finalResume.value = "";
testApi.setActivePass(testApi.passes.suggestions);
const similarSuggestionA = {
  ...generalPhrasingRewrite,
  id: "similar-suggestion-a",
  section: "Experience",
  status: "pending",
  pass: testApi.passes.suggestions
};
const similarSuggestionB = {
  ...generalPhrasingRewrite,
  id: "similar-suggestion-b",
  section: "Experience",
  originalText: "Initially joined as a Data Analyst, advancing to a Lead Data Analyst within two years.",
  suggestedText: "Advanced from Data Analyst to Lead Data Analyst within two years.",
  status: "pending",
  pass: testApi.passes.suggestions
};
testApi.setCurrentChanges([similarSuggestionA, similarSuggestionB]);
testApi.renderChanges();
testApi.rejectChangeFromCard(similarSuggestionA);
const remainingOpenSuggestionIds = testApi.getCurrentChanges()
  .filter((change) => (change.status === "pending" || change.status === "needs_user_writing") && change.pass === testApi.passes.suggestions)
  .map((change) => change.id);
assert.deepEqual(
  remainingOpenSuggestionIds,
  ["similar-suggestion-b"],
  "rejecting one suggestion should not dismiss another similar suggestion"
);

const acceptHeaderChange = {
  ...context.collectMissingHeaderQuestions(resumeMissingName)[0],
  pass: testApi.passes.cleanup
};
testApi.resetState();
resumeInput.value = resumeMissingName;
finalResume.value = "";
testApi.setActivePass(testApi.passes.cleanup);
testApi.setCurrentChanges([acceptHeaderChange]);
testApi.renderChanges();
testApi.acceptChangeFromCard(acceptHeaderChange, { value: "ALEX MORGAN" });
assert.equal(acceptHeaderChange.status, "accepted");
assert.match(finalResume.value, /^ALEX MORGAN/m, "accepted missing name should be added to final resume");
assert.equal(
  testApi.getCurrentChanges().filter((change) => change.status === "pending" || change.status === "needs_user_writing").length,
  0,
  "accepted fixed header should not remain as an open comment"
);
assert.doesNotMatch(pdfPreview.innerHTML, /resume-comment-marker/, "accepted fixed header marker should disappear from preview");
testApi.refreshResumeCheckPass(finalResume.value);
assert.equal(
  testApi.getCurrentChanges().filter((change) => change.status === "pending" || change.status === "needs_user_writing").length,
  0,
  "accepted missing-name comment should not be recreated by the next resume check"
);
assert.doesNotMatch(pdfPreview.innerHTML, /resume-comment-marker/, "accepted fixed header marker should stay gone after rerun");

const partialNameResume = `ALEX
alex.morgan@example.com
050-555-0198

EXPERIENCE
Lead Data Analyst 2022
Northstar Research

EDUCATION
B.Sc. Statistics 2009 - 2013
Northbridge University`;
const partialNameChange = {
  ...context.collectMissingHeaderQuestions(partialNameResume)[0],
  pass: testApi.passes.cleanup
};
testApi.resetState();
resumeInput.value = partialNameResume;
finalResume.value = "";
testApi.setCurrentChanges([partialNameChange]);
testApi.acceptChangeFromCard(partialNameChange, { value: "Alex Morgan" });
assert.match(finalResume.value, /^Alex Morgan\nalex.morgan@example\.com/m, "accepted full name should replace the partial first-name header");
assert.doesNotMatch(finalResume.value, /^ALEX\nAlex Morgan/m, "accepted full name should not duplicate the partial first name");

const spellingResume = `ALEX MORGAN
050-555-0198 alex.morgan@example.com

EXPERIENCE
Lead Data Analyst 2022
Northstar Research
- Strong project managment experinece.

EDUCATION
B.Sc. Statistics 2009 - 2013
Northbridge University`;
const spellingAcceptChange = {
  ...context.collectResumeCheckChanges(spellingResume).find((card) => card.spellingBefore === "managment"),
  pass: testApi.passes.cleanup
};
testApi.resetState();
resumeInput.value = spellingResume;
finalResume.value = "";
testApi.setActivePass(testApi.passes.cleanup);
testApi.setCurrentChanges([spellingAcceptChange]);
testApi.renderChanges();
assert.match(pdfPreview.innerHTML, /<mark class="resume-comment-anchor">managment/, "spelling check should mark only the active typo in Resume Check preview");
testApi.acceptChangeFromCard(spellingAcceptChange, { value: "management" });
assert.match(finalResume.value, /Strong project management experinece\./, "accepting one spelling card should update only that typo");
assert.doesNotMatch(finalResume.value, /managment/, "accepted spelling fix should remove the accepted typo");
assert.match(finalResume.value, /experinece/, "accepting one spelling fix should not silently apply other spelling cards");

const broadRewriteFixesTypo = {
  id: "broad-rewrite-fixes-typo",
  type: "rewrite",
  section: "Experience",
  originalText: "- Strong project managment experinece.",
  suggestedText: "- Strong project management experience leading production work.",
  whyItHelps: "Rewrites the bullet and fixes the typo.",
  evidence: "Resume supported",
  riskLevel: "low",
  supportLevel: "resume_supported",
  status: "pending",
  mode: "replace",
  pass: testApi.passes.suggestions
};
const staleSpellingAfterRewrite = {
  ...context.collectResumeCheckChanges(spellingResume).find((card) => card.spellingBefore === "managment"),
  pass: testApi.passes.cleanup
};
testApi.resetState();
resumeInput.value = spellingResume;
finalResume.value = "";
testApi.setCurrentChanges([staleSpellingAfterRewrite, broadRewriteFixesTypo]);
testApi.setActivePass(testApi.passes.suggestions);
testApi.acceptChangeFromCard(broadRewriteFixesTypo, { value: broadRewriteFixesTypo.suggestedText });
assert.match(finalResume.value, /project management experience leading production work\./, "accepting a broader rewrite should apply its typo fix");
assert.equal(
  testApi.getCurrentChanges().some((change) => change.type === "spelling_check" && change.spellingBefore === "managment" && (change.status === "pending" || change.status === "needs_user_writing")),
  false,
  "spelling card should disappear when an accepted rewrite already fixed that typo"
);

const statementSpellingResume = `ALEX MORGAN
050-555-0198 alex.morgan@example.com

STATEMENT
Seeking a challenging Analytics Consultant role focused on leveraging research and data to drive innovation and deliver substantial business valuee.

EXPERIENCE
Lead Data Analyst 2022
Northstar Research

EDUCATION
B.Sc. Statistics 2009 - 2013
Northbridge University`;
const statementSpellingChange = {
  ...context.collectResumeCheckChanges(statementSpellingResume).find((card) => card.originalText.includes("valuee")),
  pass: testApi.passes.cleanup
};
testApi.resetState();
resumeInput.value = statementSpellingResume;
finalResume.value = "";
testApi.setActivePass(testApi.passes.cleanup);
testApi.setCurrentChanges([statementSpellingChange]);
testApi.renderChanges();
testApi.acceptChangeFromCard(statementSpellingChange, { value: "value" });
assert.match(
  finalResume.value,
  /Seeking a challenging Analytics Consultant role focused on leveraging research and data to drive innovation and deliver substantial business value\./,
  "accepting a token-only spelling fix should preserve the full surrounding sentence"
);
assert.doesNotMatch(finalResume.value, /Applied delivery substantial|^value$/m, "token-only spelling acceptance should not replace the whole line with a fragment");

const rejectSpellingChange = {
  ...context.collectResumeCheckChanges(statementSpellingResume).find((card) => card.originalText.includes("valuee")),
  pass: testApi.passes.cleanup
};
testApi.resetState();
resumeInput.value = statementSpellingResume;
finalResume.value = "";
testApi.setActivePass(testApi.passes.cleanup);
testApi.setCurrentChanges([rejectSpellingChange]);
testApi.renderChanges();
testApi.rejectChangeFromCard(rejectSpellingChange);
assert.equal(finalResume.value.trim(), statementSpellingResume, "rejecting a spelling card should leave the resume text unchanged");
assert.equal(
  testApi.getCurrentChanges().filter((change) => change.status === "pending" || change.status === "needs_user_writing").length,
  0,
  "rejected spelling comment should not remain open"
);

const partialProjectPlacement = {
  id: "partial-project-placement-survives-refresh",
  type: "ask_user",
  section: "Selected Projects",
  missingTerm: "RAG",
  promptText: "Do you have a RAG project?",
  suggestedText: "",
  whyItHelps: "The role asks for RAG.",
  evidence: "User confirmation required.",
  riskLevel: "high",
  supportLevel: "user_confirmation_needed",
  requiresUserWording: true,
  mode: "appendUserConfirmed",
  status: "partial",
  placement: "projects",
  placements: ["projects", "skills"],
  acceptedPlacements: ["projects"],
  projectAction: "new",
  projectName: "RoleFit Evaluator",
  projectYear: "2026",
  projectDetails: "Built a RAG evaluation workflow.",
  pass: testApi.passes.missingExperience
};
testApi.resetState();
testApi.setCurrentChanges([partialProjectPlacement]);
testApi.setPassChanges(testApi.passes.missingExperience, [], { activate: false });
assert.equal(
  testApi.getCurrentChanges().some((change) => change.id === partialProjectPlacement.id),
  true,
  "refreshing a pass must preserve a partially completed card so prior accepted additions cannot disappear"
);

assert.equal(context.extractYears(undefined), "", "empty optional date fields should validate as missing instead of crashing the Project comment");

const roleCoverageAnalysis = {
  model: "test-model",
  job_analysis: {
    target_title: "Data Scientist",
    required_skills: ["Python", "Java", "ML"]
  },
  resume_analysis: {
    strongest_relevant_evidence: ["Machine learning research"]
  },
  tailoring_strategy: {
    emphasize: ["Python", "Java"],
    do_not_claim_without_confirmation: ["Python", "Java"]
  },
  final_checks: {
    keywords_covered: ["Python", "Machine Learning", "Lead Data Analyst"],
    keywords_missing: ["Python", "Java"]
  }
};
const roleCoverageBaseline = `ALEX MORGAN

EXPERIENCE
Data Analyst 2020 - 2024
Example Company

SKILLS
Machine Learning`;
const initialRoleCoverage = context.buildRoleCoverageState(
  roleCoverageAnalysis,
  roleCoverageBaseline,
  roleCoverageBaseline,
  "The role requires Python, Java, and machine learning."
);
assert.equal(
  JSON.stringify(initialRoleCoverage.covered.map((item) => item.key)),
  JSON.stringify(["machine learning"]),
  "coverage must be derived from the current resume instead of trusting an AI covered list"
);
assert.equal(
  JSON.stringify(initialRoleCoverage.missing.map((item) => item.key)),
  JSON.stringify(["python", "java"]),
  "requirements absent from the current resume must remain missing even if the AI called one covered"
);
assert.equal(
  initialRoleCoverage.covered.some((item) => item.key === "lead data analyst"),
  false,
  "resume phrases from the AI final-check list must not pollute job requirements when job-side requirements exist"
);
assert.equal(
  initialRoleCoverage.covered.some((covered) => initialRoleCoverage.missing.some((missing) => missing.key === covered.key)),
  false,
  "a normalized requirement must never appear in both covered and missing"
);

const roleCoverageUpdatedResume = `${roleCoverageBaseline} • Python • Java`;
const updatedRoleCoverage = context.buildRoleCoverageState(
  roleCoverageAnalysis,
  roleCoverageUpdatedResume,
  roleCoverageBaseline,
  "The role requires Python, Java, and machine learning."
);
assert.equal(
  JSON.stringify(updatedRoleCoverage.missing.map((item) => item.key)),
  JSON.stringify([]),
  "accepted skills must disappear from the missing requirements list"
);
assert.equal(
  JSON.stringify(updatedRoleCoverage.covered.map((item) => item.key)),
  JSON.stringify(["python", "java", "machine learning"]),
  "accepted skills must move into the covered requirements list"
);
assert.equal(
  JSON.stringify(updatedRoleCoverage.covered.filter((item) => item.newlyCovered).map((item) => item.key)),
  JSON.stringify(["python", "java"]),
  "skills added after the baseline analysis must be marked as newly covered"
);

elements.get("#resumeInput").value = roleCoverageBaseline;
elements.get("#finalResume").value = roleCoverageUpdatedResume;
testApi.renderAiAnalysis(roleCoverageAnalysis, {
  baselineResume: roleCoverageBaseline,
  jobText: "The role requires Python, Java, and machine learning."
});
const renderedRoleCoverage = elements.get("#analysisOutput").innerHTML;
assert.match(renderedRoleCoverage, /Requirements Covered in Current Resume/, "role analysis should use a clear covered-requirements label");
assert.match(renderedRoleCoverage, /Requirements Still Missing/, "role analysis should use a clear missing-requirements label");
assert.doesNotMatch(renderedRoleCoverage, /Keywords Covered|Keywords Missing/, "old ambiguous keyword labels should not be rendered");
assert.equal(
  (renderedRoleCoverage.match(/Added in this review/g) || []).length,
  2,
  "each newly covered requirement should be visibly marked"
);
const renderedMissingBlock = renderedRoleCoverage.split("Requirements Still Missing")[1] || "";
assert.doesNotMatch(renderedMissingBlock, /data-role-requirement="python"|data-role-requirement="java"/, "covered requirements must not leak into the rendered missing list");

const specificRequirementsResume = `ALEX MORGAN

STATEMENT
Experienced Lead Data Analyst.

EXPERIENCE
Lead Data Analyst 2017 - 2024
Northstar Research
- Led cross-functional initiatives with product managers, engineering, and data science teams.

EDUCATION
M.Sc. in Data Science and Machine Learning with a capstone in Applied Analytics 2013 - 2016
Northbridge Institute of Technology

PUBLICATIONS
Audience modeling for Dynamic Product Ads 2023
IEEE International Conference on Big Data
A. Morgan, A. Author

STRENGTHS
- Effective Communication and Business Understanding.`;
const specificRequirementsJob = `Knowledge of programming languages such as C/C++, Python, Java or Perl
Experience in patents or publications at top-tier peer-reviewed conferences or journals
PhD, or a Master's degree and experience in CS, CE, ML or related field research
Strong communication and collaboration skills`;
const pollutedRequirementAnalysis = {
  job_analysis: {
    required_skills: [
      "C/C++",
      "Python",
      "Java",
      "Perl",
      "patents",
      "publications",
      "top-tier peer-reviewed conferences or journals",
      "PhD",
      "Master's degree",
      "CS",
      "CE",
      "ML",
      "communication skills",
      "collaboration skills",
      "continuous learning",
      "growth",
      "Strong communication and collaboration skills",
      "Qualifications",
      "engineering"
    ]
  },
  final_checks: {
    keywords_covered: [],
    keywords_missing: ["growth", "Qualifications", "engineering"]
  }
};
const specificRequirementCoverage = context.buildRoleCoverageState(
  pollutedRequirementAnalysis,
  specificRequirementsResume,
  specificRequirementsResume,
  specificRequirementsJob
);
assert.equal(
  JSON.stringify(specificRequirementCoverage.missing.map((item) => item.key)),
  JSON.stringify(["c/c++", "python", "java", "perl"]),
  "only concrete unsupported requirements should remain missing"
);
assert.equal(
  JSON.stringify(specificRequirementCoverage.covered.map((item) => item.key)),
  JSON.stringify([
    "patents-or-publications",
    "advanced-degree",
    "relevant-research-background",
    "communication-and-collaboration"
  ]),
  "alternative qualifications and semantic communication evidence should be recognized as covered"
);
assert.equal(
  [...specificRequirementCoverage.covered, ...specificRequirementCoverage.missing]
    .some((item) => ["growth", "qualifications", "engineering"].includes(item.key)),
  false,
  "abstract fragments and headings must never appear as role requirements"
);

const mismatchedCommunicationCard = context.normalizeAiChangeCard({
  id: "mismatched-engineering-label",
  type: "ask_user",
  section: "Missing Evidence",
  question: "Could you provide specific examples of how you have demonstrated strong communication and collaboration skills in your previous roles, particularly in a research or engineering context?",
  related_job_requirement: "Strong communication and collaboration skills",
  why_it_matters: "This requirement is important.",
  support_level: "user_confirmation_needed"
}, 0);
assert.equal(
  mismatchedCommunicationCard.missingTerm,
  "Communication and collaboration",
  "a communication question must not be labeled engineering"
);
assert.equal(
  context.prepareActionableChanges(specificRequirementsResume, [mismatchedCommunicationCard]).length,
  0,
  "a communication/collaboration question should be removed when the current resume already supports it"
);

const abstractMissingCards = [
  "growth",
  "Qualifications",
  "engineering"
].map((missingTerm, index) => ({
  id: `abstract-missing-${index}`,
  type: "ask_user",
  section: "Missing Evidence",
  promptText: `Do you have experience with ${missingTerm}?`,
  missingTerm,
  whyItHelps: "Suggested by the model.",
  evidence: missingTerm,
  requiresUserWording: true,
  mode: "appendUserConfirmed",
  status: "pending"
}));
assert.equal(
  context.prepareActionableChanges(specificRequirementsResume, abstractMissingCards).length,
  0,
  "abstract model fragments must not become Missing Experience comments"
);

const publicationAlreadyAfterEducation = {
  id: "publication-already-after-education",
  type: "reorder_section",
  section: "Publications",
  originalText: "",
  suggestedText: "Move Publications section to after Education.",
  whyItHelps: "Keeps optional sections after the fixed core sections.",
  riskLevel: "low",
  supportLevel: "resume_supported",
  status: "pending",
  mode: "reorderSection"
};
assert.equal(
  context.prepareActionableChanges(specificRequirementsResume, [publicationAlreadyAfterEducation]).length,
  0,
  "an already-satisfied Publications-after-Education instruction must not create a comment"
);

console.log("Regression tests passed");
