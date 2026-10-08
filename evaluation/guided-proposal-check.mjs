// Deterministic smoke-test check. This does not judge wording or score a final
// resume; it only checks whether known missing facts reached user review.
export function checkGuidedProposals(fixture, state) {
  const proposalRequirements = state.proposals.map(proposal =>
    state.requirements.find(requirement => requirement.id === proposal.requirementId)?.text.toLowerCase() || ""
  );
  const expectedAdditions = fixture.oracle.interactions
    .filter(interaction => interaction.confirmed)
    .map(interaction => fixture.oracle.requirements.find(requirement => requirement.id === interaction.requirement_id)?.label)
    .filter(Boolean);
  return {
    expected_additions: expectedAdditions,
    missing_proposals: expectedAdditions.filter(label => !proposalRequirements.some(text => text.includes(label.toLowerCase()))),
    unsupported_proposals: fixture.oracle.requirements
      .filter(requirement => !requirement.profile_supported && proposalRequirements.some(text => text.includes(requirement.label.toLowerCase())))
      .map(requirement => requirement.label)
  };
}
