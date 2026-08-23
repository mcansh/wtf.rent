# Implementation Plan: Credentials Authentication

Approved contract: [`SPEC-auth.md`](../SPEC-auth.md)

## Current State

The Remix 3 migration already contains the user table, bcrypt helpers, signed cookie-session
configuration, an auth-resolution middleware, and route/controller placeholders. Login and logout
are stubs; registration bypasses the injected database, has incomplete failure handling, and does
not rotate the session; profile and post actions are not protected; and there are no auth tests.

The worktree contains a broad user-owned framework migration. Auth changes must stay narrow and
must not stage, revert, format, or commit unrelated files.

## Architecture

| Component                | Responsibility                                                                                                                                         | Depends on                             |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------- |
| Router test seam         | Build production and isolated test routers from injected database/session dependencies while preserving response status through secure-header wrapping | Existing middleware                    |
| Auth core                | Normalize credentials, verify passwords, validate safe return paths, resolve guest/auth guards, and throttle failed logins                             | Database and sessions                  |
| Login slice              | Validate credentials, render safe errors, rotate auth state, and redirect                                                                              | Router test seam and auth core         |
| Registration slice       | Validate/create users, translate uniqueness failures, rotate auth state, and redirect                                                                  | Router test seam and auth core         |
| Session/profile slice    | Make logout POST-only, protect profile, and render the authenticated profile                                                                           | Auth core                              |
| Post authorization slice | Protect every post mutation while retaining public reads                                                                                               | Auth core                              |
| Request-integrity slice  | Add synchronizer-token CSRF enforcement and tokens to every auth mutation form                                                                         | Sessions and all auth forms            |
| Shared auth UI           | Present accessible auth forms and guest/auth navigation in the existing visual system                                                                  | Login, registration, and session state |

Dependency order:

1. Router test seam
2. Auth core
3. Login and registration vertical slices
4. Logout and profile protection
5. Post-mutation protection
6. CSRF integration
7. Shared navigation
8. Full verification

Login and registration could be implemented independently after the auth core, but both touch the
same shared form UI and test harness. They will be done sequentially to avoid overlapping edits.

## Implementation Steps

### 1. Establish isolated router tests

- Export a router factory while retaining the production `router` export.
- Inject database, session cookie, session storage, and throttle dependencies in tests.
- Put shared fake-user storage and cookie round-trip helpers in `test/auth.ts`; keep behavior tests
  beside their owning controllers.
- Add test-only environment defaults so importing the router does not require a live database or
  real secret; production continues to fail fast.
- Preserve status, status text, and headers when secure headers wrap a response. This is required
  for auth redirects and `422`/`429` responses to survive middleware.
- Verify a fresh test router can render a page and preserve a redirect response without connecting
  to PostgreSQL.

Checkpoint: focused router tests, `pnpm typecheck`, and the existing schema tests pass.

### 2. Complete reusable auth primitives

- Bound and normalize email input consistently.
- Harden safe `returnTo` handling against external, protocol-relative, backslash-normalized, and
  control-character redirects.
- Add a guest-only guard for login/join.
- Add a bounded fixed-window failed-login throttle with deterministic clock injection, cleanup,
  reset-on-success, and `Retry-After` calculation.
- Keep credential failure timing closer by verifying against a fixed dummy bcrypt hash when no
  account exists.

Checkpoint: focused helper/throttle tests and typecheck pass.

### 3. Implement login as a server-first vertical slice

- Add boundary validation for email/password.
- Check throttle state before password work and record only failed attempts.
- Use `verifyCredentials()` and `completeAuth()` so successful login rotates the session.
- Render the same generic message for unknown email and wrong password.
- Preserve only the submitted email after an error; never preserve or log the password.
- Redirect to a validated `returnTo` or `/profile` with `303`.
- Render an accessible, responsive login page consistent with the existing paper/ink/acid design.

Checkpoint: login GET, validation failure, bad credentials, throttling, success, guest-only, and
safe-redirect tests pass.

### 4. Implement registration as a server-first vertical slice

- Normalize username/email and enforce all approved bounds.
- Read the injected database from request context instead of the production singleton.
- Hash the password and create the user with the existing schema.
- Translate known PostgreSQL email/username uniqueness constraints into safe field errors while
  rethrowing unknown failures.
- Use `completeAuth()` to rotate the session before writing auth state.
- Preserve only non-sensitive submitted values after validation/conflict responses.
- Reuse the accessible auth-page presentation without adding browser-only behavior.

Checkpoint: registration GET, validation, password mismatch, duplicate email/username, success,
guest-only, and safe-redirect tests pass.

### 5. Implement logout and profile authorization

- Change logout to a top-level POST leaf and handle it in the root controller, matching repository
  route ownership.
- Remove the now-obsolete nested logout controller mapping/file.
- Clear auth state and regenerate the session before a `303` home redirect.
- Protect `/profile`; render the authenticated user's own username/email without client
  serialization.
- Test guest redirects, authenticated access, and logout rotation.

Checkpoint: focused authorization tests, route listing, and typecheck pass.

### 6. Protect post mutations

- Add action-level authentication to post create/new/edit/update/destroy actions.
- Leave the public post show action unchanged.
- Verify each protected verb retains its original safe `returnTo` destination.

Checkpoint: focused post-controller tests and typecheck pass.

### 7. Integrate CSRF protection

- Add `csrf()` after form-data and session middleware.
- Put the session-backed `_csrf` token in login and registration forms.
- Test missing/invalid token rejection and valid token acceptance through the router.
- Verify header wrapping still preserves CSRF/auth response status and cookies.

Checkpoint: full auth tests and typecheck pass.

### 8. Add session-aware navigation

- Add Join/Sign in controls for guests.
- Add Profile and a POST Sign out form with the session-backed `_csrf` token for authenticated
  users.
- Keep the header keyboard-usable and readable at the approved responsive widths.
- Verify guest and authenticated HTML states without serializing the user into client props.

Checkpoint: focused shell/root-controller tests and typecheck pass.

### 9. Verify the finished feature

- Run format only on auth-owned files, then lint without auto-fixing unrelated files.
- Run build, full tests, typecheck, route diagnostics, and the package-manager audit.
- Start the app against the configured development database and exercise join, logout, login,
  protected profile, unsafe `returnTo`, duplicate registration, and throttle behavior.
- Inspect cookie flags, CSRF rejection, security headers, keyboard flow, focus/error semantics, and
  responsive layouts at 320/768/1024/1440 px.
- Review the final diff for secrets and unrelated worktree changes.

Checkpoint: every success criterion in `SPEC-auth.md` has evidence or a clearly reported external
environment blocker.

## Risks and Mitigations

| Risk                                                           | Mitigation                                                                                              |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Secure-header middleware currently rebuilds responses as `200` | Preserve the original status/status text and cover redirects/errors with tests before auth work         |
| Router imports production environment/database during tests    | Add explicit test defaults and dependency injection; never query the production singleton in auth tests |
| Cookie/CSRF tests become stateful                              | Construct a fresh router, storage, cookie, fake database, and throttle for each test                    |
| PostgreSQL adapter error shape leaks or changes                | Match only the stable SQLSTATE and the two known constraint names; rethrow everything else              |
| User enumeration through timing or copy                        | Use one generic message and a dummy bcrypt verification for missing users                               |
| Process-local throttling is bypassed across replicas           | Keep the limitation documented and replace it with edge/shared-store limiting before horizontal scale   |
| CSRF middleware blocks existing form tests                     | Add tokens through a real GET/session-cookie round trip and test rejection explicitly                   |
| Shared dirty worktree hides scope creep                        | Use path-scoped diffs and never stage/commit/revert unrelated migration files                           |

## Intentionally Unchanged

- OAuth, magic links, email verification, password reset, roles, and account deletion
- User/Post/Comment database schema and migrations
- Public post-read behavior and unfinished post CRUD responses
- Security-header policy beyond removing the ineffective fixed CSP nonce
- Distributed/edge rate-limit infrastructure
- Deployment topology beyond migration-command and environment-name consistency fixes
- CI structure beyond pnpm, supported-Node, workflow-reference, and default-branch consistency fixes
