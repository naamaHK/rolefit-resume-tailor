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
    ...suggestCoreSectionOrderFixes(resumeText),
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

