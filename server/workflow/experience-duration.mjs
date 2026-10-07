// Dates are month-granular, with inclusive end months. Year-only dates are
// ambiguous: ask for months instead of silently assuming January/December.
function monthIndex(value, asOf) {
  const date = value === "present" ? asOf.slice(0, 7) : value;
  if (typeof date !== "string" || !/^\d{4}-(0[1-9]|1[0-2])$/.test(date)) throw new Error("Exact YYYY-MM dates are required; clarify year-only dates.");
  const [year, month] = date.split("-").map(Number);
  if (year < 1900) throw new Error("Invalid experience date.");
  return year * 12 + month - 1;
}

export function calculateExperience(intervals, asOf) {
  if (!Array.isArray(intervals) || !intervals.length || intervals.length > 30) throw new Error("Provide 1–30 relevant experience intervals.");
  const current = monthIndex(asOf.slice(0, 7), asOf);
  const ranges = intervals.map(({ start, end }) => {
    const from = monthIndex(start, asOf), to = monthIndex(end, asOf);
    if (to < from || to > current) throw new Error("Experience dates are reversed or in the future.");
    return [from, to + 1];
  }).sort((a, b) => a[0] - b[0]);
  const merged = [];
  for (const [start, end] of ranges) {
    const last = merged.at(-1);
    if (last && start <= last[1]) last[1] = Math.max(end, last[1]);
    else merged.push([start, end]);
  }
  const totalMonths = merged.reduce((sum, [start, end]) => sum + end - start, 0);
  const rawMonths = ranges.reduce((sum, [start, end]) => sum + end - start, 0);
  return { totalMonths, fullYears: Math.floor(totalMonths / 12), overlappingMonths: rawMonths - totalMonths, precision: "inclusive calendar months", asOf };
}
