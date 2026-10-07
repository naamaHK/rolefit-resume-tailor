import { randomUUID } from "node:crypto";

export const DEFAULT_LIMITS = Object.freeze({ questions: 10, batch: 5, actions: 80, modelCalls: 40 });
export const CLOSED_REQUIREMENTS = new Set(["covered", "proposed", "denied", "skipped", "not_clarified"]);

export function createWorkflow({ resume, jobDescription, questionLimit = 10, now = new Date() }) {
  if (typeof resume !== "string" || !resume.trim() || typeof jobDescription !== "string" || !jobDescription.trim()) {
    throw new Error("A resume and target job description are required.");
  }
  if (!Number.isInteger(questionLimit) || questionLimit < 1 || questionLimit > 10) {
    throw new Error("The question limit must be between 1 and 10.");
  }
  return {
    id: randomUUID(), revision: 0, status: "running", resume, jobDescription,
    asOf: now.toISOString().slice(0, 10), requirements: [], questions: [], proposals: [],
    limits: { ...DEFAULT_LIMITS, questions: questionLimit }, actions: 0, modelCalls: 0,
    events: [], modelRuns: [], initialized: false
  };
}

export function record(state, type, detail) {
  state.events.push({ sequence: state.events.length + 1, type, ...detail });
}

export function sources(state) {
  return [
    { id: "resume", text: state.resume },
    ...state.questions.filter(q => q.disposition === "answered").map(q => ({ id: q.id, text: q.answer }))
  ];
}

export function requireEvidence(state, evidence) {
  if (!Array.isArray(evidence) || !evidence.length) throw new Error("Exact source quotes are required.");
  const available = sources(state);
  return evidence.map(item => {
    const source = available.find(source => source.id === item.sourceId);
    if (!source || typeof item.quote !== "string" || !item.quote.trim() || !source.text.includes(item.quote)) {
      throw new Error("Evidence must quote the original resume or a submitted answer exactly.");
    }
    return { sourceId: item.sourceId, quote: item.quote };
  });
}

export function closeWorkflow(state, reason) {
  state.status = "complete";
  state.stopReason = reason;
  for (const requirement of state.requirements) {
    if (!CLOSED_REQUIREMENTS.has(requirement.status)) {
      requirement.status = "not_clarified";
      requirement.reason = reason;
    }
  }
  record(state, "stopped", { reason });
}

// Validate the entire submission before applying any answer. Revisions prevent
// retries/double clicks from spending the budget or recording answers twice.
export function submitAnswers(state, answers, revision) {
  if (state.status !== "waiting" || revision !== state.revision) throw new Error("This question batch is no longer current. Reload the workflow state.");
  const pending = state.questions.filter(q => q.disposition === "pending");
  if (!Array.isArray(answers) || answers.length !== pending.length || new Set(answers.map(a => a.questionId)).size !== pending.length) {
    throw new Error("Answer, decline, or skip each question in this batch.");
  }
  for (const answer of answers) {
    if (!pending.some(q => q.id === answer.questionId) || !["answered", "denied", "skipped"].includes(answer.disposition)) {
      throw new Error("Invalid question or answer disposition.");
    }
    if (answer.disposition === "answered" && (typeof answer.text !== "string" || !answer.text.trim() || answer.text.length > 8000)) {
      throw new Error("Write an answer of up to 8,000 characters, or choose No / Skip.");
    }
  }
  for (const answer of answers) {
    const question = pending.find(q => q.id === answer.questionId);
    question.disposition = answer.disposition;
    question.answer = answer.disposition === "answered" ? answer.text.trim() : "";
    // Common plain denials are terminal even when entered in the answer box.
    if (/^(?:no|nope|none|not yet|i (?:do not|don't) have (?:that|this)(?: experience)?)[.!]?$/i.test(question.answer)) question.disposition = "denied";
    const requirement = state.requirements.find(r => r.id === question.requirementId);
    requirement.status = question.disposition === "answered" ? "answered" : question.disposition;
    record(state, "answer", { questionId: question.id, disposition: question.disposition });
  }
  state.revision += 1;
  state.status = "running";
}
