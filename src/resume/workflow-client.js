(() => {
  const start = document.querySelector("#startWorkflowBtn"), panel = document.querySelector("#workflowPanel");
  let state = null, busy = false, snapshot = null;
  const lockControls = [start, analyzeAiBtn, analyzeBtn, loadSampleBtn, newResumeBtn, clearJobBtn, resumeFileInput];

  async function request(path, body) {
    const response = await fetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Guided tailoring failed.");
    return result;
  }

  function sameInputs() {
    return snapshot && snapshot.resume === getWorkingResumeText() && snapshot.job === jobInput.value.trim();
  }

  function render() {
    const active = busy || (state && !state.interrupted && state.status !== "complete");
    lockControls.forEach(control => { control.disabled = Boolean(active); });
    // Lock the input snapshot while the model is reasoning about it. Existing
    // review controls remain usable; sameInputs detects their changes.
    [resumeInput, jobInput, finalResume].forEach(input => { input.readOnly = Boolean(active); });
    if (!state) return;
    window.RoleFitWorkflowView.render(panel, state, {
      busy, onSubmit: answers => run("/api/workflow/advance", { id: state.id, revision: state.revision, answers }),
      onStop: () => run("/api/workflow/advance", { id: state.id, revision: state.revision, stop: true }),
      onResume: async () => {
        try {
          const response = await fetch(`/api/workflow/state/${state.id}`);
          if (!response.ok) throw new Error("This session expired. Start a new guided session.");
          state = await response.json(); render();
          if (state.status === "running") await run("/api/workflow/advance", { id: state.id, revision: state.revision });
        } catch (error) { setAiStatus(error.message, "error"); }
      },
      onReview: id => {
        if (jobInput.value.trim() !== snapshot.job) { setAiStatus("The target job changed. Start a new guided session.", "error"); return; }
        const proposal = state.proposals.find(p => p.id === id);
        if (proposal.originalText && !getWorkingResumeText().includes(proposal.originalText)) { setAiStatus("The original passage has changed. Start a new guided session to update this proposal.", "error"); return; }
        window.RoleFitWorkflowReview.addProposal(proposal, state.requirements.find(r => r.id === proposal.requirementId));
      },
      onDownload: () => {
        const url = URL.createObjectURL(new Blob([JSON.stringify(state, null, 2)], { type: "application/json" }));
        const link = document.createElement("a"); link.href = url; link.download = `rolefit-guided-${state.id}.json`; link.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      }
    });
  }

  async function run(path, body) {
    if (busy) return;
    if (!sameInputs()) { setAiStatus("Resume or job changed. Start a new guided session.", "error"); state = null; render(); return; }
    busy = true;
    // Preserve typed answers on transport errors rather than clearing the form.
    const previousMarkup = panel.innerHTML;
    render();
    setAiStatus("Guided tailoring is checking evidence and choosing the next useful step…", "neutral");
    try {
      state = await request(path, body);
      render();
      while (state.status === "running") {
        if (!sameInputs()) throw new Error("Resume changed during analysis. Start a new guided session.");
        state = await request("/api/workflow/advance", { id: state.id, revision: state.revision });
        render();
      }
      setAiStatus(state.status === "waiting" ? "Your answers will guide the next suggestions." : state.error ? state.stopReason : "Guided review finished. Review any proposals before applying them.", state.error ? "error" : "success");
    } catch (error) {
      setAiStatus(error.message, "error");
      if (state) {
        try {
          const response = await fetch(`/api/workflow/state/${state.id}`);
          if (response.ok) state = await response.json();
          else state = null;
        } catch { state = null; }
      }
      if (state?.status === "running") {
        // Let the user recover explicitly instead of retrying an expensive call.
        state = { ...state, interrupted: true };
      }
    } finally {
      busy = false; render();
      if (!state) { panel.hidden = true; panel.innerHTML = previousMarkup; }
      if (body.answers && state?.status === "waiting") {
        for (const answer of body.answers) {
          const field = panel.querySelector(`[data-workflow-question="${answer.questionId}"]`);
          if (!field) continue;
          field.querySelector("select").value = answer.disposition;
          field.querySelector("textarea").value = answer.text;
          field.querySelector("select").dispatchEvent(new Event("change"));
        }
      }
    }
  }

  start.addEventListener("click", () => {
    if (!getWorkingResumeText() || !jobInput.value.trim()) { setAiStatus("Add a resume and a target job for guided tailoring.", "error"); return; }
    snapshot = { resume: getWorkingResumeText(), job: jobInput.value.trim() };
    state = null;
    run("/api/workflow/start", { resume: snapshot.resume, jobDescription: snapshot.job });
  });
})();
