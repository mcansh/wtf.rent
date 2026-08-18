# Authentication Task Checklist

- [x] Task 1: Add isolated router construction and response-preservation tests
  - Acceptance: Tests can inject database/session dependencies without a live database or real
    secret, production still fails fast, and secure-header wrapping preserves redirects/errors.
  - Verify: `pnpm test -- app/router.test.ts`; `pnpm typecheck`.
  - Files: `app/env.ts`, `app/middleware/database.ts`, `app/router.ts`, `app/router.test.ts`,
    `test/auth.ts`.

- [x] Task 2: Harden auth helpers and add failed-login throttling
  - Acceptance: Email and return paths normalize safely; guest protection works; the bounded
    throttle records, expires, reports retry time, and resets deterministically; missing users
    receive dummy bcrypt work.
  - Verify: `pnpm test -- app/middleware/auth.test.ts`; `pnpm typecheck`.
  - Files: `app/bcrypt.ts`, `app/middleware/auth.ts`, `app/middleware/auth.test.ts`,
    `app/router.ts`, `test/auth.ts`.

- [x] Task 3: Implement and test the login vertical slice
  - Acceptance: Guest GET renders; invalid or incorrect credentials return accessible generic
    `422` responses without passwords; bursts return `429`; success rotates auth state and returns
    a safe `303` redirect; authenticated users are redirected away.
  - Verify: `pnpm test -- app/actions/login/controller.test.tsx`; `pnpm typecheck`.
  - Files: `app/actions/login/controller.tsx`, `app/actions/login/controller.test.tsx`,
    `app/ui/auth-form.tsx`, `test/auth.ts`.

- [x] Task 4: Implement and test the registration vertical slice
  - Acceptance: Inputs are normalized and bounded; passwords match and are hashed; known duplicate
    constraints return safe field errors; success rotates auth state and redirects safely; no
    password is echoed.
  - Verify: `pnpm test -- app/actions/join/controller.test.tsx`; `pnpm typecheck`.
  - Files: `app/actions/join/controller.tsx`, `app/actions/join/controller.test.tsx`,
    `app/ui/auth-form.tsx`, `test/auth.ts`.

- [x] Task 5: Make logout POST-only and protect profile
  - Acceptance: Logout clears and rotates the session; profile requires auth and renders the
    current user.
  - Verify: `pnpm test -- app/actions/controller.test.tsx`; `pnpm typecheck`.
  - Files: `app/routes.ts`, `app/router.ts`, `app/actions/controller.tsx`,
    `app/actions/controller.test.tsx`.

- [x] Task 6: Protect post mutations while keeping public reads public
  - Acceptance: Post create/new/edit/update/destroy redirect guests to login with a safe return
    path; post show remains public.
  - Verify: `pnpm test -- app/actions/post/controller.test.tsx`; `pnpm typecheck`.
  - Files: `app/actions/post/controller.tsx`, `app/actions/post/controller.test.tsx`.

- [x] Task 7: Add synchronizer-token CSRF to auth mutations
  - Acceptance: Login and registration reject absent/invalid tokens and accept tokens obtained from
    their real GET/session-cookie round trip.
  - Verify: `pnpm test -- app/actions/login/controller.test.tsx app/actions/join/controller.test.tsx`;
    `pnpm typecheck`.
  - Files: `app/router.ts`, `app/actions/login/controller.tsx`,
    `app/actions/login/controller.test.tsx`, `app/actions/join/controller.tsx`,
    `app/actions/join/controller.test.tsx`.

- [x] Task 8: Add session-aware navigation and a CSRF-protected logout form
  - Acceptance: Guest navigation shows Join/Sign in; authenticated navigation shows Profile and a
    POST Sign out form containing the active CSRF token; both states remain accessible and
    responsive.
  - Verify: `pnpm test -- app/actions/controller.test.tsx`; `pnpm typecheck`.
  - Files: `app/ui/shell.tsx`, `app/actions/controller.test.tsx`.

- [x] Task 9: Complete automated, security, and browser verification
  - Acceptance: Every approved success criterion is verified or has a reported external blocker;
    the final diff contains no secret or unrelated edit.
  - Verify: `pnpm build`; `pnpm test`; `pnpm typecheck`; `pnpm exec oxlint .`;
    `pnpm audit`; browser checks at 320/768/1024/1440 px.
  - Files: `SPEC-auth.md`, `tasks/plan.md`, `tasks/todo.md` (status/evidence only).
  - Evidence: Build passed; 33/33 tests passed; typecheck, Oxlint, Oxfmt, route validation,
    Remix Doctor, and `git diff --check` passed. Browser checks at 320/768/1024/1440 px found
    no horizontal overflow or console/network errors. A real development-database journey covered
    join, profile, logout, login, and authenticated redirects; its temporary user was deleted.
  - External blocker: `pnpm audit` could not resolve the configured registry from the sandbox. The
    required elevated retry was rejected because it would disclose dependency metadata externally.
