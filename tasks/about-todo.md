# Public About Page Task Checklist

Status: Approved on 2026-08-18

Approved contract: [`SPEC-about-page.md`](../SPEC-about-page.md)

Approved implementation plan: [`about-plan.md`](./about-plan.md)

## Task 1: Render the complete public About page

**Description:** Build the complete server-rendered `/about` path as one vertical slice, beginning
with a failing router test and ending with the approved static page and root-controller response.

**Acceptance criteria:**

- [ ] `GET /about` returns `200`, uses `About | wtf.rent`, marks About as the current navigation
      item, and renders the mission, record process, privacy comparison, publishing standards, and
      read-with-context sections.
- [ ] Native links lead to Feed, Directory, Rights, and the authenticated report form; the page uses
      one `<main>`, one `<h1>`, ordered headings, and semantic list/description markup.
- [ ] The route uses `DocumentWithShell` and route-owned static content without database access,
      external requests, forms, client entry, hydration, or changes to `app/routes.ts`.

**Verification:**

- [ ] Observe the focused controller test fail against the existing `404` placeholder before
      implementation.
- [ ] `pnpm test -- app/actions/controller.test.tsx`
- [ ] `pnpm typecheck && pnpm build && git diff --check`

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

- [ ] Copy states that valid reports publish immediately, report text and approved metadata are
      public, the dedicated street-address field and account data stay outside public queries/pages,
      and contributors must remove unit and third-party private details from public text.
- [ ] Copy describes reports as firsthand accounts that may be incomplete or disputed and do not
      prove a legal violation or replace local research and qualified help.
- [ ] HTML makes no claim of anonymity, automatic redaction, independent verification,
      pre-publication review, legal advice, editing, flagging, self-service deletion, or another
      unimplemented workflow; it contains no external destination, form control, or geolocation path.

**Verification:**

- [ ] Add each adversarial boundary assertion first and confirm it fails when the safeguard is
      absent before making the smallest copy or presentation correction.
- [ ] `pnpm test -- app/actions/controller.test.tsx`
- [ ] Inspect the handler imports and rendered HTML; run `pnpm typecheck && git diff --check`.

**Dependencies:** Task 1.

**Files likely touched:**

- `app/actions/controller.test.tsx`
- `app/actions/about/page.tsx`

**Estimated scope:** Small — 2 files.

## Checkpoint: Complete server contract

- [ ] The focused controller suite passes.
- [ ] Typecheck and build pass.
- [ ] The route is useful without JavaScript and has no database, external-service, or personal-data
      path.
- [ ] Review every visible product claim against `SPEC-reports.md` and the approved About spec.

## Task 3: Verify responsiveness and publish the final stacked PR

**Description:** Complete repository-wide and real-browser review, correct only verified issues,
record evidence, create signed-off Conventional Commits, and publish the final draft stacked PR.

**Acceptance criteria:**

- [ ] At 320, 768, 1024, and 1440 CSS pixels the page has correct landmarks and heading order,
      readable measure, visible keyboard focus, usable links, no horizontal overflow, successful
      document/assets, and a clean console.
- [ ] Full tests, typecheck, build, lint, format, Remix routes, Remix Doctor, and patch hygiene pass;
      every remaining diff belongs to the approved About capability.
- [ ] Focused signed-off commits are published from `logan/codex-about-page`, and its draft PR is
      based on `logan/codex-rights-page` with the exact Rights head as its merge base.

**Verification:**

- [ ] `pnpm test && pnpm typecheck && pnpm build`
- [ ] `pnpm exec oxlint . && pnpm exec oxfmt --check .`
- [ ] `pnpm exec remix routes && pnpm exec remix doctor && git diff --check`
- [ ] Real-browser keyboard, console, network, semantic, and overflow inspection at all four widths.
- [ ] Inspect the staged diff and secret scan, then verify the remote PR diff and stack metadata.

**Dependencies:** Tasks 1 and 2 plus the complete-server-contract checkpoint.

**Files likely touched:**

- `tasks/about-todo.md`
- Only implementation files requiring a verified corrective change

**Estimated scope:** Small to medium — 1 to 5 files.

## Checkpoint: Ready for review

- [ ] Every approved spec success criterion has evidence.
- [ ] Every task and verification item above is checked with recorded evidence.
- [ ] No dependency, schema, environment, external-service, or personal-data change exists.
- [ ] The final draft stacked PR is open and ready for human review.
