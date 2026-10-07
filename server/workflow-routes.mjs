import { closeWorkflow, createWorkflow, submitAnswers } from "./workflow/state.mjs";
import { advanceWorkflow } from "./workflow/controller.mjs";

// Local MVP sessions are memory-only, expire after an hour, and disappear on
// restart. The unpredictable session ID is required to read or advance one.
export function createWorkflowRoutes({ model, readJsonRequest, sendJson, now = () => Date.now() }) {
  const sessions = new Map();
  return async function handleWorkflow(request, response) {
    const pathname = request.url?.split("?")[0];
    if (pathname !== "/api/workflow/start" && pathname !== "/api/workflow/advance" && !pathname?.startsWith("/api/workflow/state/")) return false;
    for (const [id, session] of sessions) if (!session.busy && now() - session.updated > 3_600_000) sessions.delete(id);
    let session;
    try {
      if (request.method === "GET" && pathname.startsWith("/api/workflow/state/")) {
        session = sessions.get(pathname.slice("/api/workflow/state/".length));
        sendJson(response, session ? 200 : 404, session ? session.state : { error: "Workflow expired or server restarted. Start a new session." });
        return true;
      }
      if (request.method !== "POST") { sendJson(response, 405, { error: "Method not allowed." }); return true; }
      const input = await readJsonRequest(request);
      if (pathname === "/api/workflow/start") {
        if (sessions.size >= 50) { sendJson(response, 429, { error: "Too many active workflows. Try again later." }); return true; }
        const state = createWorkflow(input);
        session = { state, updated: now(), busy: false };
        sessions.set(state.id, session);
      } else {
        session = sessions.get(input.id);
        if (!session) { sendJson(response, 404, { error: "Workflow expired or server restarted. Start a new session." }); return true; }
        if (session.busy || input.revision !== session.state.revision) { sendJson(response, 409, { error: "Workflow is busy or this submission is stale. Reload its state." }); return true; }
        if (input.stop === true) {
          for (const question of session.state.questions.filter(q => q.disposition === "pending")) question.disposition = "skipped";
          closeWorkflow(session.state, "Finished early at your request.");
          session.state.revision += 1;
          sendJson(response, 200, session.state);
          return true;
        }
        if (session.state.status === "waiting") submitAnswers(session.state, input.answers, input.revision);
      }
      session.busy = true;
      try {
        await advanceWorkflow(session.state, model);
        session.updated = now();
        sendJson(response, 200, session.state);
      } finally { session.busy = false; }
    } catch (error) { sendJson(response, 400, { error: error.message }); }
    return true;
  };
}
