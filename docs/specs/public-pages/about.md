# Spec: Public About Page

Status: Implemented
Owner: `app/actions/about/`
Canonical tests: `app/actions/controller.test.tsx`

## Objective

Replace the `/about` placeholder with a server-rendered explanation of what wtf.rent is for, how
the public rental record works, what contributors are expected to publish, and which account and
location details stay outside public pages. The page should help a new visitor decide how to read
reports responsibly and whether to contribute one without implying that wtf.rent verifies claims,
resolves disputes, provides legal advice, or already operates unbuilt moderation workflows.

The About page is explanatory only. It does not query report totals, collect input, create a legal
policy, or change publication, retention, moderation, authentication, or privacy behavior.

## Audience and Jobs

- A renter deciding whether this is a useful and trustworthy public record.
- A reader deciding how much weight to give an individual report.
- A prospective contributor checking what will become public and what must be omitted.
- A reviewer checking that product claims match the implemented report and privacy contracts.

## Content Contract

### 1. Mission

- Explain that wtf.rent helps renters share firsthand rental experiences and make recurring
  landlord, property-manager, city, region, and housing-category information easier to find.
- Frame the product as one source of renter context, not a definitive rating, endorsement,
  background check, official record, or substitute for an inspection or local research.
- Link directly to the public report feed and Directory.

### 2. How the record works

- Reports come from signed-in contributors and publish immediately after a valid submission.
- Each contribution must describe the contributor's firsthand rental experience.
- Public reports may show the contributor's public username, landlord or property-manager name,
  city, region, title, report text, category, rating, and applicable dates.
- Readers should compare an account with other reports, current local records, their own
  inspection, and qualified help when the stakes are high.
- Publishing a report does not establish that a law was broken or that every claim was independently
  verified by wtf.rent.

### 3. Public and private boundaries

Render one explicit comparison with these implemented boundaries:

| Public record                          | Kept out of public pages and search                  |
| -------------------------------------- | ---------------------------------------------------- |
| Public username                        | Account email and password data                      |
| Landlord or property-manager name      | The dedicated street-address field                   |
| City and region                        | Apartment or unit numbers                            |
| Report title and firsthand account     | Private contact information and other tenants' names |
| Category, rating, and applicable dates | Hidden reports                                       |

- State precisely that a building-level street address is stored for internal report identification
  but is not selected by public queries, searched, serialized to public props, or rendered.
- State that city and region are the only structured location fields shown publicly.
- Remind contributors that report text is public and must not contain unit details, private contact
  information, or other tenants' names.
- Do not claim anonymity, end-to-end encryption, automatic redaction, comprehensive moderation,
  regulatory compliance, or a retention/deletion right that the product does not implement.

### 4. Publishing standards

Present a short contributor checklist:

1. Share only a firsthand rental experience.
2. Stick to relevant, supportable details and distinguish observation from opinion.
3. Remove unit details, contact information, and other tenants' names before publishing.
4. Keep records privately when they may help explain what happened.
5. Use the Rights guide to find current local rules and qualified help instead of treating a report
   as legal guidance.

The checklist is guidance, not a claim that submissions receive pre-publication review. It must not
promise accuracy, verification, dispute resolution, evidence storage, editing, flagging, or a
self-service removal workflow.

### 5. Read with context

- Explain that individual experiences can be incomplete, disputed, or different from another
  renter's experience.
- Encourage readers to look for patterns without treating volume, absence of reports, or a star
  rating as proof.
- Link to the Rights guide for jurisdiction-specific starting points and to the report form for a
  signed-in renter who is ready to contribute responsibly.

## Page Structure

Use one semantic `<main>` containing:

1. A mission hero with one `<h1>` and links to the feed and Directory.
2. A numbered explanation of how the public record works.
3. A prominent public/private comparison using semantic description-list or table markup that
   remains understandable on a narrow screen.
4. A publishing-standards checklist.
5. A read-with-context section and final links to Rights and the report form.

Use the shared `DocumentWithShell`, title `About | wtf.rent`, and existing
paper/ink/acid/coral/blue visual system. The About item is marked as the current primary-navigation
item. The page stays useful without JavaScript and adds no client entrypoint or hydration.

## Project Structure

- `app/routes.ts` — keep the existing typed `/about` route unchanged.
- `app/actions/controller.tsx` — replace only the About placeholder response.
- `app/actions/about/page.tsx` — own the static semantic page and route-specific presentation.
- `app/actions/controller.test.tsx` — prove the rendered contract and reject inaccurate claims.

Do not add a generic shared component or data module for one static page.

## Testing Strategy

- Begin with a controller test that proves `GET /about` returns `200`, uses the approved title,
  marks About current, renders all five content areas, and links to Feed, Directory, Rights, and the
  report form.
- Add adversarial HTML assertions for the exact public/private claims: city and region are public;
  the dedicated street address and account email/password data are not public; report text is public;
  and submissions publish immediately.
- Reject claims of anonymity, independent verification, pre-publication review, legal advice,
  automatic redaction, or capabilities beyond the implemented report-editing contract, flagging,
  and self-service deletion.
- Prove the route introduces no form, input, geolocation behavior, database call, external URL, new
  dependency, or client entrypoint.
- Run the complete test, typecheck, build, lint, format, Remix route, Remix Doctor, and patch checks.
- Inspect keyboard focus, landmarks, heading order, link behavior, console output, and horizontal
  overflow in a real browser at 320, 768, 1024, and 1440 CSS pixels.

## Boundaries

- Always: match the implemented report contract; distinguish platform behavior from contributor
  guidance; state immediate publication and public report-text behavior plainly; keep the dedicated
  street address and account data outside public output; use typed route links.
- Ask first: create or change legal terms, a privacy policy, moderation promises, retention/deletion
  commitments, report verification, organization ownership claims, or new personal-data behavior.
- Never: imply anonymity, guarantee accuracy or safety, claim that reports are reviewed before
  publication, expose or query private data, add analytics or an external service, or fabricate
  product history, team biographies, impact metrics, testimonials, contact details, or report counts.

## Success Criteria

- `GET /about` returns `200`, uses `About | wtf.rent`, marks About current, and renders the approved
  mission, record process, privacy comparison, publishing standards, and reading guidance.
- The page truthfully distinguishes public username/report/location content from the dedicated
  private street-address field, unit information, account data, and hidden reports.
- Copy states that valid reports publish immediately, are firsthand accounts, may not be
  independently verified, and do not establish a legal violation.
- Visitors can continue to Feed, Directory, Rights, and the report form through native links.
- The route remains static, server-rendered, database-free, form-free, external-link-free, and useful
  without JavaScript.
- Full automated checks and responsive real-browser verification pass.

## Open Questions

None. Formal legal terms, privacy policy, moderation/reporting tools, self-service correction or
deletion, team/contact content, and live impact metrics remain separate capabilities requiring their
own approved contracts.
