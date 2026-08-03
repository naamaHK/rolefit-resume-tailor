# Live Evaluation Results

This directory stores one versioned result record for each completed live
evaluation. A result is recorded only after RoleFit has processed the fixture
through the actual web flow and the independent oracle scorer has checked the
final resume.

Each record includes the model used, the questions asked, simulated-user
decisions, accepted change, before/after representation scores, and the binary
Grounding Safety and Structure Preservation gates.

The fixture and its hidden profile live separately under `evaluation/fixtures/`.
The application never receives the hidden profile.
