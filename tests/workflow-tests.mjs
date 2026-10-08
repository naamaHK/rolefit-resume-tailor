import assert from "node:assert/strict";
import { createWorkflow, submitAnswers } from "../server/workflow/state.mjs";
import { calculateExperience } from "../server/workflow/experience-duration.mjs";
import { advanceWorkflow } from "../server/workflow/controller.mjs";
import { executeAction } from "../server/workflow/tools.mjs";
import { createWorkflowRoutes } from "../server/workflow-routes.mjs";

const original = "Maya\nBuilt applications with PostgreSQL.\nEngineer at A: 2020-01 to 2023-12\nEngineer at B: 2022-01 to 2025-12";
const fresh = () => createWorkflow({ resume: original, jobDescription: "Basic: SQL, Docker, Kubernetes, 7 years of relevant experience. Preferred: research.", now: new Date("2026-10-07") });
const requirement = (id, text = id) => ({ id, text, jobQuote: text, category: "basic", status: "unexamined", evidence: [] });
const quote = text => [{ sourceId: "resume", quote: text }];
const yes = async () => ({ data: { supported: true, issues: [] } });
const ask = (id, question = `Do you have ${id} experience?`, fact = id) => ({ type: "ask", requirementId: id, question, requestedFacts: [fact], reason: "Relevant gap" });
const answer = (state, text = "I used Docker at A.") => submitAnswers(state, state.questions.filter(q => q.disposition === "pending").map(q => ({ questionId: q.id, disposition: "answered", text })), state.revision);
function scripted(steps) {
  return async (_prompt, input) => {
    assert.ok(steps.length, "unexpected extra model call");
    const next = steps.shift();
    if (next instanceof Error) throw next;
    return { data: typeof next === "function" ? next(input) : next, metadata: { response_model: "test-model", usage: { total_tokens: 20 } } };
  };
}

assert.deepEqual(calculateExperience([{ start: "2020-01", end: "2023-12" }, { start: "2022-01", end: "2025-12" }], "2026-10-07"), {
  totalMonths: 72, fullYears: 6, overlappingMonths: 24, precision: "inclusive calendar months", asOf: "2026-10-07"
});
assert.equal(calculateExperience([{ start: "2020-01", end: "2020-01" }], "2026-10-07").totalMonths, 1);
assert.equal(calculateExperience([{ start: "2026-01", end: "present" }], "2026-10-07").totalMonths, 10);
assert.throws(() => calculateExperience([{ start: "2020", end: "2023" }], "2026-10-07"), /exact/i);
assert.throws(() => calculateExperience([{ start: "2025-01", end: "2024-01" }], "2026-10-07"), /reversed/);
assert.throws(() => calculateExperience([{ start: "2025-01", end: "2028-01" }], "2026-10-07"), /future/);
assert.throws(() => createWorkflow({ resume: "x", jobDescription: "y", questionLimit: 11 }), /between/);

// Budget, atomic submissions, replay protection, and one follow-up per topic.
{
  const state = fresh(); state.requirements = Array.from({ length: 12 }, (_, i) => requirement(`r${i + 1}`));
  for (let i = 1; i <= 5; i++) await executeAction(state, ask(`r${i}`), yes);
  await assert.rejects(executeAction(state, ask("r6"), yes), /batch/);
  state.status = "waiting";
  assert.throws(() => submitAnswers(state, [{ questionId: "q1", disposition: "answered", text: "yes" }], state.revision), /each question/);
  assert.equal(state.questions[0].disposition, "pending");
  answer(state);
  assert.throws(() => submitAnswers(state, [], 0), /no longer current/);
  await executeAction(state, ask("r1", "What did you personally deploy?", "personal responsibility"), yes);
  for (let i = 6; i <= 9; i++) await executeAction(state, ask(`r${i}`), yes);
  state.status = "waiting"; answer(state);
  await assert.rejects(executeAction(state, ask("r10"), yes), /budget/);
  assert.equal(state.questions.length, 10);
}
{
  const state = fresh(); state.requirements = [requirement("r1")];
  await executeAction(state, ask("r1"), yes); state.status = "waiting"; answer(state, "Some exposure.");
  await assert.rejects(executeAction(state, ask("r1"), yes), /already been asked/);
  await executeAction(state, ask("r1", "What was your personal contribution?", "contribution"), yes);
  state.status = "waiting"; answer(state, "Built the app.");
  await assert.rejects(executeAction(state, ask("r1", "Which deployment did you own?", "deployment"), yes), /one follow-up/);
}
for (const disposition of ["denied", "skipped", "answered"]) {
  const state = fresh(); state.requirements = [requirement("r1")];
  await executeAction(state, ask("r1"), yes); state.status = "waiting";
  submitAnswers(state, [{ questionId: "q1", disposition, text: "No" }], state.revision);
  await assert.rejects(executeAction(state, ask("r1", "Can you clarify this skill?", "clarification"), yes), /already resolved/);
}

// Differently worded support is verified, and not converted into a question.
{
  const state = fresh();
  const model = scripted([
    { requirements: [{ text: "SQL", jobQuote: "SQL", category: "basic" }] },
    { actions: [{ type: "record_evidence", requirementId: "r1", evidence: quote("Built applications with PostgreSQL."), reason: "PostgreSQL is SQL experience" }] },
    { supported: true, issues: [] }
  ]);
  await advanceWorkflow(state, model);
  assert.equal(state.status, "complete"); assert.equal(state.requirements[0].status, "covered"); assert.equal(state.questions.length, 0);
}

// User-confirmed gaps cannot be marked covered without a reviewable proposal.
{
  const state = fresh(); state.requirements = [requirement("r1", "Tableau dashboards")];
  await executeAction(state, ask("r1", "Have you built Tableau dashboards?", "Tableau dashboard work"), yes);
  state.status = "waiting";
  answer(state, "I built Tableau dashboards at Loop Commerce.");
  await assert.rejects(
    executeAction(state, { type: "record_evidence", requirementId: "r1", evidence: [{ sourceId: "q1", quote: "I built Tableau dashboards at Loop Commerce." }] }, yes),
    /propose a reviewable resume edit/i
  );
  assert.notEqual(state.requirements[0].status, "covered", "an answer is not yet represented in the resume");
  await executeAction(state, { type: "record_evidence", requirementId: "r1", evidence: quote("Built applications with PostgreSQL.") }, async (_instructions, input) => {
    assert.deepEqual(input.sources.map(source => source.id), ["resume"]);
    assert.deepEqual(input.answers, []);
    return { data: { supported: false, issues: ["Resume quote does not show Tableau."] } };
  });
  assert.equal(state.requirements[0].status, "uncertain");
}
{
  const state = createWorkflow({ resume: original, jobDescription: "Basic Qualifications: Tableau dashboards", now: new Date("2026-10-07") });
  const model = scripted([
    { requirements: [{ text: "Tableau dashboards", jobQuote: "Tableau dashboards", category: "basic" }] },
    { actions: [ask("r1", "Have you built Tableau dashboards?", "Tableau dashboard work")] },
    { actions: [{ type: "record_evidence", requirementId: "r1", evidence: [{ sourceId: "q1", quote: "I built Tableau dashboards at Loop Commerce." }] }] },
    { actions: [{ type: "propose_edit", requirementId: "r1", originalText: "", suggestedText: "Built Tableau dashboards at Loop Commerce.", section: "Experience", evidence: [{ sourceId: "q1", quote: "I built Tableau dashboards at Loop Commerce." }] }] },
    { supported: true, issues: [] }
  ]);
  await advanceWorkflow(state, model);
  assert.equal(state.status, "waiting");
  answer(state, "I built Tableau dashboards at Loop Commerce.");
  await advanceWorkflow(state, model);
  assert.equal(state.proposals.length, 1, "a confirmed but missing skill must become a reviewable proposal");
  assert.equal(state.requirements[0].status, "proposed");
  assert.equal(state.resume, original, "the user must still approve the resume edit");
}

// User evidence goes to the decision model; exaggerated edits get a bounded revision.
{
  const state = fresh();
  const proposal = { type: "propose_edit", requirementId: "r1", originalText: "", suggestedText: "Led production Docker deployments.", section: "Skills", evidence: [{ sourceId: "q1", quote: "I used Docker locally." }] };
  const model = scripted([
    { requirements: [{ text: "Docker", jobQuote: "Docker", category: "basic" }] },
    { actions: [ask("r1", "Have you used Docker?", "Docker experience")] },
    input => { assert.equal(input.questions[0].answer, "I used Docker locally."); return { actions: [proposal] }; },
    { supported: false, issues: ["No production or leadership evidence."] },
    { actions: [{ ...proposal, suggestedText: "Docker (local development)" }] },
    { supported: true, issues: [] }
  ]);
  await advanceWorkflow(state, model); assert.equal(state.status, "waiting");
  answer(state, "I used Docker locally."); await advanceWorkflow(state, model); await advanceWorkflow(state, model);
  assert.equal(state.proposals.length, 1); assert.equal(state.proposals[0].suggestedText, "Docker (local development)");
  assert.equal(state.resume, original); assert.equal(state.requirements[0].rejectedEdits, 1);
}
{
  const state = fresh(); state.requirements = [requirement("r1")];
  const action = { type: "propose_edit", requirementId: "r1", originalText: "", suggestedText: "Kubernetes expert", section: "Skills", evidence: quote("Built applications with PostgreSQL.") };
  const no = async () => ({ data: { supported: false, issues: ["Invented skill"] } });
  await executeAction(state, action, no); await executeAction(state, { ...action, suggestedText: "Kubernetes" }, no);
  await assert.rejects(executeAction(state, { ...action, suggestedText: "Kubernetes beginner" }, yes), /already resolved/);
  assert.equal(state.proposals.length, 0);
  const other = fresh(); other.requirements = [requirement("r1")];
  await assert.rejects(executeAction(other, { ...action, evidence: quote("Fabricated quote") }, yes), /quote/);
  await assert.rejects(executeAction(other, action, async () => ({ data: { supported: "true", issues: [] } })), /invalid result/);
  await executeAction(other, action, async () => ({ data: { supported: true, issues: ["Unsupported"] } }));
  assert.equal(other.proposals.length, 0);
}

// Tool result becomes an observation for the NEXT decision, including overlap.
{
  const state = fresh();
  const model = scripted([
    { requirements: [{ text: "7 years", jobQuote: "7 years of relevant experience", category: "basic" }] },
    { actions: [{ type: "calculate_experience", requirementId: "r1", intervals: [
      { start: "2020-01", end: "2023-12", evidence: quote("Engineer at A: 2020-01 to 2023-12") },
      { start: "2022-01", end: "2025-12", evidence: quote("Engineer at B: 2022-01 to 2025-12") }
    ] }] },
    { supported: true, issues: [] },
    input => { assert.equal(input.requirements[0].calculation.fullYears, 6); return { actions: [ask("r1", "Do you have additional relevant employment?", "additional employment")] }; }
  ]);
  await advanceWorkflow(state, model);
  assert.equal(state.status, "waiting"); assert.notEqual(state.requirements[0].status, "covered");
  // A falsely positive judge cannot override arithmetic below the explicit minimum.
  answer(state, "No other jobs.");
  await executeAction(state, { type: "record_evidence", requirementId: "r1", evidence: quote("Engineer at A: 2020-01 to 2023-12") }, yes);
  assert.equal(state.requirements[0].status, "uncertain");
  // New user-supplied dates allow recalculation instead of freezing the first result.
  state.questions[0].answer = "Earlier role: 2018-01 to 2019-12.";
  await executeAction(state, { type: "calculate_experience", requirementId: "r1", intervals: [
    { start: "2018-01", end: "2019-12", evidence: [{ sourceId: "q1", quote: "Earlier role: 2018-01 to 2019-12." }] },
    { start: "2020-01", end: "2023-12", evidence: quote("Engineer at A: 2020-01 to 2023-12") },
    { start: "2022-01", end: "2025-12", evidence: quote("Engineer at B: 2022-01 to 2025-12") }
  ] }, yes);
  assert.equal(state.requirements[0].calculation.fullYears, 8);
}
{
  const state = fresh(); await advanceWorkflow(state, scripted([{ requirements: [{ text: "x", jobQuote: "invented", category: "basic" }] }]));
  assert.match(state.error, /verbatim/);
  const failure = fresh(); await advanceWorkflow(failure, scripted([new Error("Provider unavailable")]));
  assert.equal(failure.status, "complete"); assert.equal(failure.proposals.length, 0);
  const limited = fresh(); limited.initialized = true; limited.requirements = [requirement("r1")]; limited.limits.modelCalls = 0;
  await advanceWorkflow(limited, yes); assert.equal(limited.requirements[0].status, "not_clarified");
}

// HTTP boundary: stale answers do not spend questions and expired sessions fail clearly.
{
  let result, time = 0;
  const handler = createWorkflowRoutes({
    model: scripted([
      { requirements: [{ text: "Docker", jobQuote: "Docker", category: "preferred" }] },
      { actions: [ask("r1")] }
    ]), readJsonRequest: async req => req.body,
    sendJson: (_res, status, body) => { result = { status, body: structuredClone(body) }; }, now: () => time
  });
  await handler({ method: "POST", url: "/api/workflow/start", body: { resume: original, jobDescription: "Docker" } }, {});
  assert.equal(result.status, 200); const id = result.body.id;
  await handler({ method: "POST", url: "/api/workflow/advance", body: { id, revision: -1, answers: [] } }, {});
  assert.equal(result.status, 409);
  time = 3_600_001;
  await handler({ method: "GET", url: `/api/workflow/state/${id}` }, {});
  assert.equal(result.status, 404);
}
console.log("Guided workflow tests passed: budgets, follow-ups, denial/skip, evidence, overlap, revision, errors, sessions.");
