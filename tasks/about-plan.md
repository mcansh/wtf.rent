# Public About Page Implementation Plan

Status: Approved on 2026-08-18

Approved contract: [`SPEC-about-page.md`](../SPEC-about-page.md)

Stack base: `logan/codex-report-editing-comments` / draft PR #30

Target branch: `logan/codex-about-page`

## Overview

Replace the existing `/about` placeholder with one static, server-rendered page that explains the
product mission, report lifecycle, public/private boundary, contributor standards, and responsible
reading guidance. The implementation reuses the shared shell and typed routes, performs no data
access, and makes no product or legal claim beyond behavior already implemented and documented.

## Dependency Map

| Component          | Responsibility                                                             | Depends on                         |
| ------------------ | -------------------------------------------------------------------------- | ---------------------------------- |
| About route tests  | Define the rendered content, navigation, link, and truthfulness contract   | Approved About spec                |
| About page         | Render the semantic static content and responsive presentation             | Test contract and shared UI system |
| Root About handler | Return the page through `DocumentWithShell` with the approved title        | About page                         |
| Safety assertions  | Reject forms, data access, external destinations, and unimplemented claims | Complete server response           |
| Verification       | Prove accessibility, responsiveness, regression safety, and stack metadata | All implementation                 |

## Architecture Decisions

- Keep all About-specific content and presentation in `app/actions/about/page.tsx`; a single static
  route does not justify a data module, shared component abstraction, or client entrypoint.
- Use native anchors generated from `routes` for Feed, Directory, Rights, and the report form.
- Render public/private behavior as semantic paired descriptions that stack cleanly on narrow
  screens instead of relying on a horizontally scrollable comparison table.
- Assert user-visible outcomes through the root router test harness rather than testing JSX
  implementation details in isolation.
- Keep the handler synchronous apart from the controller contract: it does not call the database,
  session mutation, external services, or browser APIs.

## Implementation Order

### 1. Establish the complete route-to-HTML contract

- Add a focused controller test for `GET /about` before changing the placeholder.
- Require `200`, `About | wtf.rent`, current About navigation, the five approved content areas, and
  native links to Feed, Directory, Rights, and the report form.
- Confirm the test fails against the current `404` response.

Checkpoint: the failing test names the complete public behavior before page code exists.

### 2. Render the static About page

- Add `app/actions/about/page.tsx` using one `<main>`, one `<h1>`, ordered section headings,
  semantic lists/descriptions, and existing paper/ink/acid/coral/blue design tokens.
- Replace only the root About placeholder with `DocumentWithShell` and the approved title.
- Include exact, plain-language disclosure of immediate publication, public report text and
  username/location metadata, the dedicated private street-address boundary, contributor duties,
  unverified-account context, and the absence of a legal conclusion.
- Keep the page database-free, form-free, external-link-free, and fully useful without JavaScript.

Checkpoint: the focused controller suite passes and the rendered source matches every approved
content and navigation requirement.

### 3. Prove truthfulness and privacy boundaries

- Add adversarial assertions that the HTML does not claim anonymity, automatic redaction,
  independent verification, pre-publication review, legal advice, or available editing, flagging,
  and self-service deletion workflows.
- Assert that the response contains no form controls, external URL, geolocation behavior, street
  address value, account credential, or client entrypoint.
- Inspect the handler and imports to confirm no database or external-service path was introduced.

Checkpoint: controller coverage would fail if future copy overstates product behavior or weakens the
approved public/private explanation.

### 4. Verify and publish the final stacked PR

- Run the full test, typecheck, build, lint, format, route, Doctor, and patch checks.
- Run isolated real-browser inspection at 320, 768, 1024, and 1440 CSS pixels for keyboard focus,
  landmarks, heading order, link usability, readable measure, horizontal overflow, network
  responses, and console output.
- Review the complete branch diff across correctness, readability, architecture, security, and
  performance; inspect staged content and scan it for secret-like material.
- Create focused signed-off Conventional Commits, publish `logan/codex-about-page`, and open a draft
  PR based on `logan/codex-rights-page`.

Checkpoint: the remote merge base is the exact Rights head and the PR diff contains only the
approved About contract, plan/evidence, page, handler, and tests.

## Sequential Work and Parallelization

Implementation remains sequential. The root router test defines the response contract; the page and
handler satisfy it; adversarial assertions depend on the complete rendered response; and publication
depends on final verification. Static checks may run concurrently after implementation, while
browser inspection uses one isolated server and one named browser session.

## Risks and Mitigations

| Risk                                                      | Mitigation                                                                                  |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| Copy promises behavior the product does not implement     | Derive every claim from `SPEC-reports.md` and lock prohibited claims with adversarial tests |
| Privacy wording implies the whole report body is redacted | Separate the dedicated address field from contributor-authored public text                  |
| Dense disclosure becomes unreadable on mobile             | Use stacked semantic descriptions, short sections, and browser checks at four widths        |
| Static copy drifts from report behavior later             | Keep exact lifecycle/privacy assertions in the root controller suite                        |
| The final stacked PR repeats Rights changes               | Publish from PR #27's verified remote head and require an exact merge-base comparison       |

## Verification Commands

- Focused test: `pnpm test -- app/actions/controller.test.tsx`
- Full tests: `pnpm test`
- Typecheck: `pnpm typecheck`
- Build: `pnpm build`
- Lint: `pnpm exec oxlint .`
- Format: `pnpm exec oxfmt --check .`
- Remix checks: `pnpm exec remix routes` and `pnpm exec remix doctor`
- Patch hygiene: `git diff --check`

## Rollback

Revert the About feature commits to restore the standard placeholder. No data, schema, dependency,
environment, session, external-service, or stored-content cleanup is required.

## Open Questions

None. The approved spec resolves the content and privacy contract; legal-policy and moderation
capabilities remain explicitly outside this PR.
