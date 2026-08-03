# First Five Evaluation Fixtures

Fixtures `002`–`005` reuse the same hidden profile and job through
`shared/backend-platform-profile-and-job.json`. The loader resolves that base
before the application receives any input, so RoleFit still receives only a
resume and ordinary job description.

| Fixture | Purpose | Expected boundary |
| --- | --- | --- |
| 002 | All profile skills shown, with two typos, a missing Experience year, and wrong core section order | Repair detection; no invented repair |
| 003 | Related Computer Information Systems degree omitted; JavaScript shown while TypeScript is required | Ask about the degree; do not treat JavaScript as TypeScript |
| 004 | Missing phone and email plus two typos | Header and spelling repair detection |
| 005 | Only Java and PostgreSQL in the input resume | Ask for information; do not infer the rest of the profile |

Only fixture 003 is a structurally valid matching scenario. The other three
are deliberately invalid-input repair boundaries and need repair-decision
automation before their live flow can be run automatically.
