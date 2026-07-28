// Initializes feature adapters after all classic-script function declarations are available.
function titleCase(text) {
  return text
    .toLowerCase()
    .split(" ")
    .map((word) => word ? word[0].toUpperCase() + word.slice(1) : "")
    .join(" ");
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

const resumePreviewHighlighter = window.RoleFitResumePreviewHighlighter.create({
  escapeHtml,
  escapeRegExp,
  preferredSectionTitle,
  stripHtmlTags,
  unique
});

const resumeTextEditor = window.RoleFitResumeTextEditor.create({
  findSectionRange,
  getResumeSectionAliases,
  looksLikeInstructionOnly,
  normalizeSectionLabel,
  titleCase
});

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
