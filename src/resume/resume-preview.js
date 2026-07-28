function humanize(value) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function stripHtmlTags(value) {
  const template = document.createElement("template");
  template.innerHTML = String(value || "");
  return template.content.textContent || "";
}

function getPreviewHighlightCandidates(change, editBox) {
  const currentInput = editBox?.value?.trim() || "";
  const minimumCandidateLength = isPlacementConfirmation(change) && getConfirmedPlacement(change) === "skills" ? 1 : 3;
  const previewSuggestedText = change.type === "spelling_check" && currentInput
    ? buildSpellingSuggestedLine(change, currentInput)
    : currentInput || change.suggestedText;
  const placementCandidates = getPlacementHighlightCandidates({ ...change, suggestedText: previewSuggestedText });
  const rewriteDiffCandidates = isRewritePreviewChange(change)
    ? getChangedAfterFragments(change.originalText, previewSuggestedText)
    : [];

  if (change.type === "spelling_check") {
    return unique([
      change.spellingAfter,
      ...getSpellingCorrectedTerms(change.originalText, previewSuggestedText),
    ].filter(Boolean));
  }

  if (change.requiresDateWording) {
    return unique([
      previewSuggestedText,
      change.originalText,
      change.entryLabel,
      change.missingTerm,
      change.evidence
    ]
      .filter(Boolean)
      .map((item) => stripHtmlTags(item).trim())
      .filter((item) => item.length >= 3 && !/missing from header|no direct evidence|awaiting your input/i.test(item))
    );
  }

  if (change.requiresRequiredFieldWording || change.requiresHeaderWording) {
    return unique([
      previewSuggestedText,
      currentInput,
      change.originalText,
      change.entryLabel,
      change.missingTerm,
      change.evidence
    ]
      .filter(Boolean)
      .map((item) => stripHtmlTags(item).trim())
      .filter((item) => item.length >= 2 && !/missing from header|no direct evidence|awaiting your input/i.test(item))
    );
  }

  return unique([
    ...placementCandidates,
    ...rewriteDiffCandidates,
    !isRewritePreviewChange(change) && previewSuggestedText && !looksLikeRemovalInstructionOnly(previewSuggestedText) ? previewSuggestedText : "",
    change.originalText,
    change.evidence,
    change.entryLabel,
    change.missingTerm,
    currentInput
  ]
    .flatMap((item) => [item, ...extractLineAnchorCandidates(item)])
    .filter(Boolean)
    .map((item) => stripHtmlTags(item).trim())
    .filter((item) => item.length >= minimumCandidateLength && !/missing from header|no direct evidence|awaiting your input/i.test(item))
  );
}

function isRewritePreviewChange(change) {
  return change?.mode === "replace" || change?.type === "rewrite";
}

function isTargetedPlacementRewrite(change) {
  if (!change?.requiresUserWording) return false;
  const placement = getConfirmedPlacement(change);
  if (placement === "experience") return getExperienceAction(change) === "enhance";
  if (placement === "projects") return getProjectAction(change) === "rewrite";
  if (placement === "education") return getEducationAction(change) === "rewrite";
  if (placement === "other") return (change.otherAction || "new") === "enhance";
  return false;
}

function getPreviewRewritePair(change) {
  if (!change) return { before: "", after: "" };
  if (!isTargetedPlacementRewrite(change)) {
    return {
      before: String(change.originalText || "").trim(),
      after: String(change.suggestedText || "").trim()
    };
  }

  const placement = getConfirmedPlacement(change);
  if (placement === "experience") {
    return {
      before: getSelectedExperienceBullet(change),
      after: String(change.experienceDraftText || change.suggestedText || "").trim()
    };
  }
  if (placement === "projects") {
    return {
      before: getSelectedProjectBullet(change),
      after: String(change.projectDetails || change.suggestedText || "").trim()
    };
  }
  if (placement === "education") {
    return {
      before: getSelectedEducationDetail(change),
      after: String(change.educationDetails || change.suggestedText || "").trim()
    };
  }

  const selectedItem = getEditableSectionItems(change.otherSectionName, getWorkingResumeText())[Number(change.otherItemIndex || 0)];
  return {
    before: String(selectedItem?.clean || selectedItem?.text || "").trim(),
    after: String(change.otherPlacementText || change.suggestedText || "").trim()
  };
}

function getChangedAfterFragments(beforeText, afterText) {
  return resumePreviewHighlighter.getChangedAfterFragments(beforeText, afterText);
}

function getChangedBeforeFragments(beforeText, afterText) {
  return resumePreviewHighlighter.getChangedBeforeFragments(beforeText, afterText);
}

function extractLineAnchorCandidates(text) {
  return String(text || "")
    .split(/\n+/)
    .map((line) => line.trim())
    .filter((line) => line.length >= 8 && !isKnownResumeSection(line));
}

function getPlacementHighlightCandidates(change) {
  if (!change.requiresUserWording) return [];
  const placement = getConfirmedPlacement(change);
  if (placement === "skills") return getSkillDraft(change);
  if (placement === "other") {
    if (isVolunteerSectionTitle(change.otherSectionName)) {
      const draft = getVolunteerDraft(change);
      return [draft.title, draft.place, draft.years, draft.bullet, change.otherSectionName].filter(Boolean);
    }
    if ((change.otherAction || "new") === "enhance") {
      const selectedItem = getEditableSectionItems(change.otherSectionName, getWorkingResumeText())[Number(change.otherItemIndex || 0)];
      const diff = getChangedAfterFragments(selectedItem?.clean || selectedItem?.text || "", change.otherPlacementText);
      return diff.length ? diff : [change.otherPlacementText].filter(Boolean);
    }
    return [change.otherPlacementText, change.otherSectionName].filter(Boolean);
  }
  if (placement === "projects") {
    const action = getProjectAction(change);
    if (action === "rewrite") {
      const diff = getChangedAfterFragments(getSelectedProjectBullet(change), change.projectDetails);
      return diff.length ? diff : [change.projectDetails].filter(Boolean);
    }
    if (action === "new_bullet") {
      return [change.projectDetails, getSelectedProjectTarget(change)?.labelText].filter(Boolean);
    }
    const draft = getProjectDraft(change);
    return [draft.name, draft.year, draft.label, ...draft.bullets.map(stripLeadingBullet)];
  }
  if (placement === "education") {
    if (getEducationAction(change) === "rewrite") {
      const diff = getChangedAfterFragments(getSelectedEducationDetail(change), change.educationDetails);
      return diff.length ? diff : [change.educationDetails].filter(Boolean);
    }
    const draft = getEducationDraft(change);
    return [draft.program, draft.institution, draft.year, change.educationDetails];
  }
  if (placement === "certifications") {
    const draft = getCertificationDraft(change);
    return [draft.name, draft.issuer, draft.year, draft.credentialId];
  }
  if (placement === "experience") {
    if (getExperienceAction(change) === "new_experience") {
      const draft = getNewExperienceDraft(change);
      return [draft.role, draft.company, draft.years, ...draft.bullets.map(stripLeadingBullet)];
    }
    if (getExperienceAction(change) === "enhance") {
      const diff = getChangedAfterFragments(getSelectedExperienceBullet(change), change.experienceDraftText);
      return diff.length ? diff : [change.experienceDraftText].filter(Boolean);
    }
    if (getExperienceAction(change) === "new") {
      return [change.experienceDraftText, getSelectedExperienceTarget(change)?.label].filter(Boolean);
    }
    const draft = getExperienceDraft(change);
    return [draft.role, draft.company, draft.years, ...draft.bullets.map(stripLeadingBullet)];
  }
  return [];
}

function highlightFirstMatchInHtml(html, candidates) {
  return resumePreviewHighlighter.highlightFirstMatchInHtml(html, candidates);
}

function findVisibleHtmlTextIndex(html, escapedText) {
  return resumePreviewHighlighter.findVisibleHtmlTextIndex(html, escapedText);
}

function findVisibleHtmlWholeWordIndex(html, escapedText) {
  return resumePreviewHighlighter.findVisibleHtmlWholeWordIndex(html, escapedText);
}

function isHtmlIndexInsideTag(html, index) {
  return resumePreviewHighlighter.isHtmlIndexInsideTag(html, index);
}

function getAnchorScore(blockText, candidates) {
  return resumePreviewHighlighter.getAnchorScore(blockText, candidates);
}

function addMarkerToBestBlockHtml(html, candidates, marker, options = {}) {
  return resumePreviewHighlighter.addMarkerToBestBlockHtml(html, candidates, marker, options);
}

function addExactCommentMarkerToHtml(html, candidates, change, options = {}) {
  const marker = renderResumeCommentMarker(change);
  const findIndex = options.wholeWord ? findVisibleHtmlWholeWordIndex : findVisibleHtmlTextIndex;
  const sectionMatch = getRenderedSectionMatch(html, change.section);
  if (sectionMatch) {
    const sectionHtml = sectionMatch[1];
    for (const candidate of candidates) {
      const escaped = escapeHtml(candidate);
      const index = findIndex(sectionHtml, escaped);
      if (index === -1) continue;

      const markedSection = `${sectionHtml.slice(0, index)}<mark class="resume-comment-anchor">${escaped}${marker}</mark>${sectionHtml.slice(index + escaped.length)}`;
      return {
        html: html.replace(sectionHtml, markedSection),
        matched: candidate
      };
    }
  }

  for (const candidate of candidates) {
    const escaped = escapeHtml(candidate);
    const index = findIndex(html, escaped);
    if (index === -1) continue;
    return {
      html: `${html.slice(0, index)}<mark class="resume-comment-anchor">${escaped}${marker}</mark>${html.slice(index + escaped.length)}`,
      matched: candidate
    };
  }

  return { html, matched: "" };
}

function getRenderedSectionMatch(html, sectionTitle) {
  return resumePreviewHighlighter.getRenderedSectionMatch(html, sectionTitle);
}

function highlightFirstMatchInSectionHtml(html, candidates, sectionTitle) {
  return resumePreviewHighlighter.highlightFirstMatchInSectionHtml(html, candidates, sectionTitle);
}

function highlightFirstWholeWordMatchInSectionHtml(html, candidates, sectionTitle) {
  return resumePreviewHighlighter.highlightFirstWholeWordMatchInSectionHtml(html, candidates, sectionTitle);
}

function highlightFirstWholeWordMatchInHtml(html, candidates) {
  return resumePreviewHighlighter.highlightFirstWholeWordMatchInHtml(html, candidates);
}

function getPreviewTargetAnchorCandidates(change) {
  const placement = getConfirmedPlacement(change);
  if (placement === "experience") {
    return [change.experienceTargetTitle, change.experienceTargetCompany, change.experienceTargetYears].filter(Boolean);
  }
  if (placement === "projects") {
    return [getSelectedProjectTarget(change)?.labelText].filter(Boolean);
  }
  if (placement === "education") {
    const target = getEducationTargets(getWorkingResumeText())
      .find((item) => item.key === change.educationEntryKey);
    return [target?.program, target?.institution, target?.years].filter(Boolean);
  }
  if (placement === "other") {
    const selectedItem = getEditableSectionItems(change.otherSectionName, getWorkingResumeText())[Number(change.otherItemIndex || 0)];
    return [selectedItem?.clean || selectedItem?.text].filter(Boolean);
  }
  return [change.entryLabel, change.originalText].filter(Boolean);
}

// Resolve the UI card into one immutable rendering input before any HTML work.
// Renderers consume this target and never inspect mutable card controls.
function buildStructuredPreviewTarget(change, editBox) {
  const placement = getConfirmedPlacement(change);
  return previewTargetBuilder.build({
    change,
    placement,
    candidates: getPreviewHighlightCandidates(change, editBox),
    anchors: getPreviewTargetAnchorCandidates(change),
    rewrite: getPreviewRewritePair(change)
  });
}

function addPreviewHighlightClassToBlock(block) {
  return resumePreviewHighlighter.addPreviewHighlightClassToBlock(block);
}

function highlightCandidatesInsideBlock(block, candidates) {
  return resumePreviewHighlighter.highlightCandidatesInsideBlock(block, candidates);
}

function highlightRewriteDiffInHtml(html, target) {
  const { change, rewrite: pair, anchors } = target;
  if (!pair.after) return { html, matched: "" };
  const fragments = getChangedAfterFragments(pair.before, pair.after);
  if (!fragments.length) return { html, matched: "" };
  return resumePreviewHighlighter.highlightRewriteDiffInHtml(html, change.section, pair, fragments, anchors);
}

function highlightBestBlockInHtml(html, candidates, options = {}) {
  return resumePreviewHighlighter.highlightBestBlockInHtml(html, candidates, options);
}

function highlightBestBlockInSectionHtml(html, candidates, sectionTitle, options = {}) {
  return resumePreviewHighlighter.highlightBestBlockInSectionHtml(html, candidates, sectionTitle, options);
}

function highlightGroupedBlocksInSectionHtml(html, sectionTitle, candidates) {
  return resumePreviewHighlighter.highlightGroupedBlocksInSectionHtml(html, sectionTitle, candidates);
}

function highlightExperienceChangeInHtml(html, sectionTitle, entries, targetIndex, options = {}) {
  return resumePreviewHighlighter.highlightExperienceChangeInHtml(
    html,
    sectionTitle,
    entries,
    targetIndex,
    options
  );
}

function highlightChangeInHtml(html, target, legacyChange = null) {
  // Keep the old test-facing adapter while all production calls use a target.
  if (legacyChange) {
    target = previewTargetBuilder.build({
      change: legacyChange,
      placement: getConfirmedPlacement(legacyChange),
      candidates: target,
      anchors: getPreviewTargetAnchorCandidates(legacyChange),
      rewrite: getPreviewRewritePair(legacyChange)
    });
  }
  const { change, candidates, rewrite } = target;
  if (change.type === "spelling_check") {
    const sectionScoped = highlightFirstWholeWordMatchInSectionHtml(html, candidates, change.section);
    if (sectionScoped.matched) return sectionScoped;
    return highlightFirstWholeWordMatchInHtml(html, candidates);
  }

  if (isRewritePreviewChange(change) || isTargetedPlacementRewrite(change)) {
    const diffHighlighted = highlightRewriteDiffInHtml(html, target);
    if (diffHighlighted.matched) return diffHighlighted;

    // A punctuation-only or similarly tiny Statement rewrite can have no
    // token-level diff. The text still changed, so show the resulting summary
    // block rather than leaving Preview apparently empty.
    if (isSummaryLikeSection(change.section)) {
      return highlightBestBlockInSectionHtml(
        html,
        [rewrite.after, rewrite.before],
        change.section,
        { threshold: 0.2 }
      );
    }

    return diffHighlighted;
  }

  const sectionScoped = highlightFirstMatchInSectionHtml(html, candidates, change.section);
  if (sectionScoped.matched) return sectionScoped;

  const fuzzySectionScoped = highlightBestBlockInSectionHtml(html, candidates, change.section);
  if (fuzzySectionScoped.matched) return fuzzySectionScoped;

  if (change.requiresDateWording || change.requiresRequiredFieldWording) {
    return { html, matched: "" };
  }

  const globalExact = highlightFirstMatchInHtml(html, candidates);
  if (globalExact.matched) return globalExact;

  return highlightBestBlockInHtml(html, candidates, { threshold: 0.58 });
}

function isRemovalPreview(change) {
  return change?.mode === "removeOrReplace"
    && (!String(change.suggestedText || "").trim() || looksLikeRemovalInstructionOnly(change.suggestedText));
}

function getRemovalPreviewCandidates(change) {
  return unique([
    change.originalText,
    ...extractLineAnchorCandidates(change.originalText)
  ]
    .map((item) => stripLeadingBullet(String(item || "")).trim())
    .filter((item) => item.length >= 3));
}

function getRemovalExperienceEntry(baseText, change) {
  if (canonicalSectionTitle(change.section) !== "experience") return null;
  const parsed = parseResumeText(baseText);
  const section = parsed.sections.find((item) => canonicalSectionTitle(item.title) === "experience");
  if (!section) return null;

  const targets = getRemovalPreviewCandidates(change)
    .map((item) => normalizeEntryAnchorForComparison(item))
    .filter(Boolean);
  if (!targets.length) return null;

  let bestMatch = null;
  for (const [index, entry] of parseExperienceEntries(section.lines).entries()) {
    const title = normalizeEntryAnchorForComparison(entry.title);
    const company = normalizeEntryAnchorForComparison(entry.company);
    const raw = normalizeEntryAnchorForComparison(entry.rawLine);
    const bullets = (entry.bullets || []).map(normalizeEntryAnchorForComparison).filter(Boolean);
    let score = 0;
    let matchesBullet = false;

    for (const target of targets) {
      if ([title, company, raw].includes(target)) score = Math.max(score, 6);
      if (bullets.includes(target)) {
        score = Math.max(score, 7);
        matchesBullet = true;
      }
      if ([title, company, raw, ...bullets].some((value) => value && (value.includes(target) || target.includes(value)))) {
        score = Math.max(score, 3);
      }
    }

    if (!bestMatch || score > bestMatch.score) {
      bestMatch = { entry: { ...entry, index }, score, matchesBullet };
    }
  }

  return bestMatch?.score >= 3 ? bestMatch : null;
}

function addRemovalClassToHtmlBlock(html, candidate) {
  const target = normalizeEntryAnchorForComparison(candidate);
  if (!target) return { html, matched: "" };

  function markBlock(full, tag, attributes, content) {
    if (/\bresume-preview-removal\b/.test(attributes)) return full;
    const visible = normalizeEntryAnchorForComparison(stripHtmlTags(content));
    if (!visible || !(visible.includes(target) || target.includes(visible))) return full;

    markBlock.matched = stripHtmlTags(content).trim();
    const openingTag = `<${tag}${attributes}>`;
    const markedOpeningTag = /\bclass=["']/.test(attributes)
      ? openingTag.replace(/\bclass=(["'])([^"']*)\1/i, (_, quote, classes) => `class=${quote}${classes} resume-preview-removal${quote}`)
      : `<${tag}${attributes} class="resume-preview-removal">`;
    return `${markedOpeningTag}${content}</${tag}>`;
  }

  let updated = html.replace(/<(h3|p|li)([^>]*)>([\s\S]*?)<\/\1>/gi, (full, tag, attributes, content) => {
    if (markBlock.matched) return full;
    return markBlock(full, tag, attributes, content);
  });
  if (markBlock.matched) return { html: updated, matched: markBlock.matched };

  updated = html.replace(/<div([^>]*\bentry-years\b[^>]*)>([\s\S]*?)<\/div>/gi, (full, attributes, content) => {
    if (markBlock.matched) return full;
    return markBlock(full, "div", attributes, content);
  });
  if (markBlock.matched) return { html: updated, matched: markBlock.matched };

  return { html, matched: "" };
}

function highlightRemovalExperienceEntryInHtml(html, sectionHtml, entry) {
  let highlightedSection = sectionHtml;
  const values = [entry.title, entry.company, entry.years, ...(entry.bullets || [])].filter(Boolean);
  const matches = [];

  for (const value of values) {
    const highlighted = addRemovalClassToHtmlBlock(highlightedSection, value);
    if (!highlighted.matched) continue;
    highlightedSection = highlighted.html;
    matches.push(highlighted.matched);
  }

  if (!matches.length) return { html, matched: "" };
  return {
    html: html.replace(sectionHtml, highlightedSection),
    matched: matches.join(" ")
  };
}

function highlightRemovalPreviewInHtml(html, change, baseText = "") {
  const sectionMatch = getRenderedSectionMatch(html, change.section);
  if (!sectionMatch) return highlightSectionHeaderForRemoval(html, change.section);

  const sectionHtml = sectionMatch[1];
  const experienceEntry = getRemovalExperienceEntry(baseText, change);
  if (experienceEntry && !experienceEntry.matchesBullet) {
    const entryHighlight = highlightRemovalExperienceEntryInHtml(html, sectionHtml, experienceEntry.entry);
    if (entryHighlight.matched) return entryHighlight;
  }

  for (const candidate of getRemovalPreviewCandidates(change)) {
    const escaped = escapeHtml(candidate);
    const index = findVisibleHtmlTextIndex(sectionHtml, escaped);
    if (index === -1) continue;
    const highlightedSection = `${sectionHtml.slice(0, index)}<mark class="resume-preview-removal">${escaped}</mark>${sectionHtml.slice(index + escaped.length)}`;
    return {
      html: html.replace(sectionHtml, highlightedSection),
      matched: candidate
    };
  }

  return highlightWholeSectionForRemoval(html, change.section);
}

function highlightRemovalResultContextInHtml(html, change) {
  // The removed text is intentionally absent from this preview. Mark the
  // affected section so the user can still orient themselves around the gap.
  return highlightWholeSectionForRemoval(html, change.section);
}

function highlightWholeSectionForRemoval(html, sectionTitle) {
  const match = getRenderedSectionMatch(html, sectionTitle);
  if (!match) return highlightSectionHeaderForRemoval(html, sectionTitle);
  return {
    html: html.replace(match[1], `<div class="resume-preview-removal-section-block">${match[1]}</div>`),
    matched: preferredSectionTitle({ title: sectionTitle || "" })
  };
}

function highlightSectionHeaderForRemoval(html, sectionTitle) {
  const cleanTitle = preferredSectionTitle({ title: sectionTitle || "" });
  if (!cleanTitle) return { html, matched: "" };
  const escapedTitle = escapeRegExp(escapeHtml(cleanTitle));
  const headerPattern = new RegExp(`<h2>${escapedTitle}<\\/h2>`, "i");
  if (!headerPattern.test(html)) return { html, matched: "" };
  return {
    html: html.replace(headerPattern, `<h2 class="resume-preview-removal-section">${escapeHtml(cleanTitle)}</h2>`),
    matched: cleanTitle
  };
}

function highlightAllMatchesInSectionHtml(html, candidates, sectionTitle) {
  return resumePreviewHighlighter.highlightAllMatchesInSectionHtml(html, candidates, sectionTitle);
}

function highlightFirstUnmarkedMatchInHtml(html, candidate) {
  return resumePreviewHighlighter.highlightFirstUnmarkedMatchInHtml(html, candidate);
}

function highlightSectionInHtml(html, sectionTitle) {
  return resumePreviewHighlighter.highlightSectionInHtml(html, sectionTitle);
}

function shouldFallbackToSectionHighlight(change) {
  if (!change) return false;
  if (change.mode === "replace" || change.type === "rewrite") return false;
  if (change.requiresUserWording) return true;
  if (change.mode === "append" || change.mode === "insertAfterHeader" || change.mode === "replaceSection") return true;
  if (!change.originalText && change.suggestedText) return true;
  return false;
}

function shouldHighlightInsertedCandidateSet(change) {
  if (!change?.requiresUserWording) return false;
  const placement = getConfirmedPlacement(change);
  if (placement === "skills") return getSkillDraft(change).length > 1;
  if (placement === "experience") return getExperienceAction(change) === "new_experience";
  if (placement === "projects") return getProjectAction(change) === "new";
  if (placement === "education") return getEducationAction(change) === "new";
  if (placement === "certifications") return true;
  return false;
}

function findExperiencePreviewTargetIndex(entries, change, baseText, action) {
  if (action !== "new_experience") {
    const selectedTarget = getSelectedExperienceTarget(change, baseText);
    return selectedTarget?.index ?? -1;
  }

  const draft = getNewExperienceDraft(change);
  const expectedTitle = normalize(draft.role);
  const expectedCompany = normalize(draft.company);
  const expectedYears = normalize(draft.years);
  const expectedBullet = normalizeBulletForMatch(draft.bullets[0] || "");
  return entries.findIndex((entry) => (
    normalize(entry.title || "") === expectedTitle
    && normalize(entry.company || "") === expectedCompany
    && normalize(entry.years || "") === expectedYears
    && (!expectedBullet || (entry.bullets || []).some((bullet) => normalizeBulletForMatch(bullet) === expectedBullet))
  ));
}

function highlightExperiencePlacementInHtml(html, change, baseText, appliedText) {
  if (!isPlacementConfirmation(change) || getConfirmedPlacement(change) !== "experience") {
    return { html, matched: "", handled: false };
  }

  const action = getExperienceAction(change, baseText);
  const entries = getExperienceTargets(appliedText);
  const targetIndex = findExperiencePreviewTargetIndex(entries, change, baseText, action);
  if (targetIndex === -1) return { html, matched: "", handled: true };

  const target = entries[targetIndex];
  const afterBullet = action === "new_experience"
    ? target.bullets[0] || ""
    : cleanConfirmedText(change.experienceDraftText || change.suggestedText || "");
  if (!afterBullet) return { html, matched: "", handled: true };

  if (action === "new_experience") {
    return {
      ...highlightExperienceChangeInHtml(
        html,
        change.section || "Experience",
        entries,
        targetIndex,
        {
          mode: "entry",
          blockText: stripLeadingBullet(afterBullet)
        }
      ),
      handled: true
    };
  }

  if (action === "new") {
    return {
      ...highlightExperienceChangeInHtml(
        html,
        change.section || "Experience",
        entries,
        targetIndex,
        {
          mode: "block",
          blockText: stripLeadingBullet(afterBullet)
        }
      ),
      handled: true
    };
  }

  const beforeBullet = change.experienceOriginalBullet
    || getSelectedExperienceBullet(change, baseText);
  const fragments = getChangedAfterFragments(beforeBullet, afterBullet);
  return {
    ...highlightExperienceChangeInHtml(
      html,
      change.section || "Experience",
      entries,
      targetIndex,
      {
        mode: "diff",
        blockText: stripLeadingBullet(afterBullet),
        fragments
      }
    ),
    handled: true
  };
}

function extractContextAnchorCandidates(text) {
  const value = String(text || "");
  const candidates = [];
  const roleAtCompany = value.match(/\b(?:as|for|role as|time as)\s+(?:a\s+|an\s+)?([A-Z][A-Za-z0-9+#/&(). -]{2,60}?)\s+at\s+([A-Z][A-Za-z0-9&(). -]{1,40})\b/);
  if (roleAtCompany) {
    const role = roleAtCompany[1].trim();
    const company = roleAtCompany[2].trim();
    candidates.push(`${role} at ${company}`, role, company);
  }

  const compactRoleCompany = value.match(/\b([A-Z][A-Za-z0-9+#/&(). -]{2,60}?)\s+(?:responsibilities|accomplishments|experience)\s+at\s+([A-Z][A-Za-z0-9&(). -]{1,40})\b/);
  if (compactRoleCompany) {
    const role = compactRoleCompany[1].trim();
    const company = compactRoleCompany[2].trim();
    candidates.push(`${role} at ${company}`, role, company);
  }

  for (const match of value.matchAll(/\bat\s+([A-Z][A-Za-z0-9&(). -]{1,40})\b/g)) {
    candidates.push(match[1].trim());
  }

  return candidates;
}

function getCommentMarkerCandidates(change) {
  if (change.type === "spelling_check") {
    return unique([
      ...(change.spellingBefore ? [change.spellingBefore] : []),
      ...getSpellingDiffTerms(change.originalText, change.suggestedText)
    ]
      .filter(Boolean)
      .map((item) => stripHtmlTags(item).trim())
      .filter((item) => item.length >= 2)
    );
  }

  const changedOriginalFragments = isRewritePreviewChange(change)
    ? getChangedBeforeFragments(change.originalText, change.suggestedText)
    : [];
  const originalAnchors = changedOriginalFragments.length
    ? changedOriginalFragments
    : [change.originalText];

  const sectionLabels = new Set([
    normalizeSectionLabel(change.section),
    ...getResumeSectionAliases(change.section || "").map(normalizeSectionLabel)
  ].filter(Boolean));

  return unique([
    ...(change.type === "spelling_check" ? getSpellingDiffTerms(change.originalText, change.suggestedText) : []),
    ...originalAnchors,
    change.evidence,
    change.entryLabel,
    change.missingTerm,
    change.promptText,
    ...extractContextAnchorCandidates(change.originalText),
    ...extractContextAnchorCandidates(change.evidence),
    ...extractContextAnchorCandidates(change.promptText),
    ...extractContextAnchorCandidates(change.missingTerm)
  ]
    .filter(Boolean)
    .map((item) => stripHtmlTags(item).trim())
    .filter((item) => {
      const normalized = normalizeSectionLabel(item);
      if (item.length < 4) return false;
      if (/missing from header|no direct evidence|awaiting your input|not in resume/i.test(item)) return false;
      if (sectionLabels.has(normalized) || isKnownResumeSection(item)) return false;
      return true;
    })
  );
}

function addCommentMarkerToHtml(html, candidates, change) {
  if (change.type === "spelling_check") {
    return addExactCommentMarkerToHtml(html, candidates, change, { wholeWord: true });
  }

  if (!change.originalText && change.suggestedText) {
    const insertionMarked = addInsertionMarkerToSectionHtml(html, change);
    if (insertionMarked.matched) return insertionMarked;
  }

  const scoped = addCommentMarkerToSectionHtml(html, candidates, change);
  if (scoped.matched) return scoped;

  const globalFuzzy = addMarkerToBestBlockHtml(html, candidates, renderResumeCommentMarker(change), { threshold: 0.58 });
  if (globalFuzzy.matched) return globalFuzzy;

  const sectionMarked = addCommentMarkerToSectionHeaderHtml(html, change);
  if (sectionMarked.matched) {
    return sectionMarked;
  }

  for (const candidate of candidates) {
    const escaped = escapeHtml(candidate);
    const index = findVisibleHtmlTextIndex(html, escaped);
    if (index === -1) continue;

    const marker = renderResumeCommentMarker(change);
    return {
      html: `${html.slice(0, index)}<mark class="resume-comment-anchor">${escaped}${marker}</mark>${html.slice(index + escaped.length)}`,
      matched: candidate
    };
  }

  return { html, matched: "" };
}

function addInsertionMarkerToSectionHtml(html, change) {
  const cleanTitle = preferredSectionTitle({ title: change.section || "" });
  const match = getRenderedSectionMatch(html, change.section);
  if (!match || !cleanTitle) return { html, matched: "" };

  const sectionHtml = match[1];
  const marker = renderResumeCommentMarker(change);
  const markedSection = sectionHtml.replace(/(<h2>[\s\S]*?<\/h2>)/i, `$1${marker}`);
  if (markedSection === sectionHtml) return { html, matched: "" };

  return {
    html: html.replace(sectionHtml, markedSection),
    matched: cleanTitle
  };
}

function addCommentMarkerToSectionHeaderHtml(html, change) {
  const cleanTitle = preferredSectionTitle({ title: change.section || "" });
  const match = getRenderedSectionMatch(html, change.section);
  if (!match || !cleanTitle) return { html, matched: "" };

  const sectionHtml = match[1];
  const escapedTitle = escapeHtml(cleanTitle);
  const marker = renderResumeCommentMarker(change);
  const markedSection = sectionHtml.replace(
    new RegExp(`(<h2>${escapeRegExp(escapedTitle)})(<\\/h2>)`, "i"),
    `$1${marker}$2`
  );

  if (markedSection === sectionHtml) return { html, matched: "" };

  return {
    html: html.replace(sectionHtml, markedSection),
    matched: cleanTitle
  };
}

function addCommentMarkerToSectionHtml(html, candidates, change) {
  const match = getRenderedSectionMatch(html, change.section);
  if (!match) return { html, matched: "" };

  const sectionHtml = match[1];
  const marker = renderResumeCommentMarker(change);
  for (const candidate of candidates) {
    const escaped = escapeHtml(candidate);
    const index = findVisibleHtmlTextIndex(sectionHtml, escaped);
    if (index === -1) continue;

    const markedSection = `${sectionHtml.slice(0, index)}<mark class="resume-comment-anchor">${escaped}${marker}</mark>${sectionHtml.slice(index + escaped.length)}`;
    return {
      html: html.replace(sectionHtml, markedSection),
      matched: candidate
    };
  }

  const fuzzy = addMarkerToBestBlockHtml(sectionHtml, candidates, marker);
  if (fuzzy.matched) {
    return {
      html: html.replace(sectionHtml, fuzzy.html),
      matched: fuzzy.matched
    };
  }

  return { html, matched: "" };
}

function getCommentColorClass(change) {
  return `${getSuggestionKind(change)} ${getChangePriorityClass(change)}`;
}

function renderResumeCommentMarker(change) {
  return `<button class="resume-comment-marker ${escapeHtml(getCommentColorClass(change))}" type="button" data-comment-id="${escapeHtml(change.id)}" aria-label="Open comment ${escapeHtml(change.commentNumber)}">${escapeHtml(change.commentNumber)}</button>`;
}

function renderCommentLegend() {
  const jobLegend = hasTargetJobDescription()
    ? `<span><i class="legend-dot job"></i>Job-specific</span>`
    : "";

  return `
    <span class="comment-legend">
      <span><i class="legend-dot mandatory"></i>Mandatory</span>
      ${jobLegend}
      <span><i class="legend-dot improvement"></i>Resume improvement</span>
    </span>
  `;
}

function countOpenChangesForPass(pass) {
  return currentChanges.filter((change) =>
    inferChangePass(change) === pass
    && isOpenChange(change)
    && !dismissedChangeKeys.has(getDismissalKey(change))
  ).length;
}

function countAllOpenChanges() {
  return REVIEW_PASSES.reduce((sum, pass) => sum + countOpenChangesForPass(pass.id), 0);
}

function renderPreviewPassOverview() {
  return `
    <span class="preview-pass-overview" aria-label="Review passes">
      ${REVIEW_PASSES.map((pass, index) => `
        <button class="preview-pass-pill ${activePass === pass.id ? "active" : ""}" type="button" data-preview-pass="${pass.id}">${index + 1}. ${escapeHtml(pass.label)}${escapeHtml(getPassTabSuffix(pass.id))}</button>
      `).join("")}
    </span>
  `;
}

function renderOtherPassOpenNotice() {
  const parts = REVIEW_PASSES
    .filter((pass) => pass.id !== activePass)
    .map((pass) => ({ ...pass, count: countOpenChangesForPass(pass.id) }))
    .filter((pass) => pass.count > 0)
    .map((pass) => `${pass.count} in ${escapeHtml(pass.label)}`);
  if (!parts.length) return "";
  const total = parts.reduce((sum, part) => sum + Number(part.match(/^\d+/)?.[0] || 0), 0);
  if (parts.length === 1) {
    const pass = REVIEW_PASSES.find((item) => parts[0].includes(item.label));
    return `<span class="other-pass-notice">${total} open comment${total === 1 ? "" : "s"} ${total === 1 ? "remains" : "remain"} in ${escapeHtml(pass?.label || "another pass")}.</span>`;
  }
  return `<span class="other-pass-notice">${total} open comment${total === 1 ? "" : "s"} ${total === 1 ? "remains" : "remain"} in other passes: ${parts.join(", ")}.</span>`;
}

function renderRemainingOpenCommentsNotice(currentChange = null) {
  const activeRemaining = currentChanges.filter((change) =>
    change !== currentChange
    && change.id !== currentChange?.id
    && inferChangePass(change) === activePass
    && isOpenChange(change)
    && !dismissedChangeKeys.has(getDismissalKey(change))
  ).length;
  const otherParts = REVIEW_PASSES
    .filter((pass) => pass.id !== activePass)
    .map((pass) => ({ ...pass, count: countOpenChangesForPass(pass.id) }))
    .filter((pass) => pass.count > 0);
  const otherRemaining = otherParts.reduce((sum, pass) => sum + pass.count, 0);
  const total = activeRemaining + otherRemaining;
  if (!total) return "";

  const parts = [];
  if (activeRemaining) {
    parts.push(`${activeRemaining} more in ${escapeHtml(getPassLabel(activePass))}`);
  }
  parts.push(...otherParts.map((pass) => `${pass.count} in ${escapeHtml(pass.label)}`));

  return `<span class="other-pass-notice">${total} other open comment${total === 1 ? "" : "s"} ${total === 1 ? "remains" : "remain"}: ${parts.join(", ")}.</span>`;
}

function bindPreviewPassButtons() {
  pdfPreview.querySelectorAll("[data-preview-pass]").forEach((button) => {
    button.addEventListener("click", () => {
      setActivePass(button.dataset.previewPass);
    });
  });
  pdfPreview.querySelector("[data-action='preview-export-style']")?.addEventListener("change", (event) => {
    exportStyleSelect.value = event.target.value;
    renderNumberedCommentPreview();
  });
  pdfPreview.querySelector("[data-action='view-updated-preview']")?.addEventListener("click", () => {
    const target = pdfPreview.querySelector(".resume-header") || pdfPreview.querySelector(".designed-resume") || pdfPreview;
    target.scrollIntoView({ behavior: "smooth", block: "start" });
  });
  pdfPreview.querySelectorAll("[data-action='return-review']").forEach((button) => {
    button.addEventListener("click", () => {
      const target = activeCommentPanel && !activeCommentPanel.hidden ? activeCommentPanel : changeCards;
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });
  pdfPreview.querySelector("[data-action='export-pdf-inline']")?.addEventListener("click", () => {
    exportResumePdf();
  });
  pdfPreview.querySelector("[data-action='keep-longer-resume']")?.addEventListener("click", () => {
    pageBudgetOverride = true;
    setAiStatus("Keeping the longer resume. No content was removed.", "neutral");
    renderNumberedCommentPreview();
  });
  pdfPreview.querySelector("[data-action='get-shortening-suggestions']")?.addEventListener("click", () => {
    analyzeWithAi({ pageBudgetMode: true });
  });
}

function bindMissingExperiencePanel() {
  if (!missingExperiencePanel) return;
  missingExperiencePanel.querySelectorAll("button[data-missing-experience-id], button[data-comment-id]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      openMissingExperienceCommentById(
        button.dataset.missingExperienceId
        || button.getAttribute("data-missing-experience-id")
        || button.dataset.commentId
        || button.getAttribute("data-comment-id")
      );
    });
  });
  missingExperiencePanel.querySelectorAll(".missing-experience-row[data-missing-experience-id]").forEach((row) => {
    row.addEventListener("click", (event) => {
      if (event.target.closest("button")) return;
      openMissingExperienceCommentById(row.dataset.missingExperienceId || row.getAttribute("data-missing-experience-id"));
    });
  });
}

function openMissingExperienceCommentById(id) {
  const change = getVisibleChanges().find((item) => item.id === id)
    || currentChanges.find((item) => item.id === id);
  if (!change) return false;
  if (!activeCommentPanel.hidden && activeCommentPanel.querySelector(`[data-change-id="${id}"]`)) return true;
  renderActiveCommentPanel(change);
  return true;
}

function renderMissingExperienceSidePanel(changes) {
  if (!missingExperiencePanel) return;
  const shouldShow = activePass === PASS_MISSING_EXPERIENCE
    && changes.length > 0
    && (!activeCommentPanel || activeCommentPanel.hidden);

  if (!shouldShow) {
    missingExperiencePanel.hidden = true;
    missingExperiencePanel.innerHTML = "";
    return;
  }

  missingExperiencePanel.hidden = false;
  missingExperiencePanel.innerHTML = `
    <div class="active-comment-heading">
      <h3>Missing Experience</h3>
    </div>
    <p class="side-panel-hint">Choose one item to review. It will open here next to the resume.</p>
    <div class="missing-experience-review-list">
      <strong>Missing experience to review</strong>
      <span class="missing-experience-rows">
        ${changes.map((change) => `
          <span class="missing-experience-row" data-missing-experience-id="${escapeHtml(change.id)}">
            ${renderResumeCommentMarker(change)}
            <button class="missing-experience-label-button" type="button" data-missing-experience-id="${escapeHtml(change.id)}">${escapeHtml(getMissingExperienceListLabel(change))}</button>
          </span>
        `).join("")}
      </span>
    </div>
  `;
  bindMissingExperiencePanel();
}

function getMissingExperienceListLabel(change) {
  const topic = missingExperienceDedupeTopic(change);
  const labels = {
    collaboration: "Collaboration",
    "research details": "Research details",
    patents: "Patents",
    publications: "Publications",
    phd: "PhD"
  };
  if (labels[topic]) return labels[topic];

  const direct = cleanConfirmedText(change?.missingTerm || "");
  if (direct && direct.length <= 34) return direct;
  const words = direct.split(/\s+/).filter(Boolean).slice(0, 4).join(" ");
  return words || "Missing experience";
}

function renderDonePreviewCallout(style) {
  if (countAllOpenChanges() > 0) return "";
  return `
    <span class="done-preview-callout">
      <strong>The updated resume preview is ready.</strong>
      It includes your accepted changes.
      <span class="done-preview-actions">
        <label class="preview-style-control">
          <span>Format</span>
          <select data-action="preview-export-style">
            <option value="ats" ${style === "ats" ? "selected" : ""}>ATS-friendly</option>
            <option value="designed" ${style === "designed" ? "selected" : ""}>Designed</option>
          </select>
        </label>
        <button class="preview-return-button done-preview-button" type="button" data-action="view-updated-preview">View Updated Preview</button>
        <button class="preview-return-button done-preview-button" type="button" data-action="export-pdf-inline">Export PDF</button>
        <button class="secondary-button done-preview-button" type="button" data-action="return-review">Return to Review</button>
      </span>
    </span>
  `;
}

function getDesignedPageBudgetNotice(text, style) {
  if (style !== "designed") return "";
  const plan = getDesignedPageBudgetPlan(text);
  if (!plan.overBudget || pageBudgetOverride) return "";

  return `
    <aside class="page-budget-notice" role="status">
      <strong>Page 1 is too full.</strong>
      <span>The layout is already using compact spacing, 11pt body text, the side column where it fits, and page two for publications, patents, and links.</span>
      <span>You can keep this longer resume, or ask AI for optional shortening suggestions. Nothing is removed automatically.</span>
      <span class="page-budget-actions">
        <button class="secondary-button" type="button" data-action="keep-longer-resume">Keep Longer Resume</button>
        <button class="primary-button" type="button" data-action="get-shortening-suggestions">Get Shortening Suggestions</button>
      </span>
    </aside>
  `;
}

function renderUnanchoredCommentList(changes) {
  if (!changes.length) return "";
  if (activePass === PASS_MISSING_EXPERIENCE) {
    return "";
  }
  return `
    <span class="unanchored-comment-list">
      <strong>Needs placement preview, no exact resume line yet:</strong>
      ${changes.map((change) => renderResumeCommentMarker(change)).join("")}
    </span>
  `;
}

function renderNumberedCommentPreview() {
  const text = normalizeFinalResumeText(finalResume.value.trim() || resumeInput.value.trim());
  if (!text) return;

  const style = exportStyleSelect.value;
  let resumeHtml = style === "designed" ? formatDesignedResumeForPrint(text) : formatResumeForPrint(text);
  let matchedCount = 0;
  const unmatchedChanges = [];
  const displayChanges = getOpenDisplayChanges();

  if (!displayChanges.length) {
    if (/missing essential fields/i.test(aiStatus.textContent || "")) {
      setAiStatus("All comments are done. The resume preview is ready.", "success");
    }
    renderMissingExperienceSidePanel([]);
    pdfPreview.classList.toggle("designed-template", style === "designed");
    pdfPreview.classList.toggle("ats-template", style !== "designed");
    pdfPreview.innerHTML = `
      <div class="preview-comment-banner">
        ${renderPreviewPassOverview()}
        <strong>All comments are done.</strong>
        No open comments remain in ${escapeHtml(getPassLabel(activePass))}.
        ${renderDonePreviewCallout(style)}
        ${renderOtherPassOpenNotice()}
        ${getDesignedPageBudgetNotice(text, style)}
      </div>
      ${resumeHtml}
    `;
    pdfPreviewPanel.hidden = false;
    bindPreviewPassButtons();
    return;
  }

  for (const change of displayChanges) {
    if (activePass === PASS_MISSING_EXPERIENCE && isMissingExperienceChange(change)) {
      unmatchedChanges.push(change);
      continue;
    }
    const marked = addCommentMarkerToHtml(resumeHtml, getCommentMarkerCandidates(change), change);
    resumeHtml = marked.html;
    if (marked.matched) {
      matchedCount += 1;
    } else {
      unmatchedChanges.push(change);
    }
  }

  pdfPreview.classList.toggle("designed-template", style === "designed");
  pdfPreview.classList.toggle("ats-template", style !== "designed");
  pdfPreview.innerHTML = `
    <div class="preview-comment-banner">
      ${renderPreviewPassOverview()}
      <strong>Numbered resume comments:</strong>
      ${escapeHtml(getPassLabel(activePass))}.
      Numbers are assigned in top-to-bottom resume order. Click Preview on a suggestion card to inspect the exact before/after change.
      ${renderCommentLegend()}
      ${renderOtherPassOpenNotice()}
      ${renderUnanchoredCommentList(unmatchedChanges)}
      ${unmatchedChanges.length ? `<span>Some comments are about missing or new information, so there is no existing resume line to mark yet. Use Preview to see where the change will go.</span>` : ""}
      ${getDesignedPageBudgetNotice(text, style)}
    </div>
    ${resumeHtml}
  `;
  pdfPreviewPanel.hidden = false;
  bindPreviewPassButtons();
  renderMissingExperienceSidePanel(unmatchedChanges);
  pdfPreview.querySelectorAll(".resume-comment-marker").forEach((marker) => {
    marker.addEventListener("click", () => {
      const change = getVisibleChanges().find((item) => item.id === marker.dataset.commentId);
      renderActiveCommentPanel(change);
    });
  });
}
