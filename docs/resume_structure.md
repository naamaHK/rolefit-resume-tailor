# Resume Structure Rules

## Fixed Order

The first four sections must always appear in this order:

1. Header
2. Statement / Professional Summary
3. Experience
4. Education

Never move Education before Experience. Never move Experience before Statement / Professional Summary.

Header is mandatory and must include full name, phone number, and email address.

Statement / Professional Summary is recommended but not strictly mandatory. If it is missing from the original resume, it can usually be added as a concise user-approved improvement.

## Optional Sections

The following sections are optional and may appear after Education:

- Publications
- Patents
- Strengths
- Achievements
- Skills
- Languages
- Selected Projects / Projects
- Certifications
- Google Scholar / portfolio links

Other custom sections are allowed, but they must also arrive after Education.

Do not create empty optional sections.

Prefer adding confirmed information to an existing relevant section when that keeps the resume clearer. Avoid creating a new optional section for one weak item. A new optional section should usually have at least two meaningful items, unless a single item is substantial and highly relevant.

Do not create duplicate or near-duplicate sections. For example, `Skills` and `Technical Skills` should be merged into one `Skills` section, with rows/subsections inside it when useful.

Never leave placeholders or internal user-instruction text in the resume, such as `[to be confirmed per user input]`, `TBD`, or `ask user`.

## Page Budget

The main resume should fit on one page whenever possible.

A two-column layout is allowed and useful for compact sections such as Skills, Strengths, Achievements, and Languages.

For designed/two-column resumes, compact optional sections may appear in the side column while the visual reading order remains clear.

For ATS/plain resumes, do not rely on side-column layout. Use a single-column order with Header, Statement/Summary, Experience, Education, then optional sections.

Page two may include only:

- Publications
- Patents
- Google Scholar / portfolio links

When Selected Projects and overflow-only material are both present, reserve page-one space for Projects. Move Publications, Patents, and links to page two rather than pushing Projects to a later page.

Do not push Header, Statement / Professional Summary, Experience, Education, Strengths, Achievements, Skills, or Languages to page two.

Publications, Patents, and Google Scholar / portfolio links should stay on page one when there is enough space. Use page two only for overflow.

### Designed Resume Page-Budget Algorithm

For the Designed export, apply these steps in order before asking the user to remove content:

1. Use compact, consistent spacing and readable body text. Do not reduce body text below 11pt.
2. If page one is still too full, move the last eligible compact optional section that fits as a whole into the side column. Eligible sections include Skills, Languages, Strengths, Achievements, Awards, and Certifications. Do not split a section between columns.
3. If needed, move Publications, Patents, and Google Scholar / portfolio links to page two. Do not use page two for core resume material or other optional sections.
4. If page one still cannot fit, show the user a choice: keep the longer resume unchanged, or request optional LLM shortening suggestions. The LLM may suggest shorter bullets or removal of lower-priority material, but it must not delete or rewrite content without user approval.

## Header Format

Essential:
- Full name
- Phone number
- Email address

Optional:
- LinkedIn
- Location
- GitHub, portfolio, Google Scholar, or personal website

Rules:
- Do not finalize a resume without name, phone number, and email address.
- If an essential header field is missing, ask the user for it rather than inventing it.
- Do not mix contact details into other resume sections.

## Statement / Professional Summary Format

Statement / Professional Summary is recommended but optional.

Rules:
- If missing, it can be added from resume-supported evidence and user approval.
- Keep it concise, usually 2-4 lines.
- Do not add unsupported claims just to create a summary.

## Experience Format

```text
Job title                                      Years
Workplace / company
- Bullet explaining work, ownership, method, or impact.
- Bullet explaining work, ownership, method, or impact.
```

Rules:
- Job title is the primary line.
- Job title is mandatory.
- Years/dates appear on the right side of the job title line.
- Every experience entry should include years/dates. If one role is missing years while others have years, ask the user for the missing years.
- Workplace/company appears on the next line.
- Workplace/company is mandatory.
- Job details appear as bullets under the workplace.
- Bullets are useful but not mandatory.
- Do not treat a job bullet as a new job title.
- Do not treat a company name as a paragraph.

## Education Format

```text
Degree / program                              Years
Institution
Optional details such as thesis, advisor, honors, or specialization.
```

Rules:
- Degree/program is mandatory.
- Years/dates appear on the right side.
- Every education entry should include years/dates. If missing, ask the user for the exact years rather than guessing.
- Institution appears under the degree/program.
- Institution is mandatory.
- Education always appears after Experience.

## Publications Format

```text
Paper title                                   Year
Conference / venue
Authors list
Optional link to paper
```

Rules:
- Paper title is mandatory.
- Year appears on the right side.
- Every publication entry should include a year. If missing, ask the user for it rather than guessing.
- Authors list is mandatory.
- Conference or venue is optional.
- Link to paper is optional.
- Link appears on its own line when present.
- Do not merge a paper link into the authors row.

## Patents Format

```text
Patent name                                   Year
Authors / inventors list - Status if available
```

Compressed format is acceptable:

```text
Patent name                                   Year
Authors/inventors - status if available
```

Rules:
- Patent name is mandatory.
- Year appears on the right side of the patent name line.
- Every patent entry should include a year. If missing, ask the user for it rather than guessing.
- Authors/inventors list is mandatory.
- Status is optional. When present, it appears inline after the authors/inventors with a dash, not on the right and not as a separate line.
- Do not attach Google Scholar or external profile links to the last patent.

## Compact Sections

Strengths:
- Use bullets.
- Each bullet should be one complete strength.

Achievements:
- Use grouped achievements when there is a main achievement followed by supporting bullets.

Skills:
- Keep compact.
- Put several skills on the same row when possible.
- Separate skills with commas, middle dots, or bullets depending on the template.
- Keep one Skills section. Do not create both `Skills` and `Technical Skills`; group programming languages separately from broader domain skills inside the same section when it improves scanning.
- Create a subgroup only when it has at least 2-3 real items. If only one programming language/tool is confirmed, merge it into the general Skills row.
- For programming languages/tools, ask for level of knowledge when useful. If the user does not specify levels, write them as a compact list like other skills.

Languages:
- Language appears on one side and proficiency on the other.

Selected Projects / Projects:
- Use for substantial personal, portfolio, open-source, hackathon, or prototype work that is not part of a job.
- Prefer `Selected Projects` as the title when showing curated projects.
- Each project should include project name and year.
- Add a short label such as `Personal project` or `Open-source project` when useful.
- Bullets should describe what the user built/did and any outcome, without overstating production experience.
- Do not create a new Projects section for one small item unless it is strong and role-relevant; consider Skills instead.

Certifications:
- Use only for actual certificates or credentials.
- Each certification should include certification name, issuer, and year.
- Do not put ordinary tutorials or short videos in Certifications.

Google Scholar / portfolio links:
- Put each important profile on its own row.
- Long links may appear below their label.

## Confirmed Additions

Never output a section named `USER-CONFIRMED ADDITIONS`.

Place confirmed additions by type:
- Confirmed skill -> Skills.
- Confirmed role detail -> matching Experience role; if it is a new role, require role/title, company, and years.
- Confirmed project/prototype -> existing Projects section, Selected Projects, matching Experience role if it was work-related, or Skills if it is too small for its own section.
- Confirmed course/training -> Education only when it is meaningful and includes course/program name, institution/provider, and year; otherwise Skills or omit.
- Confirmed certification -> Certifications only when it has certification name, issuer, and year.
- Confirmed publication -> Publications.
- Confirmed patent -> Patents.
- Confirmed profile link -> Header or External Links.

The model may recommend placement, but the user can override it. Respect the user's chosen placement and validate mandatory fields for that destination before applying it.
