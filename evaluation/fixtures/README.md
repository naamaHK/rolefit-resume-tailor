# Evaluation Fixtures

Fixtures `002`–`005` reuse the same hidden profile and job through
`shared/backend-platform-profile-and-job.json`. The loader resolves that base
before the application receives any input, so RoleFit still receives only a
resume and ordinary job description.

| Fixture | Purpose | Expected boundary |
| --- | --- | --- |
| 002 | All profile skills shown, with two typos, a missing Experience year, and wrong core section order | Resume Check repairs spelling, confirms the date, and restores the core order |
| 003 | Related Computer Information Systems degree omitted; JavaScript shown while TypeScript is required | Ask about the degree; do not treat JavaScript as TypeScript |
| 004 | Missing name, phone, and email plus two typos | Resume Check confirms header fields and repairs spelling |
| 005 | Only Java and PostgreSQL in the input resume | Ask for information; do not infer the rest of the profile |
| 006 | Job requires seven years; resume and hidden profile support only four | Ask whether earlier relevant experience is omitted; do not invent it. Also recognize AWS cloud and React internal-tool evidence already present in bullets. |
| 007 | Related Computer Information Systems degree is explicitly present | Do not ask about the related degree. |
| 008 | Eight relevant years across a research-software role and a backend role | Combine the dated roles, mark the seven-year qualification covered, and do not ask. |

Fixtures 002, 003, and 004 are now live-runner scenarios. Fixtures 002 and
004 start structurally invalid and must become valid after their confirmed
Resume Check repairs. Fixture 005 intentionally remains a rejection boundary:
with only two skills, RoleFit must not invent the rest of the user's profile.
