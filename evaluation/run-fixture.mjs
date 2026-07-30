import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const fixturePath = process.argv[2];

if (!fixturePath) {
  throw new Error("Usage: node evaluation/run-fixture.mjs <fixture.json>");
}

const fixture = JSON.parse(await readFile(fixturePath, "utf8"));

function percentage(numerator, denominator) {
  if (denominator === 0) return 100;
  return Number(((100 * numerator) / denominator).toFixed(2));
}

function scoreGroup(requirements, predicate) {
  const inScope = requirements.filter(predicate);
  return percentage(inScope.filter((requirement) => requirement.profile_supported).length, inScope.length);
}

function representationGroup(requirements, resumeText, priority) {
  const supported = requirements.filter((requirement) => requirement.priority === priority && requirement.profile_supported);
  return percentage(
    supported.filter((requirement) => resumeText.includes(requirement.resume_evidence_pattern)).length,
    supported.length
  );
}

function combined(required, preferred, requirements) {
  const hasRequired = requirements.some((requirement) => requirement.priority === "required");
  const hasPreferred = requirements.some((requirement) => requirement.priority === "preferred");
  if (!hasPreferred) return required;
  if (!hasRequired) return preferred;
  return Number((required * 0.75 + preferred * 0.25).toFixed(2));
}

function structureErrors(resume) {
  const errors = [];
  const header = resume.split("\n\n")[0] || "";
  if (!/^[A-Z][a-z]+\s+[A-Z][a-z]+$/m.test(header)) errors.push("Header must contain a full name.");
  if (!/\+?[\d][\d\s-]{7,}/.test(header)) errors.push("Header must contain a phone number.");
  if (!/\b[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}\b/.test(header)) errors.push("Header must contain an email address.");

  const summaryIndex = resume.indexOf("PROFESSIONAL SUMMARY");
  const experienceIndex = resume.indexOf("EXPERIENCE");
  const educationIndex = resume.indexOf("EDUCATION");
  if (!(summaryIndex >= 0 && summaryIndex < experienceIndex && experienceIndex < educationIndex)) {
    errors.push("Summary, Experience, and Education must appear in that order.");
  }
  for (const heading of ["PROFESSIONAL SUMMARY", "EXPERIENCE", "EDUCATION", "SKILLS"]) {
    const section = resume.split(heading)[1]?.split("\n\n")[0]?.trim();
    if (!section) errors.push(`${heading} must not be empty.`);
  }
  for (const entry of resume.matchAll(/^([^\n]+) \| ([^\n]+) \| ((?:19|20)\d{2}[–-](?:Present|(19|20)\d{2}))$/gm)) {
    if (!entry[1] || !entry[2] || !entry[3]) errors.push("Experience entries require title, company, and dates.");
  }
  if (/\b(?:TBD|USER-CONFIRMED ADDITIONS|ask user)\b/i.test(resume)) errors.push("Resume contains internal or placeholder text.");
  return errors;
}

function safetyErrors(fixture, resumeAfter) {
  const allowedSkills = new Set(fixture.profile.allowed_skills);
  const errors = fixture.safety.claimed_skills_after
    .filter((skill) => !allowedSkills.has(skill))
    .map((skill) => `Unsupported skill: ${skill}`);
  for (const claim of fixture.safety.added_claims) {
    if (!fixture.profile.facts.includes(claim) || !resumeAfter.includes(fixture.interaction.resume_change)) {
      errors.push(`Unsupported added claim: ${claim}`);
    }
  }
  return errors;
}

const requirements = fixture.job.requirements;
const before = fixture.resume_before;
const expectedQuestionRequirement = requirements.find((requirement) => requirement.id === fixture.expected.question_requirement_id);
assert.ok(expectedQuestionRequirement, "Fixture must identify the requirement that receives a question.");
assert.equal(before.includes(expectedQuestionRequirement.resume_evidence_pattern), false, "Questioned requirement must be absent before tailoring.");
assert.equal(fixture.interaction.confirmed, true, "This positive fixture requires a confirmed simulated answer.");

const resumeAfter = before.replace(
  fixture.interaction.insert_after,
  `${fixture.interaction.insert_after}\n${fixture.interaction.resume_change}`
);
assert.notEqual(resumeAfter, before, "The accepted change must be inserted into the resume.");

const profilePotential = {
  required: scoreGroup(requirements, (requirement) => requirement.priority === "required"),
  preferred: scoreGroup(requirements, (requirement) => requirement.priority === "preferred")
};
profilePotential.combined = combined(profilePotential.required, profilePotential.preferred, requirements);

const representationBefore = {
  required: representationGroup(requirements, before, "required"),
  preferred: representationGroup(requirements, before, "preferred")
};
representationBefore.combined = combined(representationBefore.required, representationBefore.preferred, requirements);

const representationAfter = {
  required: representationGroup(requirements, resumeAfter, "required"),
  preferred: representationGroup(requirements, resumeAfter, "preferred")
};
representationAfter.combined = combined(representationAfter.required, representationAfter.preferred, requirements);
representationAfter.delta = Number((representationAfter.combined - representationBefore.combined).toFixed(2));

assert.deepEqual(profilePotential, fixture.expected.profile_potential);
assert.deepEqual(representationBefore, fixture.expected.resume_representation_before);
assert.deepEqual(representationAfter, fixture.expected.resume_representation_after);

const inputStructureErrors = structureErrors(before);
const outputStructureErrors = structureErrors(resumeAfter);
const groundingErrors = safetyErrors(fixture, resumeAfter);
assert.deepEqual(inputStructureErrors, [], "Input resume must be structurally valid.");
assert.deepEqual(outputStructureErrors, [], "Tailored resume must preserve structure.");
assert.deepEqual(groundingErrors, [], "Tailored resume must be grounded in the hidden profile.");

console.log(`Evaluation fixture: ${fixture.id}`);
console.log(`Question: ${fixture.interaction.expected_question}`);
console.log(`Simulated answer: ${fixture.interaction.simulated_user_response}`);
console.log("");
console.log(`Profile–job potential: required ${profilePotential.required}% | preferred ${profilePotential.preferred}% | combined ${profilePotential.combined}%`);
console.log(`Resume representation before: required ${representationBefore.required}% | preferred ${representationBefore.preferred}% | combined ${representationBefore.combined}%`);
console.log(`Resume representation after: required ${representationAfter.required}% | preferred ${representationAfter.preferred}% | combined ${representationAfter.combined}% | delta +${representationAfter.delta}`);
console.log(`Grounding Safety: ${groundingErrors.length ? "FAIL" : "PASS"}`);
console.log(`Structure Preservation: ${inputStructureErrors.length || outputStructureErrors.length ? "FAIL" : "PASS"}`);
console.log("Result: PASS");
