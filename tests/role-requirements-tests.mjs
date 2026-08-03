import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

const context = {};
vm.createContext(context);
vm.runInContext(
  await readFile(new URL("../src/resume/role-requirements.js", import.meta.url), "utf8"),
  context,
  { filename: "src/resume/role-requirements.js" }
);
vm.runInContext(
  await readFile(new URL("../src/resume/missing-experience.js", import.meta.url), "utf8"),
  context,
  { filename: "src/resume/missing-experience.js" }
);

const knownTerms = ["Tableau", "Apache Airflow", "dbt", "Growth Analytics", "customer data", "decisions", "reporting", "dashboards"];
const requirements = context.RoleFitRoleRequirements.create({
  cleanConfirmedText: (value) => String(value || "").trim(),
  extractMissingExperienceTopics: (line) => knownTerms.filter((term) => String(line).toLowerCase().includes(term.toLowerCase())),
  genericQuestionTopics: new Set(),
  hasSection: () => false,
  normalize: (value) => String(value || "").toLowerCase().trim(),
  resumeCoversSkillTerm: () => false,
  splitLines: (text) => String(text || "").split(/\n+/).map((line) => line.trim()).filter(Boolean),
  stringifyAnalysisItem: (value) => String(value || ""),
  textContainsTopicTerm: (text, term) => String(text || "").toLowerCase().includes(String(term || "").toLowerCase())
});

const jobDescription = `Product Data Analyst

Partner with Growth Analytics and product teams to turn customer data into decisions.

Basic Qualifications
- Advanced SQL and Python experience.
- Built and maintained Tableau dashboards for stakeholder reporting.

Preferred Qualifications
- Experience with Apache Airflow or dbt.

Benefits
You will help teams make decisions with reporting and dashboards.`;

assert.deepEqual(
  Array.from(requirements.qualificationLines(jobDescription)),
  [
    "- Advanced SQL and Python experience.",
    "- Built and maintained Tableau dashboards for stakeholder reporting.",
    "- Experience with Apache Airflow or dbt."
  ],
  "only Basic/Preferred Qualification lines should be used for local requirement extraction"
);

assert.deepEqual(
  JSON.parse(JSON.stringify(requirements.collect({ job_analysis: { required_skills: [], preferred_skills: [] } }, jobDescription))),
  [
    { key: "tableau", display: "Tableau dashboards" },
    { key: "apache-airflow", display: "Apache Airflow" },
    { key: "dbt", display: "dbt" }
  ],
  "job-description prose must not become a Missing Experience question"
);

assert.deepEqual(
  JSON.parse(JSON.stringify(requirements.groupForJob("Tableau", jobDescription))),
  { key: "tableau", display: "Tableau dashboards" },
  "Tableau and Tableau dashboards should be one requirement when the job names the dashboard work"
);

assert.equal(
  requirements.isAbstract("related field research"),
  true,
  "a vague research phrase must never become a confirmation question"
);

const missingExperienceFlow = context.RoleFitMissingExperience.create({
  normalize: (value) => String(value || "").toLowerCase().trim()
});
assert.equal(
  missingExperienceFlow.buildQuestionSpecs([{ key: "relevant-research-background", display: "Relevant CS/CE/ML research background" }])[0].promptText,
  "Do you have research experience in Computer Science, Computer Engineering, Machine Learning, or a closely related field? If yes, briefly name the field and project.",
  "the research requirement must name its actual fields instead of asking about a vague related field"
);

assert.deepEqual(
  JSON.parse(JSON.stringify(requirements.collect({
    job_analysis: {
      required_skills: ["Tableau"],
      preferred_skills: ["Apache Airflow", "dbt"],
      keywords: ["Growth Analytics", "customer data", "decisions", "reporting"]
    }
  }, jobDescription))),
  [
    { key: "tableau", display: "Tableau dashboards" },
    { key: "apache-airflow", display: "Apache Airflow" },
    { key: "dbt", display: "dbt" }
  ],
  "model keywords are context, not requirements eligible for confirmation questions"
);

console.log("Role requirement tests passed");
