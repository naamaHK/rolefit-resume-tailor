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
