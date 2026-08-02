import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const fixturePath = process.argv[2];
if (!fixturePath) throw new Error("Usage: node evaluation/run-fixture.mjs <fixture.json>");

const fixture = JSON.parse(await readFile(fixturePath, "utf8"));
const { rolefit_input: rolefitInput, oracle } = fixture;
const requirements = oracle.requirements;

function percentage(numerator, denominator) {
  if (denominator === 0) return null;
  return Number(((100 * numerator) / denominator).toFixed(2));
}

function profilePotential(category) {
  const scoped = requirements.filter((requirement) => requirement.category === category);
  return percentage(scoped.filter((requirement) => requirement.profile_supported).length, scoped.length);
}

function representation(resume, category) {
  const supported = requirements.filter((requirement) => requirement.category === category && requirement.profile_supported);
  return percentage(
    supported.filter((requirement) => resume.includes(requirement.resume_evidence_pattern)).length,
    supported.length
  );
}

function combined(basic, preferred) {
  if (basic === null) return preferred;
  if (preferred === null) return basic;
  return Number((basic * 0.75 + preferred * 0.25).toFixed(2));
}

function structureErrors(resume) {
  const errors = [];
  const header = resume.split("\n\n")[0] || "";
  if (!/^[A-Z][a-z]+(?:[- ][A-Z][a-z]+)+$/m.test(header)) errors.push("Header must contain a full name.");
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
  if (/\b(?:TBD|USER-CONFIRMED ADDITIONS|ask user)\b/i.test(resume)) errors.push("Resume contains internal or placeholder text.");
  return errors;
}

function safetyErrors(resumeAfter) {
  const errors = [];
  const profileFacts = fixture.profile.experience.flatMap((entry) => entry.facts || []);
  const profileSkills = Object.values(fixture.profile.skills).flat();
  const profileSkillSet = new Set(profileSkills.map((skill) => skill.toLowerCase()));
  const declaredSkillSet = new Set(oracle.claimable_skills.map((skill) => skill.toLowerCase()));
  for (const skill of profileSkillSet) {
    if (!declaredSkillSet.has(skill)) errors.push(`Profile skill is missing from the oracle inventory: ${skill}`);
  }
  const skillsSection = resumeAfter.match(/\nSKILLS\n([\s\S]*?)(?:\n\n[A-Z][A-Z ]+\n|$)/);
  const resumeSkills = (skillsSection?.[1] || "")
    .split(/[,\n]/)
    .map((skill) => skill.trim())
    .filter(Boolean);
  for (const skill of resumeSkills) {
    if (!profileSkillSet.has(skill.toLowerCase())) errors.push(`Unsupported skill in final resume: ${skill}`);
  }
  for (const requirement of requirements) {
    if (!requirement.profile_supported && resumeAfter.includes(requirement.resume_evidence_pattern)) {
      errors.push(`Unsupported requirement in final resume: ${requirement.label}`);
    }
  }
  for (const interaction of oracle.interactions.filter((item) => item.confirmed)) {
    if (!profileFacts.includes(interaction.released_profile_fact)
      || !resumeAfter.includes(interaction.resume_change)) {
      errors.push(`Confirmed change is not grounded: ${interaction.requirement_id}`);
    }
  }
  return errors;
}

assert.ok(rolefitInput.resume_before && rolefitInput.job_description, "RoleFit input must contain only a resume and normal job text.");
assert.equal(/\b(?:importance|weight|profile_supported|claimable_skills)\b/i.test(JSON.stringify(rolefitInput)), false, "Oracle fields must never be sent to RoleFit.");
assert.match(rolefitInput.job_description, /Basic Qualifications/i);
assert.match(rolefitInput.job_description, /Preferred Qualifications/i);

const before = rolefitInput.resume_before;
let after = before;
for (const interaction of oracle.interactions.filter((item) => item.confirmed)) {
  const requirement = requirements.find((item) => item.id === interaction.requirement_id);
  assert.ok(requirement?.profile_supported, "Only profile-supported requirements may be confirmed.");
  assert.equal(before.includes(requirement.resume_evidence_pattern), false, "The confirmed requirement must be missing from the original resume.");
  after = after.replace(interaction.insert_after, `${interaction.insert_after}\n${interaction.resume_change}`);
}
assert.notEqual(after, before, "At least one confirmed resume change must be applied.");

const profileJobPotential = {
  basic: profilePotential("basic"),
  preferred: profilePotential("preferred")
};
profileJobPotential.combined = combined(profileJobPotential.basic, profileJobPotential.preferred);

const representationBefore = {
  basic: representation(before, "basic"),
  preferred: representation(before, "preferred")
};
representationBefore.combined = combined(representationBefore.basic, representationBefore.preferred);

const representationAfter = {
  basic: representation(after, "basic"),
  preferred: representation(after, "preferred")
};
representationAfter.combined = combined(representationAfter.basic, representationAfter.preferred);
representationAfter.delta = Number((representationAfter.combined - representationBefore.combined).toFixed(2));

assert.deepEqual(profileJobPotential, oracle.expected.profile_job_potential);
assert.deepEqual(representationBefore, oracle.expected.resume_representation_before);
assert.deepEqual(representationAfter, oracle.expected.resume_representation_after);
assert.deepEqual(structureErrors(before), [], "Input resume must be structurally valid.");
assert.deepEqual(structureErrors(after), [], "Tailored resume must preserve structure.");
assert.deepEqual(safetyErrors(after), [], "Tailored resume must be grounded in the profile.");

console.log(`Evaluation fixture: ${fixture.id}`);
console.log("RoleFit receives: resume_before + ordinary job description only");
console.log(`Profile–job potential: Basic ${profileJobPotential.basic}% | Preferred ${profileJobPotential.preferred}% | Combined ${profileJobPotential.combined}%`);
console.log(`Resume representation before: Basic ${representationBefore.basic}% | Preferred N/A | Combined ${representationBefore.combined}%`);
console.log(`Resume representation after: Basic ${representationAfter.basic}% | Preferred N/A | Combined ${representationAfter.combined}% | Delta +${representationAfter.delta}`);
console.log("Grounding Safety: PASS");
console.log("Structure Preservation: PASS");
console.log("Result: PASS");
