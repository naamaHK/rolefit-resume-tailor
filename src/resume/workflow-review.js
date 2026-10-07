// Small adapter into the existing preview/accept/reject workflow. Importing a
// proposal creates a pending card; it never changes the resume automatically.
window.RoleFitWorkflowReview = {
  addProposal(proposal, requirement) {
    if (currentChanges.some(change => change.id === proposal.id)) return;
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
    setAiStatus("Verified proposal added for review. Preview and approve its wording and placement.", "success");
  }
};
