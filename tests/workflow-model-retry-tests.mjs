import assert from "node:assert/strict";
import { askModel } from "../server/workflow/decision.mjs";
import { createWorkflow } from "../server/workflow/state.mjs";
import { createWorkflowModel } from "../server/model-client.mjs";

const malformed = createWorkflowModel(async () => ({ content: '{"actions":[{"type":"ask"', metadata: { finish_reason: "length" } }));
await assert.rejects(() => malformed("instructions", {}), error => {
  assert.equal(error.code, "MODEL_JSON_INVALID");
  assert.match(error.message, /length/);
  return true;
});

const state = createWorkflow({ resume: "Test resume", jobDescription: "Basic Qualifications: SQL" });
let calls = 0;
const result = await askModel(state, async instructions => {
  calls += 1;
  if (calls === 1) {
    const error = new Error("truncated JSON");
    error.code = "MODEL_JSON_INVALID";
    throw error;
  }
  assert.match(instructions, /fresh, complete, concise JSON object/);
  return { data: { requirements: [] }, metadata: { response_model: "test" } };
}, "extract", { jobDescription: state.jobDescription });
assert.deepEqual(result, { requirements: [] });
assert.equal(state.modelCalls, 2, "a retry must consume the visible call budget");
assert.equal(state.modelRuns.length, 2);
assert.match(state.modelRuns[0].error, /truncated JSON/);

const failed = createWorkflow({ resume: "Test resume", jobDescription: "Basic Qualifications: SQL" });
await assert.rejects(() => askModel(failed, async () => {
  const error = new Error("truncated JSON");
  error.code = "MODEL_JSON_INVALID";
  throw error;
}, "extract", {}), /truncated JSON/);
assert.equal(failed.modelCalls, 2);

const transport = createWorkflow({ resume: "Test resume", jobDescription: "Basic Qualifications: SQL" });
await assert.rejects(() => askModel(transport, async () => { throw new Error("provider unavailable"); }, "extract", {}), /provider unavailable/);
assert.equal(transport.modelCalls, 1, "provider failures should not be retried as malformed JSON");

console.log("Workflow model retry tests passed");
