# Live Evaluation Results

This directory stores one versioned result record for each completed live
evaluation. A result is recorded only after RoleFit has processed the fixture
through the actual web flow and the independent oracle scorer has checked the
final resume.

Each record includes the model used, the questions asked, simulated-user
decisions, accepted change, before/after representation scores, and separate
binary gates for Grounding Safety, Structure Preservation, expected-question
coverage, and recognition of qualifications already supported by the resume.
Current-format records also include the complete pre-UI analysis response and
a `model_run` block with the expected, requested, and returned model, provider,
temperature, latency, attempted models, and any usage or cost fields supplied
by OpenRouter.

The fixture and its hidden profile live separately under `evaluation/fixtures/`.
The application never receives the hidden profile.
