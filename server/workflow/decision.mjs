import { readFile } from "node:fs/promises";
const prompts = new Map();

export async function askModel(state, model, task, input) {
  if (!prompts.has(task)) prompts.set(task, await readFile(new URL(`../../prompts/workflow/${task}.md`, import.meta.url), "utf8"));
  for (let attempt = 0; attempt < 2; attempt += 1) {
    if (state.modelCalls >= state.limits.modelCalls) throw new Error("Model-call budget reached.");
    state.modelCalls += 1;
    const started = Date.now();
    try {
      const instruction = attempt ? `${prompts.get(task)}\n\nYour previous response was invalid JSON. Generate a fresh, complete, concise JSON object. Do not continue the truncated response.` : prompts.get(task);
      const result = await model(instruction, input);
      state.modelRuns.push({ task, latency_ms: Date.now() - started, ...result.metadata });
      if (!result.data || typeof result.data !== "object") throw new Error("Expected a JSON object.");
      return result.data;
    } catch (error) {
      state.modelRuns.push({ task, latency_ms: Date.now() - started, error: error.message });
      if (error.code !== "MODEL_JSON_INVALID" || attempt === 1) throw error;
    }
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
