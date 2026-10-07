import { calculateExperience } from "./experience-duration.mjs";
import { CLOSED_REQUIREMENTS, record, requireEvidence } from "./state.mjs";
import { validateEdit, verify } from "./verifier.mjs";

const key = value => value.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();

export async function executeAction(state, action, model) {
  if (!action || typeof action.type !== "string") throw new Error("An action type is required.");
  if (action.type === "finish") return "finish";
  const requirement = state.requirements.find(r => r.id === action.requirementId);
  if (!requirement) throw new Error("Unknown requirement ID.");
  if (CLOSED_REQUIREMENTS.has(requirement.status)) throw new Error("This qualification is already resolved; do not ask or edit it again.");
  if (state.questions.some(q => q.requirementId === requirement.id && q.disposition === "pending")) throw new Error("Wait for this qualification's answer.");

  switch (action.type) {
    case "ask": {
      const previous = state.questions.filter(q => q.requirementId === requirement.id);
      if (state.questions.length >= state.limits.questions) throw new Error("Question budget exhausted. Leave remaining gaps Not clarified.");
      if (state.questions.filter(q => q.disposition === "pending").length >= state.limits.batch) throw new Error("Question batch is full; wait for answers.");
      if (previous.length >= 2) throw new Error("Only one follow-up per qualification is allowed.");
      if (typeof action.question !== "string" || action.question.length < 8 || action.question.length > 600 || (action.question.match(/\?/g) || []).length > 1 || !Array.isArray(action.requestedFacts) || action.requestedFacts.length !== 1 || typeof action.requestedFacts[0] !== "string" || !action.requestedFacts[0].trim()) {
        throw new Error("Ask one focused question requesting exactly one fact.");
      }
      if (state.questions.some(q => key(q.question) === key(action.question)) || previous.some(q => key(q.requestedFact) === key(action.requestedFacts[0]))) {
        throw new Error("This question or fact has already been asked.");
      }
      const question = {
        id: `q${state.questions.length + 1}`, requirementId: requirement.id,
        question: action.question, requestedFact: action.requestedFacts[0], reason: String(action.reason || ""),
        disposition: "pending", followUp: previous.length === 1
      };
      state.questions.push(question);
      requirement.status = "waiting";
      record(state, "question", { questionId: question.id, requirementId: requirement.id });
      return;
    }
    case "calculate_experience": {
      if (!Array.isArray(action.intervals) || !action.intervals.length) throw new Error("Experience intervals are required.");
      const answerCount = state.questions.filter(q => q.disposition === "answered").length;
      if (requirement.calculation && requirement.calculationAnswerCount === answerCount) throw new Error("This duration has already been calculated without new evidence.");
      const evidence = action.intervals.flatMap(interval => requireEvidence(state, interval.evidence));
      // Validate arithmetic inputs before spending a verifier call.
      const calculation = calculateExperience(action.intervals, state.asOf);
      const result = await verify(state, model, requirement, "duration", { intervals: action.intervals }, evidence);
      if (!result.supported) {
        record(state, "duration_rejected", { requirementId: requirement.id, issues: result.issues });
        return;
      }
      requirement.calculation = calculation;
      requirement.calculationAnswerCount = answerCount;
      requirement.evidence = evidence;
      record(state, "experience_calculated", { requirementId: requirement.id, ...calculation });
      return;
    }
    case "record_evidence": {
      const minimumYears = requirement.jobQuote.match(/\b(\d+)\+?\s*(?:years?|yrs?)\b/i)?.[1];
      if (minimumYears && requirement.calculation && requirement.calculation.totalMonths < Number(minimumYears) * 12) {
        requirement.status = "uncertain";
        record(state, "coverage_checked", { requirementId: requirement.id, supported: false, issues: ["Calculated relevant experience is below the job's stated minimum."] });
        return;
      }
      const result = await verify(state, model, requirement, "coverage", { reason: action.reason }, action.evidence);
      requirement.evidence = result.evidence;
      requirement.status = result.supported ? "covered" : "uncertain";
      record(state, "coverage_checked", { requirementId: requirement.id, ...result });
      return;
    }
    case "propose_edit": {
      validateEdit(state, action);
      const result = await verify(state, model, requirement, "edit", {
        originalText: action.originalText, suggestedText: action.suggestedText, section: action.section
      }, action.evidence);
      record(state, "edit_checked", { requirementId: requirement.id, suggestedText: action.suggestedText, ...result });
      if (!result.supported) {
        requirement.rejectedEdits = (requirement.rejectedEdits || 0) + 1;
        requirement.status = requirement.rejectedEdits >= 2 ? "not_clarified" : "revision_needed";
        requirement.reason = result.issues.join("; ") || "The proposed claim could not be verified.";
        return;
      }
      state.proposals.push({
        id: `${state.id}-p${state.proposals.length + 1}`, requirementId: requirement.id,
        originalText: action.originalText, suggestedText: action.suggestedText,
        section: action.section, reason: String(action.reason || ""), evidence: result.evidence,
        verification: "supported_by_supplied_evidence"
      });
      requirement.status = "proposed";
      requirement.evidence = result.evidence;
      return;
    }
    case "leave_unresolved":
      requirement.status = "not_clarified";
      requirement.reason = String(action.reason || "Insufficient evidence.");
      record(state, "not_clarified", { requirementId: requirement.id, reason: requirement.reason });
      return;
    default: throw new Error("Unsupported action type.");
  }
}
