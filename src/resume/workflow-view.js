window.RoleFitWorkflowView = {
  render(panel, state, { busy, onSubmit, onReview, onDownload, onStop, onResume }) {
    const esc = escapeHtml;
    const pending = state.questions.filter(q => q.disposition === "pending");
    const labels = { unexamined: "Not yet reviewed", covered: "Supported by evidence", proposed: "Edit proposed — approval needed", denied: "User does not have this", skipped: "Skipped", not_clarified: "Not clarified", uncertain: "Needs clarification", answered: "Answer received", waiting: "Awaiting answer", revision_needed: "Revising wording" };
    panel.hidden = false;
    panel.innerHTML = `
      <h2>Guided tailoring</h2>
      <p role="status">${state.questions.length} / ${state.limits.questions} questions used, including follow-ups.
        ${busy ? "Reviewing evidence…" : state.status === "waiting" ? "Answer the questions below, or choose No / Skip." : esc(state.stopReason || "Reviewing evidence…")}</p>
      ${state.error ? `<p class="workflow-error">${esc(state.error)}</p>` : ""}
      ${state.interrupted ? `<p class="workflow-error">The connection was interrupted. Your saved session can be recovered without resetting its question count.</p><button type="button" class="secondary-button" data-workflow-resume>Recover session</button>` : ""}
      <form class="workflow-questions">
        ${pending.map(q => {
          const requirement = state.requirements.find(r => r.id === q.requirementId);
          return `<fieldset data-workflow-question="${esc(q.id)}">
            <legend>${esc(q.id.toUpperCase())}${q.followUp ? " · Follow-up" : ""}: ${esc(q.question)}</legend>
            <p>${esc(requirement.category === "basic" ? "Basic" : "Preferred")} qualification: ${esc(requirement.text)}</p>
            <p>${esc(q.reason)}</p>
            <label for="${q.id}-disposition">Your response</label>
            <select id="${q.id}-disposition" name="disposition" ${busy ? "disabled" : ""}>
              <option value="answered">Write an answer</option><option value="denied">I don't have this</option><option value="skipped">Skip</option>
            </select>
            <label for="${q.id}-answer">Details from your experience</label>
            <textarea id="${q.id}-answer" name="answer" maxlength="8000" rows="3" ${busy ? "disabled" : ""}></textarea>
          </fieldset>`;
        }).join("")}
        ${pending.length ? `<button type="submit" class="primary-button" ${busy ? "disabled" : ""}>Send answers</button>` : ""}
      </form>
      <div class="workflow-proposals">
        ${state.proposals.map(p => `<article><h3>${esc(state.requirements.find(r => r.id === p.requirementId).text)}</h3>
          <p>${esc(p.suggestedText)}</p><p class="workflow-note">Checked against supplied evidence. Your approval is still required.</p>
          <button type="button" class="secondary-button" data-workflow-review="${esc(p.id)}" ${busy || state.status !== "complete" ? "disabled" : ""}>Review proposal</button></article>`).join("")}
      </div>
      <details ${state.status === "complete" ? "open" : ""}><summary>All qualifications (${state.requirements.length})</summary>
        <ul>${state.requirements.map(r => `<li><strong>${esc(r.text)}</strong> (${esc(r.category)}) — ${esc(labels[r.status] || r.status)}
          ${r.reason ? `<p>${esc(r.reason)}</p>` : ""}
          ${(r.evidence || []).map(e => `<blockquote>${esc(e.quote)}</blockquote>`).join("")}
        </li>`).join("")}</ul>
      </details>
      <details><summary>Previous answers</summary><ul>${state.questions.filter(q => q.disposition !== "pending").map(q => `<li>${esc(q.question)}<p>${esc(q.answer || q.disposition)}</p></li>`).join("")}</ul></details>
      <button type="button" class="secondary-button" data-workflow-download>Download session results</button>
      ${state.status === "waiting" ? `<button type="button" class="secondary-button" data-workflow-stop ${busy ? "disabled" : ""}>Finish with current evidence</button>` : ""}
      <p class="workflow-note">Sessions are kept in this server's memory for one hour and disappear when it restarts. User-edited wording is not automatically re-verified.</p>`;
    panel.querySelectorAll("[data-workflow-question]").forEach(field => {
      const select = field.querySelector("select"), text = field.querySelector("textarea");
      text.required = !busy;
      select.addEventListener("change", () => { text.disabled = select.value !== "answered"; text.required = select.value === "answered"; });
    });
    panel.querySelector("form").addEventListener("submit", event => {
      event.preventDefault();
      onSubmit([...panel.querySelectorAll("[data-workflow-question]")].map(field => ({ questionId: field.dataset.workflowQuestion, disposition: field.querySelector("select").value, text: field.querySelector("textarea").value })));
    });
    panel.querySelectorAll("[data-workflow-review]").forEach(button => button.addEventListener("click", () => onReview(button.dataset.workflowReview)));
    panel.querySelector("[data-workflow-download]").addEventListener("click", onDownload);
    panel.querySelector("[data-workflow-stop]")?.addEventListener("click", onStop);
    panel.querySelector("[data-workflow-resume]")?.addEventListener("click", onResume);
  }
};
