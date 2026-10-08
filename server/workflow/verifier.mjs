import { askModel } from "./decision.mjs";
import { requireEvidence, sources } from "./state.mjs";

export async function verify(state, model, requirement, kind, payload, evidence) {
  const checked = requireEvidence(state, evidence);
  const verificationSources = kind === "coverage" ? [{ id: "resume", text: state.resume }] : sources(state);
  const result = await askModel(state, model, "verification", {
    kind, requirement: { text: requirement.text, jobQuote: requirement.jobQuote },
    payload, evidence: checked, sources: verificationSources,
    answers: kind === "coverage" ? [] : state.questions.filter(q => q.requirementId === requirement.id),
    calculation: requirement.calculation || null
  });
  if (typeof result.supported !== "boolean" || !Array.isArray(result.issues) || result.issues.some(issue => typeof issue !== "string")) {
    throw new Error("The verifier returned an invalid result. Nothing was approved.");
  }
  return { supported: result.supported === true && result.issues.length === 0, issues: result.issues, evidence: checked };
}

export function validateEdit(state, action) {
  if (typeof action.originalText !== "string" || typeof action.suggestedText !== "string" || !action.suggestedText.trim() || action.suggestedText.length > 2500) {
    throw new Error("An edit needs originalText and concise suggestedText.");
  }
  if (!["Skills", "Experience", "Education", "Selected Projects", "Statement"].includes(action.section)) throw new Error("Choose an existing supported section type.");
  if (action.originalText && state.resume.split(action.originalText).length !== 2) {
    throw new Error("A replacement must match exactly one passage in the original resume.");
  }
  if (action.originalText.trim() === action.suggestedText.trim()) throw new Error("This edit makes no change.");
  const numbers = text => text.match(/\b\d+(?:[.,]\d+)?%?/g) || [];
  const allowed = new Set(numbers(sources(state).map(source => source.text).join("\n")));
  for (const requirement of state.requirements) {
    if (requirement.calculation) allowed.add(String(requirement.calculation.fullYears));
  }
  if (numbers(action.suggestedText).some(number => !allowed.has(number))) throw new Error("This edit introduces a number not present in evidence or a verified calculation.");
  if (numbers(action.originalText).some(number => !numbers(action.suggestedText).includes(number))) throw new Error("Preserve existing dates and numeric facts when rewriting.");
  if (/\b(?:TBD|USER-CONFIRMED ADDITIONS)\b|\[.*(?:confirm|insert|your).*\]/i.test(action.suggestedText)) throw new Error("Resume proposals cannot contain placeholders or process notes.");
  if (state.proposals.some(p => action.originalText && p.originalText && (p.originalText.includes(action.originalText) || action.originalText.includes(p.originalText)))) {
    throw new Error("This proposal overlaps an existing edit; leave it for user review.");
  }
}
