function percentage(numerator, denominator) {
  if (denominator === 0) return null;
  return Number(((100 * numerator) / denominator).toFixed(2));
}

function combined(basic, preferred) {
  if (basic === null) return preferred;
  if (preferred === null) return basic;
  return Number((basic * 0.75 + preferred * 0.25).toFixed(2));
}

function normalizedResumeText(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[–—]/g, "-")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function visibleExperienceYears(resume) {
  const lines = String(resume || "").split(/\n+/).map((line) => line.trim()).filter(Boolean);
  const start = lines.findIndex((line) => /^(?:professional\s+)?experience\s*:?$/i.test(line));
  if (start === -1) return 0;
  const coveredYears = new Set();
  const currentYear = new Date().getFullYear();
  for (let index = start + 1; index < lines.length; index += 1) {
    const line = lines[index];
    if (/^[A-Z][A-Z &/]+$/.test(line)) break;
    for (const match of line.matchAll(/\b((?:19|20)\d{2})\s*(?:-|–|—|to)\s*(Present|present|(?:19|20)\d{2})\b/g)) {
      const startYear = Number(match[1]);
      const endYear = /^present$/i.test(match[2]) ? currentYear : Number(match[2]);
      for (let year = startYear; year <= endYear; year += 1) coveredYears.add(year);
    }
  }
  return coveredYears.size;
}

function requirementEvidencePresent(requirement, resume) {
  if (Number.isFinite(requirement.minimum_experience_years)) {
    return visibleExperienceYears(resume) >= requirement.minimum_experience_years;
  }
  return String(resume || "").includes(requirement.resume_evidence_pattern);
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
  const experienceSection = String(resume || "").match(/\nEXPERIENCE\n([\s\S]*?)(?=\n\n[A-Z][A-Z ]+\n|$)/)?.[1] || "";
  const experienceLines = experienceSection.split("\n").map((item) => item.trim());
  for (let index = 0; index < experienceLines.length; index += 1) {
    const line = experienceLines[index];
    if (!line || /^[-*•]/.test(line) || !line.includes("|")) continue;
    if (!/\b(?:19|20)\d{2}\b/.test(line)) errors.push(`Experience entry is missing years: ${line}`);
  }
  for (let index = 0; index < experienceLines.length - 1; index += 1) {
    const line = experienceLines[index];
    const next = experienceLines[index + 1];
    if (!line || !next || /^[-*•]/.test(line) || /^[-*•]/.test(next)) continue;
    if (/\b(?:19|20)\d{2}\b/.test(line)) continue;
    errors.push(`Experience entry is missing years: ${line}`);
  }
  if (/\b(?:TBD|USER-CONFIRMED ADDITIONS|ask user)\b/i.test(resume)) errors.push("Resume contains internal or placeholder text.");
  return errors;
}

function moveSectionAfter(text, sectionTitle, targetTitle) {
  const blocks = String(text || "").trim().split(/\n{2,}/);
  const sectionPattern = new RegExp(`^${sectionTitle}\\s*$`, "im");
  const targetPattern = new RegExp(`^${targetTitle}\\s*$`, "im");
  const sectionIndex = blocks.findIndex((block) => sectionPattern.test(block));
  const targetIndex = blocks.findIndex((block) => targetPattern.test(block));
  if (sectionIndex === -1 || targetIndex === -1 || sectionIndex === targetIndex + 1) return text;
  const [section] = blocks.splice(sectionIndex, 1);
  const nextTargetIndex = blocks.findIndex((block) => targetPattern.test(block));
  blocks.splice(nextTargetIndex + 1, 0, section);
  return blocks.join("\n\n");
}

function applyExpectedResumeCheckInteractions(resume, interactions = []) {
  let after = String(resume || "");

  for (const interaction of interactions) {
    if (interaction.type === "spelling") {
      after = after.replaceAll(String(interaction.before || ""), String(interaction.answer || ""));
      continue;
    }
    if (interaction.type === "date") {
      const anchor = String(interaction.before || "");
      if (anchor && !anchor.includes(String(interaction.answer || ""))) {
        after = after.replace(anchor, `${anchor}${interaction.separator ?? " | "}${interaction.answer}`);
      }
      continue;
    }
    if (interaction.type === "reorder_section") {
      after = moveSectionAfter(after, interaction.section || "EDUCATION", interaction.after_section || "EXPERIENCE");
      continue;
    }
    if (interaction.type === "header") {
      const value = String(interaction.answer || "").trim();
      if (!value || after.includes(value)) continue;
      const firstSection = after.search(/^PROFESSIONAL SUMMARY$/m);
      if (firstSection === -1) {
        after = `${value}\n${after}`;
        continue;
      }
      const header = after.slice(0, firstSection).trim();
      const body = after.slice(firstSection);
      const lines = header ? header.split("\n") : [];
      if (interaction.field === "name") lines.unshift(value);
      else lines.push(value);
      after = `${lines.join("\n")}\n\n${body}`;
    }
  }

  return after.replace(/\n{3,}/g, "\n\n").trim();
}

export function buildExpectedAfterResume(fixture) {
  validateFixtureInput(fixture);
  const { rolefit_input: rolefitInput, oracle } = fixture;
  let after = applyExpectedResumeCheckInteractions(rolefitInput.resume_before, oracle.resume_check_interactions);

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

  if (after === rolefitInput.resume_before && oracle.expected?.requires_resume_change !== false) {
    throw new Error("At least one confirmed resume change must be applied.");
  }
  return after;
}

function categoryCoverage(requirements, resume, category, profileOnly) {
  const scoped = requirements.filter((requirement) => requirement.category === category
    && (!profileOnly || requirement.profile_supported));
  return percentage(
    scoped.filter((requirement) => requirementEvidencePresent(requirement, resume)).length,
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
  const profileFacts = [
    ...profile.experience.flatMap((entry) => entry.facts || []),
    ...profile.education.flatMap((entry) => [entry.degree, entry.institution, entry.dates]),
    ...(profile.certifications || []).flatMap((entry) => [entry.name, entry.issuer, entry.year])
  ].filter(Boolean);
  const profileSkills = Object.values(profile.skills).flat();
  const profileSkillSet = new Set(profileSkills.map((skill) => skill.toLowerCase()));
  const declaredSkillSet = new Set(oracle.claimable_skills.map((skill) => skill.toLowerCase()));

  for (const skill of profileSkillSet) {
    if (!declaredSkillSet.has(skill)) errors.push(`Profile skill is missing from the oracle inventory: ${skill}`);
  }

  const skillsSection = String(resumeAfter || "").match(/\nSKILLS\n([\s\S]*?)(?:\n\n[A-Z][A-Z ]+\n|$)/);
  const resumeSkills = (skillsSection?.[1] || "")
    .split(/[,•|\n]/)
    .map((skill) => skill.replace(/^[^:]+:\s*/, "").trim())
    .filter(Boolean);
  for (const skill of resumeSkills) {
    if (!profileSkillSet.has(skill.toLowerCase())) errors.push(`Unsupported skill in final resume: ${skill}`);
  }

  for (const requirement of oracle.requirements) {
    if (!requirement.profile_supported && requirementEvidencePresent(requirement, resumeAfter)) {
      errors.push(`Unsupported requirement in final resume: ${requirement.label}`);
    }
  }

  for (const interaction of oracle.interactions.filter((item) => item.confirmed)) {
    if (!profileFacts.includes(interaction.released_profile_fact)
      || !normalizedResumeText(resumeAfter).includes(normalizedResumeText(interaction.resume_change))) {
      errors.push(`Confirmed change is not grounded: ${interaction.requirement_id}`);
    }
  }
  return errors;
}

export function repairErrors(fixture, resumeAfter) {
  const errors = [];
  for (const interaction of fixture.oracle.resume_check_interactions || []) {
    const text = String(resumeAfter || "");
    if (interaction.expect_absent && text.includes(interaction.expect_absent)) {
      errors.push(`Resume Check repair remains: ${interaction.expect_absent}`);
    }
    if (interaction.expect_present && !text.includes(interaction.expect_present)) {
      errors.push(`Resume Check repair is missing: ${interaction.expect_present}`);
    }
    if (interaction.expect_pattern && !(new RegExp(interaction.expect_pattern, "i")).test(text)) {
      errors.push(`Resume Check repair does not match: ${interaction.expect_pattern}`);
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

  const inputStructureErrors = structureErrors(before);
  const outputStructureErrors = structureErrors(resumeAfter);
  const groundingErrors = safetyErrors(fixture, resumeAfter);
  const repairIssues = repairErrors(fixture, resumeAfter);
  return {
    profile_job_potential: profileJobPotential,
    resume_representation_before: representationBefore,
    resume_representation_after: representationAfter,
    grounding_safety: groundingErrors.length ? "FAIL" : "PASS",
    grounding_errors: groundingErrors,
    repair_integrity: repairIssues.length ? "FAIL" : "PASS",
    repair_errors: repairIssues,
    structure_before: inputStructureErrors.length ? "FAIL" : "PASS",
    structure_preservation: outputStructureErrors.length ? "FAIL" : "PASS",
    structure_errors: outputStructureErrors
  };
}

export function formatScore(value) {
  return value === null ? "N/A" : `${value}%`;
}
