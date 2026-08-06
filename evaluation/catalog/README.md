# Evaluation Catalog

This catalog is the source material for the next evaluation phase. It contains
five complete, fictional user profiles and two ordinary job descriptions for
each profile. It deliberately contains **no resumes, weights, oracle scores,
or expected model answers**: RoleFit will eventually receive only a selected
resume and the selected job-description text.

| Profile | Domain | Jobs |
| --- | --- | --- |
| Maya Cohen | Backend engineering | Backend Platform Engineer; Research Software Engineer |
| Noa Ben-Ami | Product and data analytics | Product Data Analyst; Operations Analytics Analyst |
| Lior Shalev | Program and operations management | Technical Program Manager; Implementation Operations Manager |
| Dalia Rahamim | Research and insights | Research Analyst; Applied Researcher |
| Amir Levi | Customer success | Customer Success Manager; Implementation Manager |

Each job has a normal role description followed by `Basic Qualifications` and
`Preferred Qualifications`. For every profile/job pairing, some qualifications
are truthfully supported and at least one Basic and one Preferred
qualification are deliberately unsupported. The hidden profile records known
unsupported items only to let the evaluation check for invented claims; that
field is never passed to RoleFit.

Each job also has one `semantic_coverage_check`. It identifies a requirement
and a non-identical experience bullet that already supports it. This metadata
is evaluation-only: it is not sent to RoleFit. A valid RoleFit result must
recognize that evidence and must not ask the user to confirm it again.

The next step is to create roughly five carefully chosen resume variants per
profile (ten across its two jobs), for a first suite of 50 tests. Variants will
cover omitted supported evidence, unsupported requirements, related degrees,
semantic coverage, experience-duration gaps, and repair/structure boundaries.

## Benchmark cards

[`test-cards.json`](test-cards.json) now defines the 50 distinct planned
fixtures: exactly 10 per profile and 5 per job. A card is not a runnable test
yet; it specifies the job, one unique primary boundary, the resume mutation,
and the expected behavior before a concrete resume is written.

The assignment is fixed rather than random. Random selection would make a
result depend on which job happened to be chosen; every card instead has one
immutable `profile_id` + `job_id` pair. High-level checks such as safety recur
where useful, but no card duplicates the same target requirement, mutation,
and expected behavior.
