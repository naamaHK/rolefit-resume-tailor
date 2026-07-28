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

