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

The next step is to create roughly five carefully chosen resume variants per
profile (ten across its two jobs), for a first suite of 50 tests. Variants will
cover omitted supported evidence, unsupported requirements, related degrees,
semantic coverage, experience-duration gaps, and repair/structure boundaries.
