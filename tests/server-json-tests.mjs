import assert from "node:assert/strict";

process.env.ROLEFIT_NO_SERVER = "1";
process.env.OPENROUTER_API_KEY = "test-key";
process.env.OPENROUTER_MODEL = "nvidia/test-bad-json:free,google/test-good-json";
process.env.OPENROUTER_MODEL_TIMEOUT_MS = "5000";

const server = await import(`../server.mjs?test=${Date.now()}`);

const roleFitPrompt = await server.buildPrompt("STATEMENT\nData Analyst", "Senior Data Scientist");
assert.match(
  roleFitPrompt,
  /broad role-fit observation has a safe wording fix, return it as an exact before\/after rewrite card/i,
  "the AI prompt should route broad role-fit observations to rewrite cards, not Missing Experience questions"
);
const pageBudgetPrompt = await server.buildPrompt("STATEMENT\nData Analyst", "", { pageBudgetMode: true });
assert.match(
  pageBudgetPrompt,
  /PAGE_BUDGET_MODE:[\s\S]*Return only 2-5 concrete, evidence-grounded change cards that reduce length/i,
  "the page-budget request should ask only for optional shortening suggestions"
);
assert.match(
  pageBudgetPrompt,
  /Never remove years, employers, institutions, publication years, patent years, author lists, or contact information/i,
  "page-budget suggestions must preserve mandatory resume structure"
);

const fencedJson = server.extractJson(`Here is the JSON:
\`\`\`json
{
  "change_cards": [],
  "user_questions": []
}
\`\`\``);
assert.deepEqual(fencedJson, { change_cards: [], user_questions: [] }, "extractJson should read fenced JSON");

const repairedProperties = server.extractJson(`{
  change_cards: [],
  user_questions: [],
}`);
assert.deepEqual(
  repairedProperties,
  { change_cards: [], user_questions: [] },
  "extractJson should repair unquoted keys and dangling commas"
);

const repairedMissingArrayComma = server.extractJson(`{
  "change_cards": [
    { "type": "rewrite", "section": "Statement" }
    { "type": "rewrite", "section": "Experience" }
  ],
  "user_questions": []
}`);
assert.equal(repairedMissingArrayComma.change_cards.length, 2, "extractJson should repair missing commas between array objects");

const repairedMissingPropertyComma = server.extractJson(`{
  "change_cards": []
  "user_questions": []
}`);
assert.deepEqual(
  repairedMissingPropertyComma,
  { change_cards: [], user_questions: [] },
  "extractJson should repair missing commas between top-level properties"
);

const calls = [];
const originalFetch = globalThis.fetch;
globalThis.fetch = async (_url, options) => {
  const body = JSON.parse(options.body);
  calls.push({
    model: body.model,
    isRepair: String(body.messages?.[0]?.content || "").startsWith("Repair the following malformed JSON")
  });

  if (calls.at(-1).isRepair) {
    return {
      ok: true,
      status: 200,
      async text() {
        return JSON.stringify({ choices: [{ message: {} }] });
      }
    };
  }

  if (body.model.includes("nvidia")) {
    return {
      ok: true,
      status: 200,
      async text() {
        return JSON.stringify({
          choices: [
            {
              message: {
                content: `{
                  "change_cards": [
                    { "type": "rewrite", "section": "Statement" }
                    BROKEN
                  ],
                  "user_questions": []
                }`
              }
            }
          ]
        });
      }
    };
  }

  return {
    ok: true,
    status: 200,
    async text() {
      return JSON.stringify({
        choices: [
          {
            message: {
              content: JSON.stringify({
                summary: "ok",
                change_cards: [],
                user_questions: []
              })
            }
          }
        ]
      });
    }
  };
};

try {
  const result = await server.callOpenRouter("ALEX\n050-555-0198\nEXPERIENCE\nEngineer 2022\nCompany", "");
  assert.equal(result.model, "google/test-good-json", "callOpenRouter should fall back after invalid JSON and failed repair");
  assert.equal(result.summary, "ok");
  assert.equal(calls.some((call) => call.model.includes("nvidia") && !call.isRepair), true, "first model should be tried");
  assert.equal(calls.some((call) => call.isRepair), true, "malformed JSON should trigger a repair attempt");
  assert.equal(calls.some((call) => call.model === "google/test-good-json" && !call.isRepair), true, "second model should be tried after repair failure");
} finally {
  globalThis.fetch = originalFetch;
}

console.log("Server JSON tests passed");
