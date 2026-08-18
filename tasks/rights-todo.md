# Public Renter Rights Guide Task Checklist

Status: Approved on 2026-08-18

Approved contract: [`SPEC-rights-page.md`](../SPEC-rights-page.md)

Approved implementation plan: [`rights-plan.md`](./rights-plan.md)

## Task 1: Render the reviewed renter-rights guide

**Description:** Build the complete server-rendered `/rights` path as one vertical slice, beginning
with failing router assertions and ending with the approved static resource contract, page, and
root-controller response.

**Acceptance criteria:**

- [x] `GET /rights` returns `200`, uses the title `Renter rights | wtf.rent`, marks Rights as the
      current navigation item, and renders the approved four-part guide.
- [x] Five typed, immutable resources expose their approved organization, title, purpose, scope,
      display domain, exact HTTPS URL, and the page-level `Last reviewed August 18, 2026` note.
- [x] The route uses `DocumentWithShell` and static route-owned data without database access,
      external requests, client entry, hydration, or changes to `app/routes.ts`.

**Verification:**

- [x] Observe the focused test fail against the existing `404` placeholder before implementation.
- [x] `pnpm test -- app/actions/controller.test.tsx`
- [x] `pnpm typecheck && pnpm build && git diff --check`

**Evidence:** The new router test first failed with `404 !== 200`. The route now renders the typed,
static guide through the shared shell with the approved title, navigation state, four sections,
review date, and five exact source destinations. All 101 tests, typecheck, production build,
targeted Oxlint, targeted Oxfmt, and patch checks pass; `app/routes.ts`, the database layer,
dependencies, and browser entrypoints remain unchanged.

**Dependencies:** None.

**Files likely touched:**

- `app/actions/controller.test.tsx`
- `app/actions/controller.tsx`
- `app/actions/rights/resources.ts`
- `app/actions/rights/page.tsx`

**Estimated scope:** Medium — 4 files.

## Task 2: Prove legal-safety and privacy boundaries

**Description:** Add adversarial router assertions around the rendered HTML and refine the static
copy or presentation until the approved scope remains explicit under test.

**Acceptance criteria:**

- [x] The page puts immediate-danger and time-sensitive local-help direction ahead of the longer
      resource list and prominently identifies itself as general educational information.
- [x] The guide distinguishes jurisdiction-neutral process from U.S.-specific resources and does
      not state a jurisdiction-specific deadline, guaranteed outcome, or prohibited self-help
      instruction.
- [x] HTML contains no form, location or address field, geolocation behavior, individualized
      outcome, street address, account data, or database-derived content.

**Verification:**

- [x] Add each boundary assertion first, confirm it fails when the required safeguard is absent,
      then make the smallest content or presentation change needed.
- [x] `pnpm test -- app/actions/controller.test.tsx`
- [x] Inspect the rendered source allowlist and prohibited-content assertions; run
      `pnpm typecheck && git diff --check`.

**Evidence:** The adversarial test first failed because the guide did not explicitly disclaim an
attorney-client relationship. The copy now adds that boundary and directs readers outside the
United States to local housing, consumer-protection, or legal-aid help. The test scopes inspection
to `<main>`, proves urgent guidance precedes the U.S. resource list, allows only the five reviewed
destinations, and rejects forms, location fields, geolocation, fixed-day deadlines, unsafe
self-help directives, and new-tab links. All 102 tests, typecheck, build, targeted lint, formatting,
and patch checks pass.

**Dependencies:** Task 1.

**Files likely touched:**

- `app/actions/controller.test.tsx`
- `app/actions/rights/resources.ts`
- `app/actions/rights/page.tsx`

**Estimated scope:** Medium — 3 files.

## Checkpoint: Complete server contract

- [x] The focused controller suite passes.
- [x] Typecheck and build pass.
- [x] The route is useful without JavaScript and has no database or personal-data path.
- [x] Review the rendered copy against the approved spec before responsive polish.

## Task 3: Verify responsiveness and publish the stacked PR

**Description:** Complete the repository-wide and real-browser quality pass, correct only verified
issues, record evidence, create a signed-off Conventional Commit, and publish the draft stacked PR.

**Acceptance criteria:**

- [x] At 320, 768, 1024, and 1440 CSS pixels the page has correct landmark and heading order,
      readable measure, visible keyboard focus, usable links, no horizontal overflow, and a clean
      console.
- [x] Full tests, typecheck, build, lint, format, Remix routes, Remix Doctor, and patch hygiene all
      pass; every remaining diff belongs to the approved Rights capability.
- [x] Focused signed-off commits are published from `logan/codex-rights-page`, and its draft PR is
      based on `logan/codex-directory-page` with the expected base/head relationship.

**Verification:**

- [x] `pnpm test && pnpm typecheck && pnpm build`
- [x] `pnpm exec oxlint . && pnpm exec oxfmt --check .`
- [x] `pnpm exec remix routes && pnpm exec remix doctor && git diff --check`
- [x] Real-browser keyboard, console, network, semantic, and overflow inspection at all four widths.
- [x] Inspect the staged diff and secret scan, then verify the remote PR diff and stack metadata.

**Evidence:** All 102 tests, typecheck, production build, repository-wide Oxlint, repository-wide
Oxfmt, Remix routes, Remix Doctor, and patch checks pass. Isolated Chromium review at 320, 768,
1024, and 1440 CSS pixels confirmed semantic headings and landmarks, readable responsive layouts,
working mobile-menu keyboard navigation with visible focus, successful static requests, no
horizontal overflow, and zero console errors or warnings. Full-page review at 1440 pixels found no
visual defects. The five-axis code review found no blocking issues.
The staged verification diff passed patch and secret-pattern scans. Draft PR #27 is mergeable and
targets `logan/codex-directory-page`; its merge base is the exact Directory head, its history is a
direct descendant of that head, and its seven-file diff contains only the approved Rights capability.

**Dependencies:** Tasks 1 and 2 plus the complete-server-contract checkpoint.

**Files likely touched:**

- `tasks/rights-todo.md`
- Only implementation files requiring a verified corrective change

**Estimated scope:** Small to medium — 1 to 5 files.

## Checkpoint: Ready for review

- [x] Every approved spec success criterion has evidence.
- [x] Every task and verification item above is checked with recorded evidence.
- [x] No dependency, schema, environment, external-service, or personal-data change exists.
- [x] The draft stacked PR is open and ready for human review.
