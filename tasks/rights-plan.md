# Public Renter Rights Guide Implementation Plan

Status: Approved on 2026-08-18

Approved contract: [`SPEC-rights-page.md`](../SPEC-rights-page.md)

Stack base: `logan/codex-directory-page` / draft PR #25

Target branch: `logan/codex-rights-page`

## Dependency Map

| Component            | Responsibility                                                               | Depends on                    |
| -------------------- | ---------------------------------------------------------------------------- | ----------------------------- |
| Reviewed guide data  | Hold the approved copy, source metadata, scope labels, URLs, and review date | Approved source set           |
| Rights route         | Return the guide as server-rendered HTML without database access             | Reviewed guide data           |
| Rights page          | Present the guide with semantic structure and the shared visual language     | Guide and route contracts     |
| Router verification  | Prove status, title, navigation, content, source URLs, and safety boundaries | Route and page                |
| Browser verification | Prove keyboard access, responsive layout, and a clean runtime                | Complete server-rendered page |

Implementation is sequential: the content contract feeds the page, the page feeds the route, and
the route contract feeds browser verification. No database, new dependency, client entry, or route
map change is required.

## Implementation Order

### 1. Establish the HTTP and content contract with failing tests

- Add a focused `public renter rights guide` suite to the existing root controller test.
- Assert that `GET /rights` returns `200`, sets `Renter rights | wtf.rent`, and marks Rights as the
  current primary-navigation destination.
- Assert the four approved guide sections, urgent-help direction, review date, source labels,
  descriptive link text, and exact HTTPS destinations.
- Add boundary assertions for no form or location collection, no personalized outcome, no
  jurisdiction-specific deadline, and no prohibited self-help instruction.

Checkpoint: the focused test fails against the existing `404` placeholder for the intended reason.

### 2. Define the reviewed route-owned guide data

- Add a narrow typed contract in `app/actions/rights/resources.ts` for the page review date, section
  copy, and the five allowlisted resources.
- Keep organization, title, purpose, scope, display domain, and exact URL explicit so presentation
  code cannot silently invent legal scope or derive misleading labels.
- Keep the content immutable and static; do not add a database query, external request, geolocation,
  questionnaire, analytics, or hydration.

Checkpoint: typecheck passes and the resource list exactly matches the approved source set.

### 3. Render the complete server-first guide

- Add `app/actions/rights/page.tsx` using semantic `main`, section, heading, list, navigation, and
  link markup.
- Lead with a prominent urgent-help note and educational-information boundary, then render the
  approved four-part workflow and clearly labeled U.S. resources.
- Show each resource's organization, purpose, scope, destination domain, and the page-level review
  date with normal same-tab HTTPS links.
- Match the existing paper/ink/acid/coral/blue system, readable measure, visible focus treatment,
  and touch-target sizing without duplicating the shared shell.
- Replace only the root controller's Rights placeholder with `DocumentWithShell`, the approved
  title, and the static guide data. The existing `/rights` route definition remains unchanged.

Checkpoint: the focused router test passes and the generated HTML contains no form, personal-data
field, client-only state, street-address disclosure, or database-derived content.

### 4. Verify and publish the next stacked PR

- Run focused tests during implementation, then the full test, typecheck, build, lint, format,
  route, Doctor, and diff checks.
- Run real-browser inspection at 320, 768, 1024, and 1440 CSS pixels; verify heading and landmark
  order, keyboard navigation, visible focus, readable links, no horizontal overflow, and a clean
  console.
- Review every rendered legal/help statement against the approved copy and source allowlist.
- Create a focused signed-off Conventional Commit, publish `logan/codex-rights-page`, and open a
  draft PR based on `logan/codex-directory-page`.

Checkpoint: the remote PR contains only the approved Rights capability and its planning artifacts,
and its base/head relationship preserves the stack.

## Verification Commands

- Focused test: `pnpm test -- app/actions/controller.test.tsx`
- Full tests: `pnpm test`
- Typecheck: `pnpm typecheck`
- Build: `pnpm build`
- Lint: `pnpm exec oxlint .`
- Format: `pnpm exec oxfmt --check .`
- Remix routes: `pnpm exec remix routes`
- Remix Doctor: `pnpm exec remix doctor`
- Patch hygiene: `git diff --check`

## Parallelization

Implementation stays sequential because the resource schema, rendered copy, and assertions form one
legal-safety contract. Once the page is stable, browser inspection may overlap independent static
checks, but publication waits for both. No sub-agent work is planned.

## Risks and Mitigations

| Risk                                                | Mitigation                                                                                  |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| General guidance reads like universal legal advice  | Scope labels, local-rule reminders, and a prominent educational-information disclaimer      |
| A source URL or label drifts from the reviewed set  | Explicit typed allowlist plus exact destination assertions                                  |
| Urgent readers mistake the guide for emergency help | Put local emergency and time-sensitive legal-help direction before the longer resource list |
| Dense legal copy becomes difficult to scan          | Four numbered sections, short paragraphs, bounded line length, and distinct resource cards  |
| Responsive styling hides content or focus           | Server HTML first, shared shell, keyboard checks, and four required viewport widths         |
| Stack history diverges between local Git and GitHub | Publish from PR #25's verified head and update only by fast-forward                         |

## Rollback

Revert the Rights feature commit to restore the route's standard placeholder. No schema,
dependency, environment, external-service, or stored-data cleanup is required.

## Open Questions

None. Any jurisdiction selector, location-aware referral, state/local summary, deadline,
translation, analytics, PDF output, or new source domain requires a separate approved capability.
