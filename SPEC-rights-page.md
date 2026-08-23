# Spec: Public Renter Rights Guide

Status: Approved on 2026-08-18

## Objective

Replace the `/rights` placeholder with a server-rendered, source-led guide that helps renters decide
what to document, where to find the rules that apply to them, and when to seek qualified local
help. The page must be useful without pretending that one legal rule applies across every state,
province, territory, or municipality.

The initial guide is jurisdiction-neutral in its instructions. United States federal protections and
help channels appear in a clearly labeled U.S. section; visitors elsewhere are directed to their
local housing authority, consumer-protection office, or legal-aid provider. The page provides
general educational information, not individualized legal advice.

## Tech Stack

- Remix 3.0.0 beta route/controller and server-rendered `remix/ui` components
- TypeScript 7
- Tailwind CSS 4 using the existing paper/ink/acid/coral/blue visual system
- Static, route-owned resource data with no database, geocoder, or third-party API
- Node test runner through the repository's `pnpm test` script

## Commands

- Build: `pnpm build`
- Test: `pnpm test`
- Typecheck: `pnpm typecheck`
- Lint: `pnpm exec oxlint .`
- Format check: `pnpm exec oxfmt --check .`
- Remix checks: `pnpm exec remix routes && pnpm exec remix doctor`
- Development: `pnpm dev`

## Project Structure

- `app/routes.ts` — keep `/rights` as the typed public route.
- `app/actions/controller.tsx` — render the route without a database query.
- `app/actions/rights/resources.ts` — own the reviewed source metadata and section content.
- `app/actions/rights/page.tsx` — own the semantic, responsive guide presentation.
- `app/actions/controller.test.tsx` — cover the complete route-to-HTML contract.

## Information Architecture

### 1. Start with the rules that apply where you live

- Explain that rental rules vary by location and housing program.
- Ask the reader to identify their city/locality, state/province/territory, housing type, and lease;
  the page does not collect or submit any of that information.
- Link to USAGov's tenant-rights directory for U.S. state agencies and handbooks.

### 2. Build a clear record

- Suggest keeping the lease, notices, dated photos, repair requests, responses, receipts, and a
  dated event timeline together.
- Suggest communicating material concerns in writing when safe and retaining a copy.
- Avoid promising that a particular record proves a claim or satisfies local notice rules.

### 3. Match the problem to qualified help

- Immediate danger: contact the appropriate local emergency service.
- Unsafe conditions or unresolved property issues: find the relevant local housing, health, or
  building authority and qualified local advice.
- U.S. housing discrimination: explain the federal Fair Housing Act scope at a high level and link
  directly to HUD's current rights and complaint pages.
- U.S. rental disputes or housing instability: link to HUD-approved housing counseling and the Legal
  Services Corporation's legal-aid finder.
- Court papers, eviction notices, lockouts, utility shutoffs, or an approaching deadline: seek local
  legal help promptly rather than relying on this guide.

### 4. Know what this guide cannot decide

- State plainly that the page is educational information, not legal advice or an attorney-client
  relationship.
- Explain that remedies, notice methods, filing deadlines, rent escrow, repair-and-deduct,
  withholding rent, lease termination, entry rules, and retaliation protections vary by
  jurisdiction and facts.
- Direct readers to verify current rules with an official local source or qualified legal provider
  before taking an action that could affect housing or a court deadline.

## Reviewed Source Set

Each resource renders its organization, purpose, destination domain, and a page-level
`Last reviewed August 18, 2026` note. Links use HTTPS and normal same-tab navigation.

| Resource                                                                                                        | Purpose                                                            | Scope                         |
| --------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ | ----------------------------- |
| [USAGov: How to file a complaint against a landlord](https://www.usa.gov/tenant-rights)                         | Find state tenant-rights agencies, handbooks, and dispute help     | United States                 |
| [HUD: Fair Housing Rights and Obligations](https://www.hud.gov/stat/fheo/rights-obligations)                    | Explain the federal fair-housing baseline and protected classes    | United States federal         |
| [HUD: Report Housing Discrimination](https://www.hud.gov/reporthousingdiscrimination)                           | Reach the current federal housing-discrimination complaint process | United States federal         |
| [HUD: Housing Counseling](https://www.hud.gov/stat/sfh/housing-counseling)                                      | Find HUD-participating housing counseling agencies                 | United States                 |
| [Legal Services Corporation: I Need Legal Help](https://www.lsc.gov/about-lsc/what-legal-aid/i-need-legal-help) | Find LSC-funded civil legal-aid organizations                      | United States and territories |

## Code Style

Keep the controller declarative and pass typed, static guide content into the page:

```tsx
rights: {
  async handler(context) {
    return context.render(
      <DocumentWithShell title="Renter rights | wtf.rent">
        <RightsPage guide={RIGHTS_GUIDE} />
      </DocumentWithShell>,
    )
  },
},
```

Use semantic headings, sections, lists, and descriptive link text. Preserve the shared responsive
navigation and existing visual language. Do not add hydration: the initial guide has no client-side
state, search, questionnaire, location detection, or embedded third-party content.

## Testing Strategy

- Controller tests prove `/rights` returns `200`, sets the document title, and marks Rights as the
  current primary-navigation item.
- Content tests prove every approved section, limitation, urgent-help direction, reviewed date,
  source organization, and exact HTTPS destination renders.
- Boundary tests confirm there is no form, geolocation request, address field, personalized outcome,
  jurisdiction-specific deadline, or instruction to withhold rent or use another self-help remedy.
- Link tests keep the reviewed source allowlist explicit and detect accidental source replacement.
- Browser verification covers keyboard navigation, a clean console, and layouts at 320, 768, 1024,
  and 1440 CSS pixels.

## Boundaries

- Always: distinguish general process guidance from U.S.-specific federal information; label every
  source and its scope; show the review date; tell readers to verify current local rules.
- Always: use authoritative public sources, plain language, descriptive links, and a prominent
  educational-information disclaimer.
- Ask first: add a jurisdiction selector, personalized legal questionnaire, location collection,
  state/local legal summaries, filing deadlines, analytics, external API, or new source domain.
- Never: claim universal rights or guaranteed outcomes; create an attorney-client relationship;
  tell a renter to withhold rent, repair and deduct, break a lease, change locks, ignore entry, miss
  a deadline, or take another jurisdiction-sensitive self-help action.

## Success Criteria

- `GET /rights` returns `200`, marks Rights as current, and renders a complete useful guide without
  JavaScript or database access.
- Readers can distinguish immediate safety needs, documentation steps, local-rule research, U.S.
  federal discrimination help, counseling, and civil legal aid.
- Every legal/help claim is bounded by its stated scope and paired with an approved authoritative
  source; the page displays when those sources were last reviewed.
- The page collects no location or personal data and gives no individualized result.
- The guide remains legible, semantically structured, keyboard accessible, and free of horizontal
  overflow across the required viewport sizes.
- Full tests, typecheck, build, lint, format, Remix checks, diff review, and responsive browser
  verification pass before publication.

## Open Questions

None for the initial slice. Jurisdiction-specific summaries, translated resources, saved checklists,
print/PDF output, and personalized referrals remain separate capabilities requiring explicit review.
