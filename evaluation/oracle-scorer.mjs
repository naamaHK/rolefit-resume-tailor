function percentage(numerator, denominator) {
  if (denominator === 0) return null;
  return Number(((100 * numerator) / denominator).toFixed(2));
}

function combined(basic, preferred) {
  if (basic === null) return preferred;
  if (preferred === null) return basic;
  return Number((basic * 0.75 + preferred * 0.25).toFixed(2));
}

export function validateFixtureInput(fixture) {
  const { rolefit_input: rolefitInput, oracle } = fixture || {};
  if (!rolefitInput?.resume_before || !rolefitInput?.job_description) {
    throw new Error("RoleFit input must contain a resume_before and job_description.");
  }
  if (/\b(?:importance|weight|profile_supported|claimable_skills)\b/i.test(JSON.stringify(rolefitInput))) {
    throw new Error("Oracle fields must never be sent to RoleFit.");
  }
  if (!/Basic Qualifications/i.test(rolefitInput.job_description)) {
    throw new Error("The job description must contain Basic Qualifications.");
  }
  if (!/Preferred Qualifications/i.test(rolefitInput.job_description)) {
    throw new Error("The job description must contain Preferred Qualifications.");
  }
  if (!Array.isArray(oracle?.requirements) || !Array.isArray(oracle?.interactions)) {
    throw new Error("The fixture oracle must contain requirements and interactions.");
  }
}

export function structureErrors(resume) {
  const errors = [];
  const header = String(resume || "").split("\n\n")[0] || "";
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

export function buildExpectedAfterResume(fixture) {
  validateFixtureInput(fixture);
  const { rolefit_input: rolefitInput, oracle } = fixture;
  let after = rolefitInput.resume_before;

  for (const interaction of oracle.interactions.filter((item) => item.confirmed)) {
    const requirement = oracle.requirements.find((item) => item.id === interaction.requirement_id);
    if (!requirement?.profile_supported) {
      throw new Error(`Only profile-supported requirements may be confirmed: ${interaction.requirement_id}`);
    }
    if (after.includes(requirement.resume_evidence_pattern)) {
      throw new Error(`The confirmed requirement must be missing from the original resume: ${interaction.requirement_id}`);
    }
    if (!interaction.insert_after || !interaction.resume_change) {
      throw new Error(`Confirmed interaction ${interaction.requirement_id} needs insert_after and resume_change.`);
    }
    after = after.replace(interaction.insert_after, `${interaction.insert_after}\n${interaction.resume_change}`);
  }

  if (after === rolefitInput.resume_before) throw new Error("At least one confirmed resume change must be applied.");
  return after;
}

function categoryCoverage(requirements, resume, category, profileOnly) {
  const scoped = requirements.filter((requirement) => requirement.category === category
    && (!profileOnly || requirement.profile_supported));
  return percentage(
    scoped.filter((requirement) => String(resume || "").includes(requirement.resume_evidence_pattern)).length,
    scoped.length
  );
}

function potential(requirements, category) {
  const scoped = requirements.filter((requirement) => requirement.category === category);
  return percentage(scoped.filter((requirement) => requirement.profile_supported).length, scoped.length);
}

function scoreCategories(requirements, resume, profileOnly) {
  const basic = categoryCoverage(requirements, resume, "basic", profileOnly);
  const preferred = categoryCoverage(requirements, resume, "preferred", profileOnly);
  return { basic, preferred, combined: combined(basic, preferred) };
}

export function safetyErrors(fixture, resumeAfter) {
  const errors = [];
  const { profile, oracle } = fixture;
  const profileFacts = profile.experience.flatMap((entry) => entry.facts || []);
  const profileSkills = Object.values(profile.skills).flat();
  const profileSkillSet = new Set(profileSkills.map((skill) => skill.toLowerCase()));
  const declaredSkillSet = new Set(oracle.claimable_skills.map((skill) => skill.toLowerCase()));

  for (const skill of profileSkillSet) {
    if (!declaredSkillSet.has(skill)) errors.push(`Profile skill is missing from the oracle inventory: ${skill}`);
  }

  const skillsSection = String(resumeAfter || "").match(/\nSKILLS\n([\s\S]*?)(?:\n\n[A-Z][A-Z ]+\n|$)/);
  const resumeSkills = (skillsSection?.[1] || "")
    .split(/[,\n]/)
    .map((skill) => skill.trim())
    .filter(Boolean);
  for (const skill of resumeSkills) {
    if (!profileSkillSet.has(skill.toLowerCase())) errors.push(`Unsupported skill in final resume: ${skill}`);
  }

  for (const requirement of oracle.requirements) {
    if (!requirement.profile_supported && String(resumeAfter || "").includes(requirement.resume_evidence_pattern)) {
      errors.push(`Unsupported requirement in final resume: ${requirement.label}`);
    }
  }

  for (const interaction of oracle.interactions.filter((item) => item.confirmed)) {
    if (!profileFacts.includes(interaction.released_profile_fact)
      || !String(resumeAfter || "").includes(interaction.resume_change)) {
      errors.push(`Confirmed change is not grounded: ${interaction.requirement_id}`);
    }
  }
  return errors;
}

export function scoreFixtureResult(fixture, resumeAfter) {
  validateFixtureInput(fixture);
  const before = fixture.rolefit_input.resume_before;
  const requirements = fixture.oracle.requirements;
  const profileJobPotential = {
    basic: potential(requirements, "basic"),
    preferred: potential(requirements, "preferred")
  };
  profileJobPotential.combined = combined(profileJobPotential.basic, profileJobPotential.preferred);

  const representationBefore = scoreCategories(requirements, before, true);
  const representationAfter = scoreCategories(requirements, resumeAfter, true);
  representationAfter.delta = Number((representationAfter.combined - representationBefore.combined).toFixed(2));

  const outputStructureErrors = structureErrors(resumeAfter);
  const groundingErrors = safetyErrors(fixture, resumeAfter);
  return {
    profile_job_potential: profileJobPotential,
    resume_representation_before: representationBefore,
    resume_representation_after: representationAfter,
    grounding_safety: groundingErrors.length ? "FAIL" : "PASS",
    grounding_errors: groundingErrors,
    structure_preservation: structureErrors(before).length || outputStructureErrors.length ? "FAIL" : "PASS",
    structure_errors: outputStructureErrors
  };
}

export function formatScore(value) {
  return value === null ? "N/A" : `${value}%`;
}
