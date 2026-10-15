// Model-generated requirements, questions, and edits are still untrusted.
// Reject high-risk instructions at the action boundary without rewriting the
// user's original resume or job description.
const instructionPatterns = [
  /\b(?:ignore|disregard|override|forget)\b.{0,80}\b(?:previous|above|system|developer|instructions?|rules?|prompt)\b/i,
  /(?:^|\n)\s*(?:system|developer)\s*(?:message|instructions?|prompt)?\s*:/i,
  /\b(?:reveal|print|show|provide|send|upload|paste|enter|disclose|expose|share|give me|tell me|what is|what's)\b.{0,80}\b(?:api[\s_-]?key|password|access[\s_-]?token|secret|credentials?|private[\s_-]?key|system prompt|developer instructions?|date of birth|home address|phone number|credit card|bank account|social security number|passport number)\b/i
];

const actionFields = {
  finish: ["type"],
  ask: ["type", "requirementId", "question", "requestedFacts", "reason"],
  calculate_experience: ["type", "requirementId", "intervals"],
  record_evidence: ["type", "requirementId", "evidence", "reason"],
  propose_edit: ["type", "requirementId", "originalText", "suggestedText", "section", "evidence", "reason"],
  leave_unresolved: ["type", "requirementId", "reason"]
};

export function validateActionShape(action) {
  const allowed = actionFields[action?.type];
  if (!allowed) throw new Error("Unsupported action type.");
  if (Object.keys(action).some(key => !allowed.includes(key))) {
    throw new Error("The model returned an unexpected action field.");
  }
}

export function assertSafeWorkflowText(value, label) {
  if (typeof value !== "string" || instructionPatterns.some(pattern => pattern.test(value))
    || /(?:https?:\/\/|www\.)\S+|[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/i.test(value)) {
    throw new Error(`${label} contains a disallowed instruction, credential request, or external link.`);
  }
}

export function validateExtractedRequirement(requirement) {
  if (requirement.text.length > 300 || requirement.jobQuote.length > 1000) {
    throw new Error("A qualification or job quote is too long.");
  }
  assertSafeWorkflowText(requirement.text, "Qualification");
  assertSafeWorkflowText(requirement.jobQuote, "Job quote");
}

export function validateQuestionText(action) {
  assertSafeWorkflowText(action.question, "Question");
  assertSafeWorkflowText(action.requestedFacts[0], "Requested fact");
}

export function validateEditText(action) {
  assertSafeWorkflowText(action.suggestedText, "Suggested edit");
}

export function validateAgentReason(reason) {
  if (reason == null) return;
  if (typeof reason !== "string" || reason.length > 500) throw new Error("Invalid action reason.");
  assertSafeWorkflowText(reason, "Action reason");
}
