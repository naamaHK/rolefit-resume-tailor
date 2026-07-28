function previewChangeOnResume(change, editBox, placementToPreview = "") {
  renderMissingExperienceSidePanel([]);
  const baseText = finalResume.value.trim() || resumeInput.value.trim();
  if (!baseText) {
    setAiStatus("Add a resume before previewing suggestions.", "error");
    return;
  }

  const selectedPlacement = placementToPreview && getSelectedPlacements(change).includes(placementToPreview)
    ? placementToPreview
    : "";
  if (selectedPlacement) {
    ensurePlacementConfirmationMode(change, selectedPlacement);
  }
  const previewChange = {
    ...change,
    ...(selectedPlacement ? {
      placement: selectedPlacement,
      placements: [selectedPlacement],
      acceptedPlacements: [],
      section: getPlacementSectionTitle(selectedPlacement, change)
    } : {}),
    suggestedText: editBox
      ? buildSpellingSuggestedLine(change, editBox.value.trim())
      : change.suggestedText
  };
  if ((selectedPlacement || getConfirmedPlacement(previewChange)) === "experience") {
    captureExperienceSelectionSnapshot(change, baseText);
    Object.assign(previewChange, {
      experienceTargetTitle: change.experienceTargetTitle,
      experienceTargetCompany: change.experienceTargetCompany,
      experienceTargetYears: change.experienceTargetYears,
      experienceOriginalBullet: change.experienceOriginalBullet
    });
  } else if ((selectedPlacement || getConfirmedPlacement(previewChange)) === "projects") {
    captureProjectSelectionSnapshot(change, baseText);
    Object.assign(previewChange, {
      projectTargetName: change.projectTargetName,
      projectTargetYear: change.projectTargetYear,
      projectOriginalBullet: change.projectOriginalBullet
    });
  } else if ((selectedPlacement || getConfirmedPlacement(previewChange)) === "education") {
    captureEducationSelectionSnapshot(change, baseText);
    Object.assign(previewChange, {
      educationTargetDegree: change.educationTargetDegree,
      educationTargetInstitution: change.educationTargetInstitution,
      educationTargetYears: change.educationTargetYears,
      educationOriginalDetail: change.educationOriginalDetail
    });
  }
  if (editBox) {
    change.suggestedText = previewChange.suggestedText;
    change.userDraftText = previewChange.suggestedText;
  }
  let placementWarning = "";
  if (isPlacementConfirmation(previewChange)) {
    if (!getSelectedPlacements(change).length && previewChange.suggestedText) {
      change.placement = inferConfirmedPlacement(previewChange, previewChange.suggestedText);
      change.placements = [change.placement];
      previewChange.placement = change.placement;
      previewChange.placements = change.placements;
    }
    const validation = validateConfirmedPlacement(previewChange, baseText);
    if (validation.error) {
      showChangeValidationError(change, validation.error, selectedPlacement || (getSelectedPlacements(change).length === 1 ? getSelectedPlacements(change)[0] : ""));
      renderActiveCommentPanel(change);
      return;
    }
    clearChangeValidationError(change);
    change.previewedKey = getPreviewRequirementKey(previewChange);
    if (selectedPlacement) {
      change.previewedPlacementKeys = {
        ...(change.previewedPlacementKeys || {}),
        [selectedPlacement]: getPlacementPreviewKey(change, selectedPlacement)
      };
    } else {
      for (const placement of getPreviewablePlacements(change)) {
        change.previewedPlacementKeys = {
          ...(change.previewedPlacementKeys || {}),
          [placement]: getPlacementPreviewKey(change, placement)
        };
      }
    }
    placementWarning = validation.warning || "";
  }
  const shouldPreviewRemoval = isRemovalPreview(previewChange);
  const appliedText = applySingleChange(baseText, previewChange);
  const text = normalizeFinalResumeText(appliedText);
  if (!shouldPreviewRemoval && !isPlacementConfirmation(previewChange) && isConcreteChangeNoOpForResume(baseText, previewChange)) {
    showChangeValidationError(change, "This change could not be matched to the current resume, so there is no reliable preview.");
    renderActiveCommentPanel(change);
    return;
  }
  const spellingDidChangeText = previewChange.type !== "spelling_check"
    || normalizeFinalResumeText(baseText) !== text;
  const style = exportStyleSelect.value;
  const resumeHtml = style === "designed" ? formatDesignedResumeForPrint(text) : formatResumeForPrint(text);
  const previewTarget = buildStructuredPreviewTarget(previewChange, editBox);
  const experiencePlacementHighlight = highlightExperiencePlacementInHtml(
    resumeHtml,
    previewTarget.change,
    baseText,
    text
  );
  let highlighted = !spellingDidChangeText
    ? { html: resumeHtml, matched: "" }
    : shouldPreviewRemoval
      ? highlightRemovalResultContextInHtml(resumeHtml, previewChange)
    : experiencePlacementHighlight.handled
      ? experiencePlacementHighlight
    : shouldHighlightInsertedSection(previewChange, baseText)
    ? highlightSectionInHtml(resumeHtml, previewChange.section)
    : shouldHighlightInsertedCandidateSet(previewChange)
      ? highlightAllMatchesInSectionHtml(resumeHtml, previewTarget.candidates, previewTarget.section)
      : highlightChangeInHtml(resumeHtml, previewTarget);
  const existingSkillsPlacement = isPlacementConfirmation(previewChange)
    && getConfirmedPlacement(previewChange) === "skills"
    && hasSection(baseText, ["skills", "technical skills"]);
  const isStructuredEducationRewrite = canonicalSectionTitle(previewChange.section) === "education"
    && previewChange.mode === "replace"
    && getFirstNonEmptyLine(previewChange.originalText)
    && getFirstNonEmptyLine(previewChange.suggestedText);
  if (
    !highlighted.matched
    && !experiencePlacementHighlight.handled
    && !isRemovalPreview(previewChange)
    && (shouldFallbackToSectionHighlight(previewChange) || isStructuredEducationRewrite)
    && !existingSkillsPlacement
  ) {
    highlighted = highlightSectionInHtml(resumeHtml, previewChange.section);
  }

  pdfPreview.classList.toggle("designed-template", style === "designed");
  pdfPreview.classList.toggle("ats-template", style !== "designed");
  pdfPreview.innerHTML = `
    <div class="preview-comment-banner ${escapeHtml(getSuggestionKind(change))}">
      ${renderPreviewPassOverview()}
      <strong>${escapeHtml(getSuggestionKindLabel(getSuggestionKind(change)))}:</strong>
      ${escapeHtml(getChangePointLabel(change))}
      ${highlighted.matched ? "" : `<span>No exact matching resume text was found.</span>`}
      ${renderRemainingOpenCommentsNotice(change)}
      <button class="preview-return-button" type="button" data-action="show-numbered-comments">Return to Review</button>
      <button class="secondary-button" type="button" data-action="return-review">Back to Comment</button>
    </div>
    ${highlighted.html}
  `;
  pdfPreviewPanel.hidden = false;
  bindPreviewPassButtons();
  renderActiveCommentPanel(change);
  pdfPreview.querySelector("[data-action='show-numbered-comments']")?.addEventListener("click", () => {
    renderNumberedCommentPreview();
    renderActiveCommentPanel(change);
  });
  pdfPreview.querySelector("[data-action='return-review']")?.addEventListener("click", () => {
    const target = activeCommentPanel && !activeCommentPanel.hidden ? activeCommentPanel : changeCards;
    target.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  const target = pdfPreview.querySelector(".resume-preview-highlight") || pdfPreview.querySelector(".resume-preview-section-highlight") || pdfPreviewPanel;
  target.scrollIntoView({ behavior: "smooth", block: "center" });
  setAiStatus(
    placementWarning
      ? placementWarning
      : highlighted.matched
      ? "Preview opened and highlighted the related resume area."
      : "Preview opened. This suggestion may be an insertion, so there may be no existing text to highlight.",
    highlighted.matched ? "success" : "neutral"
  );
}

function shouldHighlightInsertedSection(change, baseText) {
  if (!change?.requiresUserWording || !isPlacementConfirmation(change)) return false;
  const placement = getConfirmedPlacement(change);

  if (placement === "skills") {
    return !hasSection(baseText, ["skills", "technical skills"]);
  }

  if (placement === "projects") {
    return getProjectAction(change) === "new" && !hasSection(baseText, ["selected projects", "projects"]);
  }

  if (placement === "certifications") {
    return !hasSection(baseText, ["certifications"]);
  }

  if (placement === "other") {
    const title = normalizeCustomSectionTitle(change.otherSectionName || "");
    if (!title) return false;
    if (isVolunteerSectionTitle(title)) {
      return !hasSection(baseText, ["volunteer experience", "volunteer work", "volunteering"]);
    }
    return !hasSection(baseText, [title]);
  }

  return false;
}

function getPrintDocumentTitle(text) {
  const parsed = parseResumeText(text);
  const name = parsed.headerLines[0] || "Resume";
  return `${name.replace(/\s+/g, " ").trim()} Resume`;
}

function exportResumePdf() {
  try {
    const text = ensureFinalResumeText();
    const style = exportStyleSelect.value;
    const pagePlan = style === "designed" ? getDesignedPageBudgetPlan(text) : null;
    if (pagePlan?.overBudget && !pageBudgetOverride) {
      renderNumberedCommentPreview();
      pdfPreviewPanel.hidden = false;
      pdfPreviewPanel.scrollIntoView({ behavior: "smooth", block: "start" });
      setAiStatus("Page 1 is too full. Choose Keep Longer Resume or Get Shortening Suggestions before exporting.", "neutral");
      return;
    }
    const resumeHtml = style === "designed" ? formatDesignedResumeForPrint(text) : formatResumeForPrint(text);
    pdfPreview.classList.toggle("designed-template", style === "designed");
    pdfPreview.classList.toggle("ats-template", style !== "designed");
    pdfPreview.innerHTML = resumeHtml;
    pdfPreviewPanel.hidden = false;
    pdfPreviewPanel.scrollIntoView({ behavior: "smooth", block: "start" });
    const previousTitle = document.title;
    document.title = " ";
    window.addEventListener("afterprint", () => {
      document.title = previousTitle;
    }, { once: true });
    setTimeout(() => window.print(), 250);
  } catch (error) {
    alert(error.message || "Could not export the resume.");
  }
}

function updateCounts() {
  resumeCount.textContent = `${wordCount(resumeInput.value)} words`;
  jobCount.textContent = `${wordCount(jobInput.value)} words`;
}

function setUploadStatus(message, kind = "neutral") {
  resumeUploadStatus.textContent = message;
  resumeUploadStatus.dataset.kind = kind;
}

async function loadPdfJs() {
  if (pdfJsModule) return pdfJsModule;

  if (window.location.protocol === "file:") {
    throw new Error("PDF upload needs the local server. Run `node server.mjs` from the RoleFit_resume folder, then open http://127.0.0.1:8765/index.html.");
  }

  pdfJsModule = await import("../vendor/pdfjs/pdf.min.mjs");
  pdfJsModule.GlobalWorkerOptions.workerSrc = "vendor/pdfjs/pdf.worker.min.mjs";
  return pdfJsModule;
}

function normalizeExtractedPdfText(text) {
  return text
    .replace(/\r/g, "")
    .replace(/[•●▪■◦]/g, "-")
    .replace(/[\uE000-\uF8FF]/g, "")
    .replace(/^E\s+/gm, "")
    .replace(/^q\s+/gm, "")
    .replace(/^b\s+(?=[A-Z])/gim, "")
    .replace(/\bE\s{1,}ective\b/g, "Effective")
    .replace(/\bsigni\s+fi\s+cant\b/g, "significant")
    .replace(/\bsigni\s+ficant\b/g, "significant")
    .replace(/\bfi\s+([a-z])/g, "fi$1")
    .replace(/\s+-\s+/g, " - ")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function isDecorativePdfText(text) {
  return !/[A-Za-z0-9]/.test(text);
}

function getPdfItemBounds(item) {
  const [, , , , x, y] = item.transform;
  return {
    text: item.str.trim(),
    x,
    y,
    width: item.width || 0
  };
}

function groupPdfItemsIntoLines(items) {
  const sorted = [...items].sort((a, b) => {
    if (Math.abs(b.y - a.y) > 3) return b.y - a.y;
    return a.x - b.x;
  });
  const lines = [];

  for (const item of sorted) {
    let line = lines.find((candidate) => Math.abs(candidate.y - item.y) <= 3);

    if (!line) {
      line = { y: item.y, items: [] };
      lines.push(line);
    }

    line.items.push(item);
    line.y = (line.y * (line.items.length - 1) + item.y) / line.items.length;
  }

  return lines
    .sort((a, b) => b.y - a.y)
    .map((line) => {
      const ordered = line.items.sort((a, b) => a.x - b.x);
      return ordered.map((item) => item.text).join(" ").replace(/\s+/g, " ").trim();
    })
    .filter(Boolean);
}

function splitPdfItemsByColumn(items, pageWidth) {
  const rightColumnThreshold = pageWidth * 0.62;
  const rightItems = items.filter((item) => item.x >= rightColumnThreshold);
  const leftItems = items.filter((item) => item.x < rightColumnThreshold);
  const hasUsefulRightColumn = rightItems.length >= 8;

  if (!hasUsefulRightColumn) {
    return [items];
  }

  return [leftItems, rightItems].filter((column) => column.length);
}

function addResumeSectionBreaks(text) {
  const sectionPattern = /\b(STATEMENT|SUMMARY|PROFILE|EXPERIENCE|EDUCATION|PUBLICATIONS|PATENTS|STRENGTHS|ACHIEVEMENTS|SKILLS|LANGUAGES|CERTIFICATIONS|PROJECTS)\b/g;
  return text
    .split("\n")
    .map((line) => {
      if (/^[A-Z][A-Z\s/&-]{2,}$/.test(line.trim())) return line;
      return line.replace(sectionPattern, "\n$1\n");
    })
    .join("\n")
    .replace(/\n{3,}/g, "\n\n");
}

async function extractPdfText(file) {
  const pdfjs = await loadPdfJs();
  const buffer = await file.arrayBuffer();
  const documentTask = pdfjs.getDocument({ data: buffer });
  const pdf = await documentTask.promise;
  const pageTexts = [];

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const viewport = page.getViewport({ scale: 1 });
    const textContent = await page.getTextContent();
    const items = textContent.items
      .map(getPdfItemBounds)
      .filter((item) => item.text && !isDecorativePdfText(item.text));
    const columnTexts = splitPdfItemsByColumn(items, viewport.width)
      .map((columnItems) => groupPdfItemsIntoLines(columnItems).join("\n"))
      .filter(Boolean);
    pageTexts.push(columnTexts.join("\n\n"));
  }

  return normalizeExtractedPdfText(addResumeSectionBreaks(pageTexts.join("\n\n")));
}

async function extractTextFile(file) {
  return normalizeExtractedPdfText(await file.text());
}

async function handleResumeFileUpload(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  try {
    setUploadStatus(`Reading ${file.name}...`, "neutral");

    const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
    const isText = file.type === "text/plain" || file.name.toLowerCase().endsWith(".txt");

    if (!isPdf && !isText) {
      throw new Error("Please upload a PDF or plain text file.");
    }

    const extractedText = isPdf ? await extractPdfText(file) : await extractTextFile(file);

    if (!extractedText || wordCount(extractedText) < 20) {
      throw new Error("I could not extract enough text. Try copying from the PDF and pasting manually.");
    }

    resumeInput.value = extractedText;
    updateCounts();
    setUploadStatus(`Loaded ${file.name}. Review the extracted text before analyzing.`, "success");
  } catch (error) {
    setUploadStatus(error.message || "Could not read this file.", "error");
  } finally {
    event.target.value = "";
  }
}

function loadSample() {
  resumeInput.value = sampleResume.trim();
  jobInput.value = sampleJobDescription.trim();
  updateCounts();
}

function clearReviewState() {
  currentChanges = [];
  acceptanceSequence = 0;
  dismissedChangeKeys.clear();
  completedPasses.clear();
  loadingPasses.clear();
  pageBudgetOverride = false;
  latestAiAnalysis = null;
  latestAiJobDescription = "";
  latestAiBaselineResume = "";
  activePass = PASS_CLEANUP;
  changeCards.innerHTML = `<p class="empty-state">Change cards will appear here. Each one needs your decision.</p>`;
  analysisOutput.innerHTML = `<p class="empty-state">Paste or upload a resume, then run the analysis. Add a job description only for role-specific tailoring.</p>`;
  matchScore.textContent = "--";
  changeCount.textContent = "0 pending";
  pdfPreview.innerHTML = "";
  pdfPreviewPanel.hidden = true;
  if (missingExperiencePanel) {
    missingExperiencePanel.innerHTML = "";
    missingExperiencePanel.hidden = true;
  }
  activeCommentPanel.hidden = true;
  updatePassUi();
}

function startNewResume() {
  resumeInput.value = "";
  finalResume.value = "";
  setUploadStatus("", "neutral");
  setAiStatus("", "neutral");
  clearReviewState();
  updateCounts();
}

function clearJobRole() {
  jobInput.value = "";
  setAiStatus("", "neutral");
  updateCounts();
}

function analyze() {
  const resumeText = getWorkingResumeText();
  const jobText = jobInput.value.trim();

  if (!resumeText) {
    analysisOutput.innerHTML = `<p class="empty-state">Please paste or upload a resume.</p>`;
    changeCards.innerHTML = `<p class="empty-state">No changes suggested yet.</p>`;
    matchScore.textContent = "--";
    changeCount.textContent = "0 pending";
    return;
  }

  const analysis = buildJobAnalysis(resumeText, jobText);
  latestAiAnalysis = null;
  latestAiJobDescription = "";
  latestAiBaselineResume = "";
  refreshResumeCheckPass(resumeText);
  renderAnalysis(analysis);
}

resumeInput.addEventListener("input", () => {
  pageBudgetOverride = false;
  updateCounts();
});
finalResume.addEventListener("input", refreshAiAnalysisForCurrentResume);
resumeFileInput.addEventListener("change", handleResumeFileUpload);
jobInput.addEventListener("input", updateCounts);
finalResume.addEventListener("input", () => {
  pageBudgetOverride = false;
});
analyzeBtn.addEventListener("click", analyze);
analyzeAiBtn.addEventListener("click", analyzeWithAi);
cleanupPassBtn?.addEventListener("click", () => setActivePass(PASS_CLEANUP));
suggestionsPassBtn?.addEventListener("click", () => setActivePass(PASS_SUGGESTIONS));
missingExperiencePassBtn?.addEventListener("click", () => setActivePass(PASS_MISSING_EXPERIENCE));
loadSampleBtn.addEventListener("click", loadSample);
newResumeBtn?.addEventListener("click", startNewResume);
clearJobBtn?.addEventListener("click", clearJobRole);
exportPdfBtn.addEventListener("click", exportResumePdf);
copyFinalBtn.addEventListener("click", async () => {
  if (!finalResume.value.trim()) return;
  await navigator.clipboard.writeText(finalResume.value);
  copyFinalBtn.textContent = "Copied";
  setTimeout(() => {
    copyFinalBtn.textContent = "Copy";
  }, 1200);
});

if (window.__ROLEFIT_TEST__) {
  window.__roleFitTest = {
    getCurrentChanges: () => currentChanges,
    setCurrentChanges: (changes) => {
      currentChanges = changes;
      acceptanceSequence = Math.max(
        acceptanceSequence,
        ...changes.map((change) => Number.isFinite(change.acceptanceSequence) ? change.acceptanceSequence : 0)
      );
    },
    resetState: () => {
      currentChanges = [];
      acceptanceSequence = 0;
      dismissedChangeKeys.clear();
      completedPasses.clear();
      loadingPasses.clear();
      pageBudgetOverride = false;
      latestAiAnalysis = null;
      latestAiJobDescription = "";
      latestAiBaselineResume = "";
      activePass = PASS_CLEANUP;
    },
    setActivePass,
    getActivePass: () => activePass,
    setPassChanges,
    markPassesLoading,
    clearPassesLoading,
    acceptChangeFromCard,
    acceptPlacementFromCard,
    rejectChangeFromCard,
    previewChangeOnResume,
    refreshResumeCheckPass,
    renderChanges,
    renderNumberedCommentPreview,
    openChangeInCommentPanel: (id) => {
      const change = currentChanges.find((item) => item.id === id);
      if (!change) return false;
      renderActiveCommentPanel(change);
      return true;
    },
    openMissingExperienceCommentById,
    ensureFinalResumeText,
    getDesignedPageBudgetPlan,
    buildLocalSuggestionFallbackCards,
    buildMissingExperienceCardsFromAiAnalysis,
    buildMissingExperienceCardsFromRequirements,
    buildRoleCoverageState,
    renderAiAnalysis,
    refreshAiAnalysisForCurrentResume,
    retainOnlyCanonicalMissingExperienceCards,
    isGeneralResumeSuggestionAllowed,
    passes: {
      cleanup: PASS_CLEANUP,
      suggestions: PASS_SUGGESTIONS,
      missingExperience: PASS_MISSING_EXPERIENCE
    }
  };
}

updateCounts();
