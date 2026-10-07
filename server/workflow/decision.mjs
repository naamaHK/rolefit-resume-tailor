import { readFile } from "node:fs/promises";
const prompts = new Map();

export async function askModel(state, model, task, input) {
  if (state.modelCalls >= state.limits.modelCalls) throw new Error("Model-call budget reached.");
  state.modelCalls += 1;
  if (!prompts.has(task)) prompts.set(task, await readFile(new URL(`../../prompts/workflow/${task}.md`, import.meta.url), "utf8"));
  const started = Date.now();
  try {
    const result = await model(prompts.get(task), input);
    state.modelRuns.push({ task, latency_ms: Date.now() - started, ...result.metadata });
    if (!result.data || typeof result.data !== "object") throw new Error("Expected a JSON object.");
    return result.data;
  } catch (error) {
    state.modelRuns.push({ task, latency_ms: Date.now() - started, error: error.message });
    throw error;
  }
}

export function decisionInput(state) {
  return {
    originalResume: state.resume, jobDescription: state.jobDescription, asOf: state.asOf,
    requirements: state.requirements, questions: state.questions, proposals: state.proposals,
    questionsRemaining: state.limits.questions - state.questions.length,
    batchSlotsRemaining: state.limits.batch - state.questions.filter(q => q.disposition === "pending").length,
    recentEvents: state.events.slice(-12)
  };
}
