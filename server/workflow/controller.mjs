import { askModel, decisionInput } from "./decision.mjs";
import { CLOSED_REQUIREMENTS, closeWorkflow, record } from "./state.mjs";
import { executeAction } from "./tools.mjs";

async function initialize(state, model) {
  const extracted = await askModel(state, model, "extract", { jobDescription: state.jobDescription });
  if (!Array.isArray(extracted.requirements) || extracted.requirements.length > 60) throw new Error("Invalid qualification extraction (maximum 60).");
  const seen = new Set();
  const requirements = extracted.requirements.map((r, index) => {
    if (typeof r.text !== "string" || !r.text.trim() || !["basic", "preferred"].includes(r.category) || typeof r.jobQuote !== "string" || !r.jobQuote.trim() || !state.jobDescription.includes(r.jobQuote)) {
      throw new Error("Every qualification must have a verbatim job quote and a category.");
    }
    const key = r.text.trim().toLowerCase();
    if (seen.has(key)) throw new Error("Duplicate qualification in extraction.");
    seen.add(key);
    return { id: `r${index + 1}`, text: r.text.trim(), jobQuote: r.jobQuote, category: r.category, status: "unexamined", evidence: [] };
  });
  state.requirements = requirements;
  state.initialized = true;
  record(state, "requirements_extracted", { count: requirements.length });
}

// A request does at most two decision rounds. The browser advances again when
// status=running, avoiding a single long HTTP request for the entire session.
export async function advanceWorkflow(state, model) {
  if (state.status !== "running") return state;
  try {
    if (!state.initialized) await initialize(state, model);
    for (let round = 0; round < 2; round += 1) {
      if (state.actions >= state.limits.actions || state.modelCalls >= state.limits.modelCalls) {
        closeWorkflow(state, "Action or model-call limit reached."); break;
      }
      if (state.requirements.every(r => CLOSED_REQUIREMENTS.has(r.status))) {
        closeWorkflow(state, "All qualifications have been reviewed."); break;
      }
      const decision = await askModel(state, model, "decision", decisionInput(state));
      if (!Array.isArray(decision.actions) || decision.actions.length < 1 || decision.actions.length > 8) throw new Error("The model must select 1–8 actions.");
      let finish = false, usefulActions = 0;
      for (const action of decision.actions) {
        if (state.actions >= state.limits.actions) break;
        state.actions += 1;
        const signature = JSON.stringify(action);
        const answerCount = state.questions.filter(q => q.disposition !== "pending").length;
        try {
          if (state.events.some(event => event.type === "action_attempt" && event.signature === signature && event.answerCount === answerCount)) throw new Error("Repeated action without new information. Choose another action or finish.");
          record(state, "action_attempt", { signature, answerCount });
          finish = (await executeAction(state, action, model)) === "finish" || finish;
          usefulActions += 1;
        } catch (error) {
          record(state, "action_rejected", { action: action?.type, requirementId: action?.requirementId, reason: error.message });
        }
      }
      state.emptyRounds = usefulActions ? 0 : (state.emptyRounds || 0) + 1;
      if (state.questions.some(q => q.disposition === "pending")) { state.status = "waiting"; break; }
      if (finish || state.emptyRounds >= 2) { closeWorkflow(state, finish ? "No further useful actions selected." : "Stopped after repeated actions made no progress."); break; }
    }
  } catch (error) {
    closeWorkflow(state, `Workflow stopped: ${error.message}`);
    state.error = error.message;
  }
  state.revision += 1;
  return state;
}
