(function attachPdfTextLayout(global) {
  "use strict";

  function create(options = {}) {
    const lineTolerance = options.lineTolerance || 3;

    function normalizeItem(item) {
      const transform = item.transform || [];
      const text = String(item.str ?? item.text ?? "").trim();
      const x = Number(item.x ?? transform[4] ?? 0);
      const y = Number(item.y ?? transform[5] ?? 0);
      const width = Number(item.width || 0);
      return { text, x, y, width, right: x + width };
    }

    function isDecorativeText(text) {
      return !/[A-Za-z0-9()]/.test(text);
    }

    function joinTextParts(parts) {
      return parts
        .join(" ")
        .replace(/\s+/g, " ")
        .replace(/\(\s+/g, "(")
        .replace(/\s+([),.;:!?%])/g, "$1")
        .trim();
    }

    function isDateOnlyText(text) {
      return /^(?:(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+)?(?:19|20)\d{2}(?:\s*(?:-|–|—|to)\s*(?:Present|present|(?:19|20)\d{2}))?$/.test(String(text || "").trim());
    }

    function groupItemsIntoRows(rawItems) {
      const items = rawItems
        .map(normalizeItem)
        .filter((item) => item.text && !isDecorativeText(item.text))
        .sort((a, b) => {
          if (Math.abs(b.y - a.y) > lineTolerance) return b.y - a.y;
          return a.x - b.x;
        });
      const rows = [];

      for (const item of items) {
        let row = rows.find((candidate) => Math.abs(candidate.y - item.y) <= lineTolerance);
        if (!row) {
          row = { y: item.y, items: [] };
          rows.push(row);
        }
        row.items.push(item);
        row.y = (row.y * (row.items.length - 1) + item.y) / row.items.length;
      }

      return rows.sort((a, b) => b.y - a.y);
    }

    function segmentRow(row, pageWidth) {
      const gapThreshold = Math.max(24, pageWidth * 0.045);
      const ordered = [...row.items].sort((a, b) => a.x - b.x);
      const segments = [];

      for (const item of ordered) {
        const previous = segments[segments.length - 1];
        const previousRight = previous?.right ?? 0;
        if (!previous || item.x - previousRight > gapThreshold) {
          segments.push({ y: row.y, x: item.x, right: item.right, items: [item] });
          continue;
        }
        previous.items.push(item);
        previous.right = Math.max(previous.right, item.right);
      }

      return segments.map((segment) => {
        const text = joinTextParts(segment.items.map((item) => item.text));
        return { ...segment, text, dateOnly: isDateOnlyText(text) };
      });
    }

    function hasSecondContentColumn(rows, pageWidth) {
      const threshold = pageWidth * 0.62;
      let rightContentCount = 0;
      let standaloneRightCount = 0;

      for (const row of rows) {
        const hasLeft = row.segments.some((segment) => segment.x < threshold);
        const rightContent = row.segments.filter((segment) => segment.x >= threshold && !segment.dateOnly);
        rightContentCount += rightContent.length;
        if (!hasLeft) standaloneRightCount += rightContent.length;
      }

      return rightContentCount >= 6 && (standaloneRightCount >= 3 || rightContentCount >= 8);
    }

    function joinSegments(segments) {
      return joinTextParts(
        [...segments]
          .sort((a, b) => a.x - b.x)
          .map((segment) => segment.text)
      );
    }

    function extractPageColumns(rawItems, pageWidth) {
      const rows = groupItemsIntoRows(rawItems).map((row) => ({
        ...row,
        segments: segmentRow(row, pageWidth)
      }));
      const threshold = pageWidth * 0.62;

      if (!hasSecondContentColumn(rows, pageWidth)) {
        return [rows.map((row) => joinSegments(row.segments)).filter(Boolean)];
      }

      const leftLines = [];
      const rightLines = [];
      for (const row of rows) {
        const leftSegments = row.segments.filter((segment) => segment.x < threshold);
        const rightSegments = row.segments.filter((segment) => segment.x >= threshold);

        if (leftSegments.length) {
          const leftDates = rightSegments.filter((segment) => segment.dateOnly);
          const rightContent = rightSegments.filter((segment) => !segment.dateOnly);
          const leftText = joinSegments([...leftSegments, ...leftDates]);
          const rightText = joinSegments(rightContent);
          if (leftText) leftLines.push(leftText);
          if (rightText) rightLines.push(rightText);
          continue;
        }

        const rightText = joinSegments(rightSegments);
        if (rightText) rightLines.push(rightText);
      }

      return [leftLines, rightLines].filter((column) => column.length);
    }

    function extractPageText(rawItems, pageWidth) {
      return extractPageColumns(rawItems, pageWidth)
        .map((lines) => lines.join("\n"))
        .filter(Boolean)
        .join("\n\n");
    }

    return Object.freeze({
      extractPageColumns,
      extractPageText,
      groupItemsIntoRows,
      isDateOnlyText
    });
  }

  global.RoleFitPdfTextLayout = Object.freeze({ create });
})(typeof window !== "undefined" ? window : globalThis);
