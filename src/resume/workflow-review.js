// Small adapter into the existing preview/accept/reject workflow. Importing a
// proposal creates a pending card; it never changes the resume automatically.
window.RoleFitWorkflowReview = {
  addProposal(proposal, requirement) {
    const existing = currentChanges.find(change => change.id === proposal.id);
    if (existing) {
      if (["accepted", "edited"].includes(existing.status)) {
        setAiStatus("This proposal is already in the final resume draft.", "success");
        return "applied";
      }
      if (existing.status === "rejected") {
        setAiStatus("This proposal was rejected. Start a new guided session to reconsider it.", "neutral");
        return "rejected";
      }
      setActivePass(inferChangePass(existing));
      renderNumberedCommentPreview();
      renderActiveCommentPanel(existing);
      setAiStatus("Proposal reopened at the resume preview. Preview its placement before accepting it.", "success");
      return "opened";
    }
    const evidence = proposal.evidence.map(item => `${item.sourceId}: ${item.quote}`).join("\n");
    const change = proposal.originalText
      ? normalizeAiChangeCard({
        id: proposal.id, type: "rewrite", section: proposal.section,
        original_text: proposal.originalText, suggested_text: proposal.suggestedText,
        why_it_helps: proposal.reason, evidence
      }, 0)
      : {
        ...buildAiQuestionCard({ id: proposal.id, promptText: "Review the confirmed wording and choose where it belongs.",
          relatedRequirement: requirement.text, whyItMatters: proposal.reason,
          missingTerm: requirement.text, isDateQuestion: false, dateSection: "" }),
        promptText: "Review the confirmed wording and choose where it belongs.",
        suggestedText: proposal.suggestedText, userDraftText: proposal.suggestedText,
        evidence, supportLevel: "user_confirmed", section: proposal.section
      };
    change.workflowVerifiedText = proposal.suggestedText;
    change.workflowId = proposal.id;
    currentChanges.push(change);
    setActivePass(inferChangePass(change));
    renderNumberedCommentPreview();
    renderActiveCommentPanel(change);
    setAiStatus("Proposal opened at the resume preview. Preview its placement before accepting it.", "success");
    return "opened";
  }
};
