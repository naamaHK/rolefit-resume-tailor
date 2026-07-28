(function attachResumePreviewHighlighter(global) {
  "use strict";

  function create(dependencies) {
    const {
      escapeHtml,
      escapeRegExp,
      preferredSectionTitle,
      stripHtmlTags,
      unique
    } = dependencies || {};

    const required = {
      escapeHtml,
      escapeRegExp,
      preferredSectionTitle,
      stripHtmlTags,
      unique
    };

    for (const [name, dependency] of Object.entries(required)) {
      if (typeof dependency !== "function") {
        throw new TypeError(`Resume preview highlighter requires ${name}().`);
      }
    }

    function normalizeDiffToken(token) {
      return String(token || "")
        .toLowerCase()
        .replace(/^[^a-z0-9+#]+|[^a-z0-9+#]+$/g, "");
    }

    function getChangedAfterFragments(beforeText, afterText) {
      return getChangedFragments(beforeText, afterText, "after");
    }

    function getChangedBeforeFragments(beforeText, afterText) {
      return getChangedFragments(beforeText, afterText, "before");
    }

    function getChangedFragments(beforeText, afterText, side) {
      const beforeRaw = String(beforeText || "").trim();
      const afterRaw = String(afterText || "").trim();
      const beforeCore = beforeRaw.replace(/[.!?]+$/, "").trim();
      const afterCore = afterRaw.replace(/[.!?]+$/, "").trim();
      if (side === "after" && beforeRaw && afterRaw.startsWith(beforeRaw)) {
        const insertedSuffix = afterRaw.slice(beforeRaw.length).trim();
        if (insertedSuffix) return [insertedSuffix];
      }
      if (side === "after" && beforeCore && afterCore.startsWith(beforeCore)) {
        const insertedSuffix = afterCore.slice(beforeCore.length).trim();
        if (insertedSuffix) return [insertedSuffix];
      }

      const before = beforeRaw.split(/\s+/).filter(Boolean);
      const after = afterRaw.split(/\s+/).filter(Boolean);
      if (!before.length || !after.length) return [];

      const beforeNormalized = before.map(normalizeDiffToken);
      const afterNormalized = after.map(normalizeDiffToken);
      const rows = before.length + 1;
      const columns = after.length + 1;
      const lcs = Array.from({ length: rows }, () => new Uint16Array(columns));

      for (let beforeIndex = before.length - 1; beforeIndex >= 0; beforeIndex -= 1) {
        for (let afterIndex = after.length - 1; afterIndex >= 0; afterIndex -= 1) {
          lcs[beforeIndex][afterIndex] = beforeNormalized[beforeIndex]
            && beforeNormalized[beforeIndex] === afterNormalized[afterIndex]
            ? lcs[beforeIndex + 1][afterIndex + 1] + 1
            : Math.max(lcs[beforeIndex + 1][afterIndex], lcs[beforeIndex][afterIndex + 1]);
        }
      }

      const unchangedAfterIndexes = new Set();
      const unchangedBeforeIndexes = new Set();
      let beforeIndex = 0;
      let afterIndex = 0;
      while (beforeIndex < before.length && afterIndex < after.length) {
        if (beforeNormalized[beforeIndex] && beforeNormalized[beforeIndex] === afterNormalized[afterIndex]) {
          unchangedBeforeIndexes.add(beforeIndex);
          unchangedAfterIndexes.add(afterIndex);
          beforeIndex += 1;
          afterIndex += 1;
        } else if (lcs[beforeIndex + 1][afterIndex] >= lcs[beforeIndex][afterIndex + 1]) {
          beforeIndex += 1;
        } else {
          afterIndex += 1;
        }
      }

      const targetTokens = side === "before" ? before : after;
      const unchangedTargetIndexes = side === "before" ? unchangedBeforeIndexes : unchangedAfterIndexes;
      const targetRaw = side === "before" ? beforeRaw : afterRaw;
      const changedTokenCount = targetTokens.length - unchangedTargetIndexes.size;
      if (!changedTokenCount) return [];
      const isPureChange = side === "before"
        ? unchangedAfterIndexes.size === after.length
        : unchangedBeforeIndexes.size === before.length;
      const sentenceCount = (targetRaw.match(/[.!?](?:\s|$)/g) || []).length;
      if (
        beforeRaw.includes("\n")
        || afterRaw.includes("\n")
        || targetRaw.length > 240
        || (!isPureChange && sentenceCount > 1 && changedTokenCount / targetTokens.length >= 0.35)
        || (!isPureChange && changedTokenCount / targetTokens.length >= 0.65)
      ) {
        return [targetRaw];
      }

      const fragments = [];
      let fragment = [];
      for (let index = 0; index < targetTokens.length; index += 1) {
        if (!unchangedTargetIndexes.has(index)) {
          fragment.push(targetTokens[index]);
          continue;
        }
        if (fragment.length) fragments.push(fragment.join(" "));
        fragment = [];
      }
      if (fragment.length) fragments.push(fragment.join(" "));

      return fragments
        .map((item) => item.trim())
        .filter((item) => item.length >= 2 && normalizeDiffToken(item));
    }

    function isHtmlIndexInsideTag(html, index) {
      const lastOpen = html.lastIndexOf("<", index);
      const lastClose = html.lastIndexOf(">", index);
      return lastOpen > lastClose;
    }

    function findVisibleHtmlTextIndex(html, escapedText) {
      if (!escapedText) return -1;
      let fromIndex = 0;

      while (fromIndex < html.length) {
        const index = html.indexOf(escapedText, fromIndex);
        if (index === -1) return -1;
        if (!isHtmlIndexInsideTag(html, index)) return index;
        fromIndex = index + escapedText.length;
      }

      return -1;
    }

    function isHtmlTextBoundary(value, index) {
      if (index < 0 || index >= value.length) return true;
      return !/[A-Za-z0-9+#]/.test(value[index] || "");
    }

    function findVisibleHtmlWholeWordIndex(html, escapedText) {
      if (!escapedText) return -1;
      let fromIndex = 0;

      while (fromIndex < html.length) {
        const index = html.indexOf(escapedText, fromIndex);
        if (index === -1) return -1;
        const before = index - 1;
        const after = index + escapedText.length;
        if (
          !isHtmlIndexInsideTag(html, index)
          && isHtmlTextBoundary(html, before)
          && isHtmlTextBoundary(html, after)
        ) {
          return index;
        }
        fromIndex = index + escapedText.length;
      }

      return -1;
    }

    function highlightFirstMatchInHtml(html, candidates) {
      for (const candidate of candidates) {
        const escaped = escapeHtml(candidate);
        const index = findVisibleHtmlTextIndex(html, escaped);
        if (index === -1) continue;

        return {
          html: `${html.slice(0, index)}<mark class="resume-preview-highlight">${escaped}</mark>${html.slice(index + escaped.length)}`,
          matched: candidate
        };
      }

      return { html, matched: "" };
    }

    function highlightFirstWholeWordMatchInHtml(html, candidates) {
      for (const candidate of candidates) {
        const escaped = escapeHtml(candidate);
        const index = findVisibleHtmlWholeWordIndex(html, escaped);
        if (index === -1) continue;
        return {
          html: `${html.slice(0, index)}<mark class="resume-preview-highlight">${escaped}</mark>${html.slice(index + escaped.length)}`,
          matched: candidate
        };
      }

      return { html, matched: "" };
    }

    function normalizeAnchorText(text) {
      return stripHtmlTags(text)
        .toLowerCase()
        .replace(/[^a-z0-9+#/]+/g, " ")
        .replace(/\s+/g, " ")
        .trim();
    }

    function anchorTokens(text) {
      const stopWords = new Set(["the", "and", "with", "for", "that", "this", "from", "into", "using", "used", "was", "were", "are", "you", "your", "resume", "section"]);
      return normalizeAnchorText(text)
        .split(" ")
        .filter((token) => token.length >= 4 && !stopWords.has(token));
    }

    function getAnchorScore(blockText, candidates) {
      const blockNormalized = normalizeAnchorText(blockText);
      if (!blockNormalized) return 0;

      let best = 0;
      for (const candidate of candidates) {
        const candidateNormalized = normalizeAnchorText(candidate);
        if (!candidateNormalized) continue;
        if (blockNormalized.includes(candidateNormalized) || candidateNormalized.includes(blockNormalized)) return 1;

        const tokens = unique(anchorTokens(candidateNormalized));
        if (!tokens.length) continue;
        const hits = tokens.filter((token) => blockNormalized.includes(token)).length;
        best = Math.max(best, hits / tokens.length);
      }

      return best;
    }

    function addMarkerToBestBlockHtml(html, candidates, marker, options = {}) {
      const blockPattern = /<(p|li|h3|div)\b([^>]*)>([\s\S]*?)<\/\1>/gi;
      let bestMatch = null;

      for (const match of html.matchAll(blockPattern)) {
        const full = match[0];
        if (/resume-comment-marker|resume-comment-anchor/.test(full)) continue;
        const text = stripHtmlTags(full);
        if (text.length < 4) continue;
        const score = getAnchorScore(text, candidates);
        if (score < (options.threshold || 0.42)) continue;
        if (!bestMatch || score > bestMatch.score) {
          bestMatch = { full, tag: match[1], attrs: match[2], inner: match[3], text, score };
        }
      }

      if (!bestMatch) return { html, matched: "" };

      const markedBlock = `<${bestMatch.tag}${bestMatch.attrs}>${bestMatch.inner}${marker}</${bestMatch.tag}>`;
      return {
        html: html.replace(bestMatch.full, markedBlock),
        matched: bestMatch.text
      };
    }

    function getRenderedSectionMatch(html, sectionTitle) {
      const cleanTitle = preferredSectionTitle({ title: sectionTitle || "" });
      if (!cleanTitle) return null;

      const escapedTitle = escapeRegExp(escapeHtml(cleanTitle));
      const sectionPattern = new RegExp(`(<section\\b[^>]*>\\s*<h2>${escapedTitle}<\\/h2>[\\s\\S]*?<\\/section>)`, "i");
      return html.match(sectionPattern);
    }

    function highlightFirstMatchInSectionHtml(html, candidates, sectionTitle) {
      const match = getRenderedSectionMatch(html, sectionTitle);
      if (!match) return { html, matched: "" };

      const sectionHtml = match[1];
      const highlighted = highlightFirstMatchInHtml(sectionHtml, candidates);
      if (!highlighted.matched) return { html, matched: "" };

      return {
        html: html.replace(sectionHtml, highlighted.html),
        matched: highlighted.matched
      };
    }

    function highlightFirstWholeWordMatchInSectionHtml(html, candidates, sectionTitle) {
      const match = getRenderedSectionMatch(html, sectionTitle);
      if (!match) return { html, matched: "" };

      const sectionHtml = match[1];
      const highlighted = highlightFirstWholeWordMatchInHtml(sectionHtml, candidates);
      if (!highlighted.matched) return { html, matched: "" };

      return {
        html: html.replace(sectionHtml, highlighted.html),
        matched: highlighted.matched
      };
    }

    function addPreviewHighlightClassToBlock(block) {
      if (/\bclass=["']/.test(block)) {
        return block.replace(/\bclass=(["'])([^"']*)\1/, (_, quote, classes) => `class=${quote}${classes} resume-preview-highlight${quote}`);
      }
      return block.replace(/^<([a-z0-9]+)/i, '<$1 class="resume-preview-highlight"');
    }

    function highlightCandidatesInsideBlock(block, candidates) {
      let highlighted = block;
      const matched = [];
      for (const candidate of unique(candidates).filter((item) => String(item || "").trim().length >= 2)) {
        const escaped = escapeHtml(candidate);
        const index = findVisibleHtmlTextIndex(highlighted, escaped);
        if (index === -1) continue;
        highlighted = `${highlighted.slice(0, index)}<mark class="resume-preview-highlight">${escaped}</mark>${highlighted.slice(index + escaped.length)}`;
        matched.push(candidate);
      }
      return { html: highlighted, matched };
    }

    function highlightRewriteDiffInHtml(html, sectionTitle, pair, fragments, anchors = []) {
      if (!pair?.after || !fragments.length) return { html, matched: "" };

      const sectionMatch = getRenderedSectionMatch(html, sectionTitle);
      if (!sectionMatch) return { html, matched: "" };
      const sectionHtml = sectionMatch[1];
      const anchorIndexes = anchors
        .map((anchor) => findVisibleHtmlTextIndex(sectionHtml, escapeHtml(anchor)))
        .filter((index) => index >= 0);
      const targetAnchorIndex = anchorIndexes.length ? Math.max(...anchorIndexes) : -1;
      const blockPattern = /<(p|li|h3)\b[^>]*>[\s\S]*?<\/\1>/gi;
      let bestMatch = null;

      for (const match of sectionHtml.matchAll(blockPattern)) {
        const text = stripHtmlTags(match[0]).trim();
        if (!text) continue;
        const score = getAnchorScore(text, [pair.after, pair.before]);
        if (score < 0.45) continue;
        const isAfterTarget = targetAnchorIndex === -1 || match.index >= targetAnchorIndex;
        const distance = targetAnchorIndex === -1 ? match.index : Math.abs(match.index - targetAnchorIndex);
        if (
          !bestMatch
          || (isAfterTarget && !bestMatch.isAfterTarget)
          || (isAfterTarget === bestMatch.isAfterTarget && score > bestMatch.score)
          || (isAfterTarget === bestMatch.isAfterTarget && score === bestMatch.score && distance < bestMatch.distance)
        ) {
          bestMatch = { full: match[0], index: match.index, text, score, distance, isAfterTarget };
        }
      }

      if (!bestMatch) return { html, matched: "" };
      const exactHighlights = highlightCandidatesInsideBlock(bestMatch.full, fragments);
      const highlightedBlock = exactHighlights.matched.length
        ? exactHighlights.html
        : addPreviewHighlightClassToBlock(bestMatch.full);
      const highlightedSection = `${sectionHtml.slice(0, bestMatch.index)}${highlightedBlock}${sectionHtml.slice(bestMatch.index + bestMatch.full.length)}`;
      return {
        html: html.replace(sectionHtml, highlightedSection),
        matched: exactHighlights.matched.join(" ") || bestMatch.text
      };
    }

    function highlightBestBlockInHtml(html, candidates, options = {}) {
      const blockPattern = /<(p|li|h3|div)\b([^>]*)>([\s\S]*?)<\/\1>/gi;
      let bestMatch = null;
      const normalizedCandidates = unique(candidates)
        .map((candidate) => normalizeAnchorText(candidate))
        .filter(Boolean);

      for (const match of html.matchAll(blockPattern)) {
        const full = match[0];
        if (/resume-preview-highlight|resume-preview-section-highlight/.test(full)) continue;
        const text = stripHtmlTags(full);
        if (text.length < (options.allowShort ? 1 : 4)) continue;
        const normalizedText = normalizeAnchorText(text);
        const isExactMatch = normalizedCandidates.includes(normalizedText);
        if (options.requireExact && !isExactMatch) continue;
        const score = getAnchorScore(text, candidates);
        if (score < (options.threshold || 0.5)) continue;
        if (!bestMatch || (isExactMatch && !bestMatch.isExactMatch) || (isExactMatch === bestMatch.isExactMatch && score > bestMatch.score)) {
          bestMatch = { full, tag: match[1], attrs: match[2], inner: match[3], text, score, isExactMatch };
        }
      }

      if (!bestMatch) return { html, matched: "" };

      const highlightedBlock = `<${bestMatch.tag}${bestMatch.attrs} class="${[bestMatch.attrs.match(/\bclass=["']([^"']+)["']/)?.[1], "resume-preview-highlight"].filter(Boolean).join(" ")}">${bestMatch.inner}</${bestMatch.tag}>`;
      const cleanHighlightedBlock = bestMatch.attrs.includes("class=")
        ? bestMatch.full.replace(/\bclass=["'][^"']*["']/, (classAttr) => classAttr.replace(/["']$/, " resume-preview-highlight$&"))
        : highlightedBlock;

      return {
        html: html.replace(bestMatch.full, cleanHighlightedBlock),
        matched: bestMatch.text
      };
    }

    function highlightBestBlockInSectionHtml(html, candidates, sectionTitle, options = {}) {
      const match = getRenderedSectionMatch(html, sectionTitle);
      if (!match) return { html, matched: "" };
      const sectionHtml = match[1];
      const highlighted = highlightBestBlockInHtml(sectionHtml, candidates, { threshold: 0.5, ...options });
      if (!highlighted.matched) return { html, matched: "" };
      return {
        html: html.replace(sectionHtml, highlighted.html),
        matched: highlighted.matched
      };
    }

    function highlightGroupedBlocksInSectionHtml(html, sectionTitle, candidates) {
      const sectionMatch = getRenderedSectionMatch(html, sectionTitle);
      if (!sectionMatch) return { html, matched: "" };

      const sectionHtml = sectionMatch[1];
      const normalizedCandidates = unique(candidates)
        .map((candidate) => ({ raw: String(candidate || "").trim(), normalized: normalizeAnchorText(candidate) }))
        .filter((candidate) => candidate.normalized);
      if (!normalizedCandidates.length) return { html, matched: "" };

      const blockPattern = /<(h3|p|li)\b[^>]*>[\s\S]*?<\/\1>/gi;
      const blocks = Array.from(sectionHtml.matchAll(blockPattern)).map((match) => ({
        start: match.index,
        end: match.index + match[0].length,
        tag: match[1].toLowerCase(),
        normalized: normalizeAnchorText(stripHtmlTags(match[0]))
      }));
      if (!blocks.length) return { html, matched: "" };

      const findCandidateBlock = (candidate, fromIndex = 0) => blocks.findIndex((block, index) =>
        index >= fromIndex
        && (block.normalized === candidate.normalized
          || block.normalized.includes(candidate.normalized)
          || candidate.normalized.includes(block.normalized))
      );
      const firstIndex = findCandidateBlock(normalizedCandidates[0]);
      if (firstIndex === -1) return { html, matched: "" };

      const matchedIndexes = [firstIndex];
      let lastIndex = firstIndex;
      for (const candidate of normalizedCandidates.slice(1)) {
        const nextIndex = findCandidateBlock(candidate, lastIndex + 1);
        if (nextIndex === -1) return { html, matched: "" };
        matchedIndexes.push(nextIndex);
        lastIndex = nextIndex;
      }

      const start = blocks[firstIndex].start;
      let end = blocks[lastIndex].end;
      if (blocks[lastIndex].tag === "li") {
        const listOpen = sectionHtml.lastIndexOf("<ul", blocks[lastIndex].start);
        const listClose = sectionHtml.indexOf("</ul>", end);
        if (listOpen >= start && listClose >= end) end = listClose + "</ul>".length;
      }
      const grouped = sectionHtml.slice(start, end);
      const highlightedSection = `${sectionHtml.slice(0, start)}<div class="resume-preview-entry-highlight">${grouped}</div>${sectionHtml.slice(end)}`;
      return {
        html: html.replace(sectionHtml, highlightedSection),
        matched: matchedIndexes.map((_, index) => normalizedCandidates[index].raw).join(" ")
      };
    }

    function getExperienceBlocks(html) {
      const blockPattern = /<(h3|p|li)\b[^>]*>[\s\S]*?<\/\1>/gi;
      return Array.from(html.matchAll(blockPattern)).map((match) => ({
        full: match[0],
        start: match.index,
        end: match.index + match[0].length,
        tag: match[1].toLowerCase(),
        normalized: normalizeAnchorText(stripHtmlTags(match[0]))
      }));
    }

    function addClassToOpeningTag(block, className) {
      if (new RegExp(`\\b${escapeRegExp(className)}\\b`).test(block)) return block;
      if (/\bclass=["']/.test(block)) {
        return block.replace(
          /\bclass=(["'])([^"']*)\1/,
          (_, quote, classes) => `class=${quote}${classes} ${className}${quote}`
        );
      }
      return block.replace(/^<([a-z0-9]+)/i, `<$1 class="${className}"`);
    }

    function findExactBlockIndex(blocks, candidates, fromIndex = 0) {
      const normalizedCandidates = unique(candidates)
        .map(normalizeAnchorText)
        .filter(Boolean);
      if (!normalizedCandidates.length) return -1;
      return blocks.findIndex((block, index) => (
        index >= fromIndex && normalizedCandidates.includes(block.normalized)
      ));
    }

    function getExperienceEntryRanges(sectionHtml, entries) {
      const blocks = getExperienceBlocks(sectionHtml);
      const starts = [];
      let cursor = 0;

      for (const entry of entries) {
        const combinedTitle = [entry.title, entry.years].filter(Boolean).join(" ");
        const combinedTitleCompany = [entry.title, entry.company].filter(Boolean).join(", ");
        const blockIndex = findExactBlockIndex(
          blocks,
          [combinedTitle, combinedTitleCompany, entry.title],
          cursor
        );
        if (blockIndex === -1) {
          starts.push(null);
          continue;
        }
        starts.push(blockIndex);
        cursor = blockIndex + 1;
      }

      const sectionEnd = sectionHtml.lastIndexOf("</section>");
      return starts.map((blockIndex, entryIndex) => {
        if (blockIndex == null) return null;
        const nextBlockIndex = starts.slice(entryIndex + 1).find((value) => value != null);
        return {
          blockStartIndex: blockIndex,
          blockEndIndex: nextBlockIndex == null ? blocks.length : nextBlockIndex,
          start: blocks[blockIndex].start,
          end: nextBlockIndex == null
            ? (sectionEnd === -1 ? sectionHtml.length : sectionEnd)
            : blocks[nextBlockIndex].start,
          blocks
        };
      });
    }

    function getDesignedExperienceArticles(sectionHtml) {
      const articlePattern = /<article\b([^>]*)>([\s\S]*?)<\/article>/gi;
      return Array.from(sectionHtml.matchAll(articlePattern)).map((match) => ({
        full: match[0],
        attributes: match[1],
        inner: match[2],
        start: match.index,
        end: match.index + match[0].length
      }));
    }

    function highlightBlockWithinHtml(html, blockText, fragments = [], wholeBlock = false) {
      const blocks = getExperienceBlocks(html);
      const blockIndex = findExactBlockIndex(blocks, [blockText]);
      if (blockIndex === -1) return { html, matched: "" };

      const block = blocks[blockIndex];
      const fragmentHighlight = fragments.length
        ? highlightCandidatesInsideBlock(block.full, fragments)
        : { html: block.full, matched: [] };
      const highlightedBlock = fragmentHighlight.matched.length
        ? fragmentHighlight.html
        : wholeBlock
          ? addClassToOpeningTag(block.full, "resume-preview-highlight")
          : block.full;
      if (highlightedBlock === block.full) return { html, matched: "" };

      return {
        html: `${html.slice(0, block.start)}${highlightedBlock}${html.slice(block.end)}`,
        matched: fragmentHighlight.matched.join(" ") || stripHtmlTags(block.full).trim()
      };
    }

    function highlightExperienceChangeInHtml(html, sectionTitle, entries, targetIndex, options = {}) {
      const sectionMatch = getRenderedSectionMatch(html, sectionTitle);
      if (!sectionMatch || !entries?.length || targetIndex < 0 || targetIndex >= entries.length) {
        return { html, matched: "" };
      }

      const sectionHtml = sectionMatch[1];
      const designedArticles = getDesignedExperienceArticles(sectionHtml);
      if (designedArticles.length === entries.length) {
        const article = designedArticles[targetIndex];
        let highlightedArticle = article.full;
        let matched = "";

        if (options.mode === "entry") {
          highlightedArticle = `<div class="resume-preview-entry-highlight">${article.full}</div>`;
          matched = [entries[targetIndex].title, entries[targetIndex].company, options.blockText].filter(Boolean).join(" ");
        } else {
          const blockHighlight = highlightBlockWithinHtml(
            article.full,
            options.blockText,
            options.fragments,
            options.mode === "block"
          );
          highlightedArticle = blockHighlight.html;
          matched = blockHighlight.matched;
        }

        if (!matched) return { html, matched: "" };
        const highlightedSection = `${sectionHtml.slice(0, article.start)}${highlightedArticle}${sectionHtml.slice(article.end)}`;
        return {
          html: html.replace(sectionHtml, highlightedSection),
          matched
        };
      }

      const ranges = getExperienceEntryRanges(sectionHtml, entries);
      const range = ranges[targetIndex];
      if (!range) return { html, matched: "" };
      const entryHtml = sectionHtml.slice(range.start, range.end);
      let highlightedEntry = entryHtml;
      let matched = "";

      if (options.mode === "entry") {
        highlightedEntry = `<div class="resume-preview-entry-highlight">${entryHtml}</div>`;
        matched = [entries[targetIndex].title, entries[targetIndex].company, options.blockText].filter(Boolean).join(" ");
      } else {
        const blockHighlight = highlightBlockWithinHtml(
          entryHtml,
          options.blockText,
          options.fragments,
          options.mode === "block"
        );
        highlightedEntry = blockHighlight.html;
        matched = blockHighlight.matched;
      }

      if (!matched) return { html, matched: "" };
      const highlightedSection = `${sectionHtml.slice(0, range.start)}${highlightedEntry}${sectionHtml.slice(range.end)}`;
      return {
        html: html.replace(sectionHtml, highlightedSection),
        matched
      };
    }

    function isHtmlIndexInsidePreviewHighlight(html, index) {
      const openIndex = html.lastIndexOf('<mark class="resume-preview-highlight">', index);
      if (openIndex === -1) return false;
      const closeIndex = html.lastIndexOf("</mark>", index);
      return openIndex > closeIndex;
    }

    function highlightFirstUnmarkedMatchInHtml(html, candidate) {
      const escaped = escapeHtml(candidate);
      if (!escaped) return { html, matched: "" };

      let fromIndex = 0;
      while (fromIndex < html.length) {
        const index = html.indexOf(escaped, fromIndex);
        if (index === -1) return { html, matched: "" };
        if (!isHtmlIndexInsideTag(html, index) && !isHtmlIndexInsidePreviewHighlight(html, index)) {
          return {
            html: `${html.slice(0, index)}<mark class="resume-preview-highlight">${escaped}</mark>${html.slice(index + escaped.length)}`,
            matched: candidate
          };
        }
        fromIndex = index + escaped.length;
      }

      return { html, matched: "" };
    }

    function highlightAllMatchesInSectionHtml(html, candidates, sectionTitle) {
      const match = getRenderedSectionMatch(html, sectionTitle);
      if (!match) return { html, matched: "" };
      let sectionHtml = match[1];
      const matched = [];

      for (const candidate of unique(candidates).filter((item) => String(item || "").trim().length >= 2)) {
        const highlighted = highlightFirstUnmarkedMatchInHtml(sectionHtml, candidate);
        if (!highlighted.matched) continue;
        sectionHtml = highlighted.html;
        matched.push(highlighted.matched);
      }

      if (!matched.length) return { html, matched: "" };
      return {
        html: html.replace(match[1], sectionHtml),
        matched: matched.join(" ")
      };
    }

    function highlightSectionInHtml(html, sectionTitle) {
      const cleanTitle = preferredSectionTitle({ title: sectionTitle || "" });
      const match = getRenderedSectionMatch(html, sectionTitle);
      if (!match) return { html, matched: "" };

      return {
        html: html.replace(match[1], `<div class="resume-preview-section-highlight">${match[1]}</div>`),
        matched: cleanTitle
      };
    }

    return Object.freeze({
      addMarkerToBestBlockHtml,
      addPreviewHighlightClassToBlock,
      findVisibleHtmlTextIndex,
      findVisibleHtmlWholeWordIndex,
      getAnchorScore,
      getChangedAfterFragments,
      getChangedBeforeFragments,
      getRenderedSectionMatch,
      highlightAllMatchesInSectionHtml,
      highlightBestBlockInHtml,
      highlightBestBlockInSectionHtml,
      highlightGroupedBlocksInSectionHtml,
      highlightExperienceChangeInHtml,
      highlightCandidatesInsideBlock,
      highlightFirstMatchInHtml,
      highlightFirstMatchInSectionHtml,
      highlightFirstUnmarkedMatchInHtml,
      highlightFirstWholeWordMatchInHtml,
      highlightFirstWholeWordMatchInSectionHtml,
      highlightRewriteDiffInHtml,
      highlightSectionInHtml,
      isHtmlIndexInsideTag
    });
  }

  global.RoleFitResumePreviewHighlighter = Object.freeze({ create });
})(typeof window !== "undefined" ? window : globalThis);
