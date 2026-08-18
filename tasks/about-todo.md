# Public About Page Task Checklist

Status: Approved on 2026-08-18

Approved contract: [`SPEC-about-page.md`](../SPEC-about-page.md)

Approved implementation plan: [`about-plan.md`](./about-plan.md)

## Task 1: Render the complete public About page

**Description:** Build the complete server-rendered `/about` path as one vertical slice, beginning
with a failing router test and ending with the approved static page and root-controller response.

**Acceptance criteria:**

- [x] `GET /about` returns `200`, uses `About | wtf.rent`, marks About as the current navigation
      item, and renders the mission, record process, privacy comparison, publishing standards, and
      read-with-context sections.
- [x] Native links lead to Feed, Directory, Rights, and the authenticated report form; the page uses
      one `<main>`, one `<h1>`, ordered headings, and semantic list/description markup.
- [x] The route uses `DocumentWithShell` and route-owned static content without database access,
      external requests, forms, client entry, hydration, or changes to `app/routes.ts`.

**Verification:**

- [x] Observe the focused controller test fail against the existing `404` placeholder before
      implementation.
- [x] `pnpm test -- app/actions/controller.test.tsx`
- [x] `pnpm typecheck && pnpm build && git diff --check`

**Evidence (2026-08-18):** The focused test first failed only because `/about` returned `404`. After
implementation, the controller suite passed 103/103 tests. Typecheck, Tailwind build, targeted
Oxlint, targeted Oxfmt, and `git diff --check` also passed.

**Dependencies:** None.

**Files likely touched:**

- `app/actions/controller.test.tsx`
- `app/actions/controller.tsx`
- `app/actions/about/page.tsx`

**Estimated scope:** Medium — 3 files.

## Task 2: Lock truthful publishing and privacy boundaries

**Description:** Add adversarial rendered-HTML assertions and refine copy only where necessary so
future edits cannot overstate verification, moderation, legal meaning, or personal-data handling.

**Acceptance criteria:**

- [x] Copy states that valid reports publish immediately, report text and approved metadata are
      public, the dedicated street-address field and account data stay outside public queries/pages,
      and contributors must remove unit and third-party private details from public text.
- [x] Copy describes reports as firsthand accounts that may be incomplete or disputed and do not
      prove a legal violation or replace local research and qualified help.
- [x] HTML makes no claim of anonymity, automatic redaction, independent verification,
      pre-publication review, legal advice, editing, flagging, self-service deletion, or another
      unimplemented workflow; it contains no external destination, form control, or geolocation path.

**Verification:**

- [x] Add each adversarial boundary assertion first and confirm it fails when the safeguard is
      absent before making the smallest copy or presentation correction.
- [x] `pnpm test -- app/actions/controller.test.tsx`
- [x] Inspect the handler imports and rendered HTML; run `pnpm typecheck && git diff --check`.

**Evidence (2026-08-18):** The adversarial test first failed on the absent independent-verification
boundary. After adding one explicit reading-context paragraph, the controller suite passed 104/104
tests. The rendered-main assertions cover immediate publication, public and private fields,
contributor removal duties, legal meaning, prohibited workflow claims, external destinations, form
controls, and geolocation/client-entry paths. Typecheck, Tailwind build, targeted Oxlint, targeted
Oxfmt, and `git diff --check` passed.

**Dependencies:** Task 1.

**Files likely touched:**

- `app/actions/controller.test.tsx`
- `app/actions/about/page.tsx`

**Estimated scope:** Small — 2 files.

## Checkpoint: Complete server contract

- [x] The focused controller suite passes.
- [x] Typecheck and build pass.
- [x] The route is useful without JavaScript and has no database, external-service, or personal-data
      path.
- [x] Review every visible product claim against `SPEC-reports.md` and the approved About spec.

**Checkpoint evidence (2026-08-18):** `/about` imports only the Remix UI handle type and typed local
routes. Its rendered page contains no form control, client entry, external URL, database call, or
geolocation path. All visible publication, report metadata, address, account-data, and legal-safety
claims match the approved About and reports specifications.

## Task 3: Verify responsiveness and publish the final stacked PR

**Description:** Complete repository-wide and real-browser review, correct only verified issues,
record evidence, create signed-off Conventional Commits, and publish the final draft stacked PR.

**Acceptance criteria:**

- [x] At 320, 768, 1024, and 1440 CSS pixels the page has correct landmarks and heading order,
      readable measure, visible keyboard focus, usable links, no horizontal overflow, successful
      document/assets, and a clean console.
- [x] Full tests, typecheck, build, lint, format, Remix routes, Remix Doctor, and patch hygiene pass;
      every remaining diff belongs to the approved About capability.
- [ ] Focused signed-off commits are published from `logan/codex-about-page`, and its draft PR is
      based on `logan/codex-rights-page` with the exact Rights head as its merge base.

**Verification:**

- [x] `pnpm test && pnpm typecheck && pnpm build`
- [x] `pnpm exec oxlint . && pnpm exec oxfmt --check .`
- [x] `pnpm exec remix routes && pnpm exec remix doctor && git diff --check`
- [x] Real-browser keyboard, console, network, semantic, and overflow inspection at all four widths.
- [ ] Inspect the staged diff and secret scan, then verify the remote PR diff and stack metadata.

**Dependencies:** Tasks 1 and 2 plus the complete-server-contract checkpoint.

**Files likely touched:**

- `tasks/about-todo.md`
- Only implementation files requiring a verified corrective change

**Estimated scope:** Small to medium — 1 to 5 files.

**Local verification evidence (2026-08-18):** The full suite passed 104/104 tests; typecheck,
Tailwind build, repository-wide Oxlint, Oxfmt across 102 files, Remix routes, `git diff --check`, and
Remix Doctor all passed, with Doctor reporting zero warnings and zero advice. Isolated Playwright
checks at 320, 768, 1024, and 1440 CSS pixels found exact viewport/scroll-width matches, one main,
one h1, five sections, ordered h1/h2 headings, logical desktop and mobile-menu focus order, visible
focus outlines, successful document/assets, and zero console errors or warnings. Final review moved
the decorative step numbers inside their terms, confirmed each process group contains only `DT` and
`DD`, normalized the last checklist divider, and raised both standalone text-link targets to 44px.

## Checkpoint: Ready for review

- [ ] Every approved spec success criterion has evidence.
- [ ] Every task and verification item above is checked with recorded evidence.
- [x] No dependency, schema, environment, external-service, or personal-data change exists.
- [ ] The final draft stacked PR is open and ready for human review.
