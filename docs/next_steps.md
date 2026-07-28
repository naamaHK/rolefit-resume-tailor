# RoleFit Next Steps

Last updated: 2026-07-09

## Urgent Repair Pass

1. Stabilize comment colors.
   - Bug: comment colors can change after closing another comment.
   - Example: spelling error starts red, then becomes green after another comment is closed.
   - Expected: each comment keeps a stable category/color for its lifetime.

2. Simplify comment categories.
   - Current categories feel too fragmented.
   - Unify Resume Improvement and Resume Structure into one improvement category, because structure fixes are resume improvements.
   - Keep Job Specific visually distinct from general resume improvement.
   - Keep Mandatory distinct when the resume is missing required fields.

3. Investigate Role Analysis.
   - Bug: Role Analysis is not working reliably.
   - Check whether the issue is parsing the AI response, filtering too aggressively, or rendering the analysis card incorrectly.
   - Confirm that required skills, weak/missing signals, and do-not-claim-without-confirmation items are still extracted.

4. Fix Missing Experience flow regressions.
   - Verify new project preview and Add to Projects.
   - Verify new experience preview and Add to Experience.
   - Verify Add to Skills preserves the full resume and does not collapse the resume to only Skills.

## Later Follow-Up

1. Mobile support.
   - Continue the mobile layout/debugging pass later.
   - Test the full review flow on phone, not only static layout.

2. Understand and simplify preview highlighting.
   - More urgent than new features.
   - Document why highlighting is hard in the current implementation.
   - Decide whether to move to a structured diff model instead of matching rendered HTML text.
   - Define fallback behavior: one-word changes highlight the word; inserted entries highlight the inserted entry; multi-sentence rewrites can highlight the whole bullet.

3. Role Analysis improvement tracking.
   - After the user adds a missing skill/experience, update Role Analysis to show that the keyword or signal is now covered.
   - Highlight the improvement in the Role Analysis panel so the user can see why the new tool helped.

