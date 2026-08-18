# Spec: Renter Reports Vertical Slice

## Objective

Replace the home page's sample reviews and placeholder post actions with the first complete
wtf.rent product loop: an authenticated renter can publish a structured, firsthand report; the
report is stored in PostgreSQL; anyone can discover it in the public feed and open a public detail
page using city/region-level location context without exposing the stored street address.

This is one vertical capability. It includes report creation, persisted feed/search, pagination,
and public detail because each part depends on the same report contract and none is useful to a
renter on its own.

The product calls these records **reports**. The implementation keeps the existing `Post` table and
`/posts` route family so existing ids, comments, and migrations remain compatible. The rationale is
recorded in `docs/decisions/001-preserve-post-storage-for-renter-reports.md`.
The location privacy boundary is recorded in
`docs/decisions/002-withhold-street-addresses-from-public-report-output.md`.

## Tech Stack

- Node.js 24+
- TypeScript 7
- Remix 3 (`remix@3.0.0-beta.6`)
- PostgreSQL through `remix/data-table`
- `remix/data-schema` and `remix/data-schema/form-data` for boundary validation
- Existing session authentication and synchronizer-token CSRF middleware
- Server-rendered Remix components and Tailwind CSS 4

No new runtime dependency is expected. One additive SQL migration is required.

## Commands

- Install: `pnpm install --frozen-lockfile`
- Develop: `pnpm dev`
- Build CSS: `pnpm build`
- Test: `pnpm test`
- Focused report tests: `pnpm test -- app/actions/post/controller.test.tsx app/actions/controller.test.tsx app/data/schema.test.ts`
- Typecheck: `pnpm typecheck`
- Lint check: `pnpm exec oxlint .`
- Format check: `pnpm exec oxfmt --check .`
- Route validation: `pnpm exec remix routes`
- Framework diagnostics: `pnpm exec remix doctor`
- Dependency audit: `pnpm audit`

## Project Structure

- `app/routes.ts` — typed home and `/posts` route contract
- `app/actions/controller.tsx` — public, server-rendered report feed and search response
- `app/actions/home-page/public/` — home-page presentation and report-card presentation
- `app/actions/post/controller.tsx` — authenticated new/create actions and public show action
- `app/actions/post/` — route-owned report form, detail UI, validation, and issue mapping
- `app/data/schema.ts` — additive report columns on the existing `Post` table
- `app/data/reports.ts` — report persistence and public query operations shared by home and post
  actions
- `app/middleware/request-telemetry.ts` — request correlation and privacy-safe structured HTTP
  outcome logs
- `app/**/*.test.ts(x)` — colocated schema, controller, and router behavior tests
- `test/` — isolated database/session fixtures shared by report tests
- `db/migrations/<timestamp>_add_report_fields/up.sql` — additive, legacy-safe report migration
- `docs/decisions/` — durable rationale for report storage decisions

Route-owned response assembly stays in `app/actions/`. Persisted-data operations stay in
`app/data/`. Shared cross-route UI moves to `app/ui/` only when reuse is demonstrated.

## Code Style

Define the server contract first, validate at the action boundary, perform parameterized writes
through the injected database, and return explicit responses for expected outcomes:

```tsx
let parsed = s.parseSafe(createReportSchema, context.formData)

if (!parsed.success) {
  return renderNewReport(
    context,
    {
      issues: parsed.issues,
      values: getSafeReportValues(context.formData),
    },
    { status: 422 },
  )
}

let report = await createReport(context.db, {
  ...parsed.value,
  authorId: getCurrentUser().id,
  experienceConfirmedAt: new Date(),
})

return redirect(routes.post.show.href({ id: report.id }), 303)
```

- Use `let` for local bindings, matching repository style.
- Import Remix APIs from subpaths, never from a top-level `remix` entry.
- Generate internal URLs from `app/routes.ts`; do not hand-build post URLs.
- Use semantic form controls, visible labels, linked field errors, and clear focus styles.
- Render user content through JSX text children. Never use raw HTML or `innerHTML`.
- Keep expected validation and not-found outcomes out of exception control flow.

## Report Contract

### Persisted fields

New reports require these values at the application boundary:

| Field                   | Contract                                                | Purpose                                      |
| ----------------------- | ------------------------------------------------------- | -------------------------------------------- |
| `address`               | Trimmed building-level street address, 5–160 characters | Internal report identification; never public |
| `city`                  | Trimmed, 1–100 characters                               | City discovery and display                   |
| `region`                | Trimmed state/province/region, 1–100 characters         | Disambiguation                               |
| `landlordName`          | Optional; trimmed, 2–160 characters when present        | Landlord discovery                           |
| `category`              | One approved category value                             | Feed scanning and filtering later            |
| `rating`                | Integer from 1 through 5                                | Consistent renter assessment                 |
| `title`                 | Trimmed, 5–120 characters                               | Feed headline                                |
| `content`               | Trimmed, 20–5,000 characters                            | Firsthand report body                        |
| `authorId`              | Derived only from authenticated server context          | Attribution and ownership                    |
| `experienceConfirmedAt` | Server timestamp set after checked attestation          | Record of confirmation                       |
| `status`                | `PUBLISHED` on create; later may become `HIDDEN`        | Public visibility control                    |

Approved category values are:

- `MAINTENANCE`
- `RENT_INCREASE`
- `FEES_OR_DEPOSIT`
- `SAFETY`
- `COMMUNICATION`
- `GOOD_EXPERIENCE`
- `OTHER`

The form includes a required `isFirsthand` checkbox confirming that the author describes their own
rental experience and removed apartment/unit numbers and private contact information. The checkbox
is validated but not stored; the server stores `experienceConfirmedAt` instead.

The form does not expose `authorId`, `status`, or `experienceConfirmedAt` controls. Submitted values
for those names are ignored.

### Legacy compatibility

The migration adds report-specific columns to `Post` without renaming or deleting the table,
primary keys, foreign keys, or comments. Report-specific fields other than `status` are nullable at
the database layer so previously stored posts remain valid. New writes through the application
must satisfy the complete report contract.

Existing posts receive `PUBLISHED` status and remain readable. Missing legacy metadata is rendered
honestly as unavailable; the application must not invent an address, category, landlord, or rating.

The SQL migration mirrors the application contract with a rating check (`1` through `5` or null),
an allowed-category check, and an allowed-status check.

### Location privacy

- A report stores a building-level street address for internal report identification, but that
  field is never selected by public queries, searched, serialized to public client props, or
  rendered in public HTML.
- City and region are the only structured location fields displayed publicly. They appear with the
  author's public username and the other approved report metadata.
- There is no apartment/unit field.
- The address validator rejects common unit designators such as `apartment`, `apt`, `unit`, `suite`,
  `ste`, and `#` followed by a unit identifier.
- Help text tells authors that the street address is stored but not shown publicly and not to put
  unit numbers, private phone numbers, email addresses, or names of individual tenants in any
  field.
- Email addresses and other private account fields are never included in report queries or client
  props.

### Retention and removal

Published reports are retained as part of the public rental record until they are hidden or
deleted. `HIDDEN` rows are excluded from every public query and return the same `404` response as a
missing report. This slice provides the storage-level visibility control but does not add a
moderation console or self-service edit/delete flow.

Before accepting production reports, an operator deletion procedure must cover reports by report
id or author id and their dependent comments. Automated export, correction, account deletion, and
retention-policy changes remain separate approved work.

## Route Contract

### Public feed: `GET /`

- Reads only `PUBLISHED` posts.
- Orders newest first with a stable id tie-breaker.
- Uses a fixed page size of 20 and a positive `page` query parameter; missing or invalid pages
  normalize to page 1.
- Accepts an optional `q` query capped at 100 trimmed characters.
- Search is case-insensitive across title, content, city, region, landlord name, and the category
  label. It never searches the stored street address.
- Search and pagination remain server-rendered and shareable by URL.
- Shows an actionable empty state when no reports match.
- Uses real database counts for any count displayed. Sample reviews, fabricated activity totals,
  and controls for deferred features are removed.
- Legacy posts remain visible with truthful missing-metadata labels.

### New report: `GET /posts/new`

- Requires authentication; guests redirect to login with the safe return path already provided by
  `requireAuth()`.
- Renders a server form that works without client JavaScript.
- Includes the active session CSRF token.
- Explains that city/region and the public username will be published while the street address is
  stored but not shown publicly.
- Links validation messages to their controls and preserves only bounded report values after an
  error.

### Create report: `POST /posts`

- Requires authentication and a valid synchronizer CSRF token.
- Validates and normalizes the complete report form at the boundary.
- Rejects unit-like address input, missing attestation, out-of-range ratings, unsupported
  categories, overlong values, and blank required values with field-level `422` responses.
- Derives the author and timestamps on the server and creates a `PUBLISHED` report.
- Redirects to the created report with `303 See Other`.
- Is explicitly unsafe to retry: a second valid submission represents a second report. The UI must
  prevent accidental repeat clicks when JavaScript is active, but the server does not claim an
  idempotency guarantee in this slice.

### Public detail: `GET /posts/:id`

- Returns `200` for a published report and renders its structured metadata and escaped body.
- Shows city/region as its only structured public location and never returns the stored street
  address.
- Shows only the author's public username, never email or credential data.
- Returns the standard `404` page for an unknown or `HIDDEN` report.
- Legacy posts remain readable and omit unavailable structured metadata.

## Threat Model

### Trust boundaries and assets

- Boundaries: report form data, CSRF/session cookies, report path ids, feed query parameters, and
  PostgreSQL results.
- Assets: authenticated author identity, stored street addresses, the public username-to-region
  association, report integrity, private account data, and availability of the public feed.

### Abuse cases and controls

- Forged authorship → authentication plus server-derived `authorId`; client author fields are
  ignored.
- Cross-site publication → existing session-backed synchronizer-token CSRF middleware.
- Stored XSS → bounded plain text rendered only through escaped JSX text nodes.
- Street-address disclosure → public query allowlists omit `Post.address`, search never examines
  it, public serializers have no address field, and regression tests use unique private markers.
- Unit-level location disclosure → no unit field, address-pattern rejection, explicit help text,
  and required firsthand/privacy attestation.
- Private account disclosure → allowlisted report/username queries; no user email in output.
- Query or SQL injection → bounded schemas and parameterized `remix/data-table` queries.
- Feed exhaustion → fixed page size, bounded query length, deterministic ordering, and database
  indexes for public ordering/searchable fields where justified by query plans.
- Hidden-content discovery → public queries filter by status and use indistinguishable `404`
  responses.
- Spam, harassment, fabricated claims, or defamatory content → input caps, account attribution,
  firsthand attestation, and a hide status reduce harm but do not solve moderation. Rate limiting,
  flagging, evidence uploads, moderation workflows, and legal policy are explicitly required
  follow-up before broad public launch.

## Operational Visibility

The feature must let an operator answer these questions without inspecting report content:

1. Are report form, create, feed, and detail requests succeeding?
2. Are any of those routes becoming slower or returning more `4xx`/`5xx` responses?
3. Which server log entries belong to one failing request?

A small request middleware generates or validates a correlation id, returns it as `X-Request-ID`,
and emits one JSON completion record with a stable event name, HTTP method, pathname, status class,
and duration. Unexpected failures emit a correlated JSON error record before normal error handling
continues. These bounded logs can provide RED evidence through the deployment platform without a
new telemetry dependency.

Telemetry never includes search strings, query strings, form data, report text, addresses,
landlord names, usernames, emails, cookies, session values, or raw error messages. No alert is added
without a measured baseline and an actionable runbook.

## Testing Strategy

- Schema tests cover the added columns, allowed enum values, id generation, timestamps, and legacy
  nullable fields.
- Pure validation tests cover trimming, bounds, categories, ratings, optional landlord handling,
  required attestation, and unit-designator rejection.
- Router/controller tests use an injected fake database and in-memory session storage; they do not
  require a live developer database or real secrets.
- Creation tests cover guest redirect, CSRF rejection, authenticated form rendering, every invalid
  class, server-derived authorship, persistence, and the `303` detail redirect.
- Feed tests cover newest-first ordering, stable pagination, approved search fields, stored-address
  exclusion, hidden-row exclusion, legacy rows, real counts, empty state, and output escaping.
- Detail tests cover published, legacy, hidden, and missing reports plus absence of stored street
  address and account email.
- Migration verification runs the additive migration against a representative database containing
  users, posts, and comments and confirms row ids and relationships survive.
- Manual browser verification covers no-JavaScript submission, keyboard navigation, focus/error
  semantics, empty/search/paginated states, and responsive layouts at 320/768/1024/1440 px.

## Boundaries

- Always: preserve existing rows and relations, validate all external input, derive authorship on
  the server, enforce authentication and CSRF on creation, escape report output, exclude the
  dedicated street-address field from every public query and response, filter hidden reports,
  avoid fabricated data, and run all verification commands.
- Ask first: make street addresses public, collect unit-level location, add fields containing new
  personal-data categories, add a dependency or external geocoding/search service, change
  immediate-publication behavior, alter retention, or expand moderation/account-deletion scope.
- Never: store apartment/unit numbers intentionally, expose the dedicated street-address field,
  account email, or credentials publicly, trust client authorship/status/timestamps, render report
  HTML, concatenate SQL, weaken security headers, delete or rewrite an applied migration, or
  discard legacy posts/comments.

## Success Criteria

- An authenticated renter can open `/posts/new`, submit every required field with a valid CSRF
  token and confirmation, and arrive at the persisted public report via `303`.
- Invalid submissions return accessible field-level `422` responses, retain bounded safe values,
  and do not write a row.
- Common unit designators are rejected from the address field, and no unit field exists.
- A guest cannot reach the report form or create a report, and a client cannot choose another
  author or non-public initial status.
- The home page contains database-backed reports rather than sample reviews, supports bounded
  search and 20-item pagination, displays real counts only, and has meaningful empty states.
- Published and legacy reports have public detail pages; hidden and missing reports return the same
  `404` behavior.
- Report content is escaped, and public responses contain usernames plus city/region location but
  no stored street addresses or email addresses.
- The additive migration preserves existing users, post ids, and comments.
- The feature remains usable with JavaScript disabled and is keyboard-usable and responsive at
  320/768/1024/1440 px.
- Report routes emit correlated, structured request outcomes without report content or account PII,
  and responses include `X-Request-ID`.
- `pnpm build`, `pnpm test`, `pnpm typecheck`, `pnpm exec oxlint .`, `pnpm exec oxfmt --check .`,
  `pnpm exec remix routes`, and `pnpm exec remix doctor` pass. `pnpm audit` completes with no
  unmitigated reachable high/critical issue or has a documented external environment blocker.

## Deferred Scope

- Self-service report deletion
- Comment replies, comment editing, and comment deletion
- Cheers, saves, following, notifications, and personalized/nearby feeds
- Images, evidence uploads, address geocoding, and canonical landlord/property entities
- Category filters beyond free-text search
- Moderation UI, flags, appeals, rate limiting, and automated abuse detection
- Self-service data export, account deletion, and automated retention enforcement

## Resolved Decisions

- Superseded on 2026-08-17 before feature completion: the initial decision was to publish
  building-level addresses with public usernames.
- Approved on 2026-08-17: keep the required building-level street address in storage for internal
  report identification, but exclude it from all public queries, search, client props, and HTML;
  city/region is the only public structured location. Never collect a dedicated apartment/unit
  field, and require a firsthand/privacy confirmation.
- Approved on 2026-08-17: keep the `Post` table and `/posts` route family while calling records
  reports in product copy; use additive nullable columns for legacy compatibility.
- Approved on 2026-08-17: publish valid reports immediately with a storage-level `HIDDEN` state;
  defer moderation tooling.
- Approved on 2026-08-17: deliver create, public feed/search/pagination, and public detail before
  editing, social interactions, images, or advanced discovery.
- Approved on 2026-08-18: add author-only editing and authenticated public comments under the
  contracts in [`SPEC-report-editing.md`](./SPEC-report-editing.md) and
  [`SPEC-report-comments.md`](./SPEC-report-comments.md); keep deletion, replies, moderation, and
  rate limiting deferred.

## Open Questions

None.
