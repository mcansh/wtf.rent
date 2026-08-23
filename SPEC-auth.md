# Spec: Credentials Authentication

## Objective

Finish the existing Remix 3 email/password authentication migration so a renter can create an
account, sign in, stay signed in with a hardened cookie-backed session, access protected routes,
and sign out.

The feature serves two user states:

- Guests can browse public pages and can join or sign in.
- Authenticated users can reach their profile and authenticated post actions, and can sign out.

This scope completes the existing credentials flow. OAuth, magic links, email verification,
password reset, roles, and account deletion are intentionally out of scope.

## Tech Stack

- Node.js 24+
- TypeScript 7
- Remix 3 (`remix@3.0.0-beta.6`)
- PostgreSQL through `remix/data-table`
- `@node-rs/bcrypt` for password hashing and verification
- `remix/session` and `remix/middleware/auth` for session-backed identity
- Remix server-rendered components and Tailwind CSS 4 for the forms

No new runtime dependency or database migration is expected.

## Commands

- Install: `pnpm install --frozen-lockfile`
- Develop: `pnpm dev`
- Build CSS: `pnpm build`
- Test: `pnpm test`
- Typecheck: `pnpm typecheck`
- Lint check: `pnpm exec oxlint .`
- Dependency audit: `pnpm audit`

## Project Structure

- `app/routes.ts` — typed login, join, logout, profile, and post route contract
- `app/actions/login/` — login GET/POST controller and route-owned form UI
- `app/actions/join/` — registration GET/POST controller and route-owned form UI
- `app/actions/controller.tsx` — top-level POST-only logout, profile protection, and public-page
  responses
- `app/actions/post/` — action-level protection for post mutations
- `app/middleware/auth.ts` — credential verification, current-user resolution, safe return URLs,
  guest/auth guards, and auth throttling
- `app/middleware/session.ts` — hardened cookie and session lifecycle
- `app/ui/` — shared authenticated/guest navigation and auth-page presentation only when reused
- `app/**/*.test.ts(x)` — colocated unit and router-level auth tests
- `test/auth.ts` — shared isolated auth-router/database fixtures

Route-owned code stays beside its controller. Shared request-lifecycle behavior stays in
`app/middleware/`; shared cross-route presentation stays in `app/ui/`.

## Code Style

Use the Remix route contract for every internal URL, validate form data at the boundary, and
return an explicit response for every expected result:

```tsx
let parsed = s.parseSafe(loginSchema, context.formData)

if (!parsed.success) {
  return context.render(<LoginPage issues={parsed.issues} />, { status: 422 })
}

let user = await verifyCredentials(passwordProvider, context)
if (user == null) {
  return context.render(<LoginPage error="Invalid email or password." />, { status: 422 })
}

context.session.regenerateId(true)
context.session.set("auth", { userId: user.id })
return redirect(getPostAuthRedirect(context.url), 303)
```

- Use `let` for local bindings, matching the repository style.
- Import Remix APIs from subpaths, never from a top-level `remix` entry.
- Use semantic form elements, visible labels, focus styles, and linked error messages.
- Never retain or render a submitted password.
- Keep expected auth failures out of exception control flow and application logs.

## Authentication Contract

### Registration

- `GET /join` renders the registration form for guests and redirects authenticated users home.
- `POST /join` accepts username, email, password, and password confirmation.
- Username is trimmed and must be 3–20 characters.
- Email is trimmed, lowercased, syntactically valid, and bounded in length.
- Password must be 8–128 characters and match its confirmation.
- The password is hashed before the user row is written.
- Duplicate email or username races return a field-level `422` response without leaking database
  details.
- Success regenerates the session, stores only the user id in auth state, and redirects to a safe
  `returnTo` path or `/` with `303 See Other`.

### Login

- `GET /login` renders the login form for guests and redirects authenticated users home.
- `POST /login` accepts normalized email and password.
- Invalid input returns field-level validation errors with `422`.
- Unknown email and incorrect password use the same generic message and status.
- Repeated failed attempts are throttled per client/email tuple with a bounded, single-process
  limiter; a throttled attempt returns `429` and `Retry-After`.
- Success regenerates the session, stores only the user id, resets the relevant throttle state,
  and redirects to a safe `returnTo` path or `/profile` with `303 See Other`.

### Session and Logout

- The session cookie is signed, `HttpOnly`, `SameSite=Lax`, scoped to `/`, and `Secure` in
  production.
- Session secrets continue to be required from the environment and are never given a production
  fallback.
- Login, registration, and logout regenerate the session id to prevent fixation.
- `POST /logout` clears auth state, regenerates the session, and redirects home with `303`.
- Logout is not performed by `GET`.

### Authorization and Navigation

- `/profile` requires an authenticated user.
- Post create/new/edit/update/delete actions require an authenticated user; public post reads may
  remain public.
- A guest hitting a protected route is redirected to `/login?returnTo=...`.
- `returnTo` accepts only same-origin absolute paths beginning with one `/`; protocol-relative and
  external URLs are ignored.
- Shared navigation presents Join/Sign in to guests and Profile/Sign out to authenticated users.

### Request Integrity

- Every auth form is server-rendered and works without client JavaScript.
- Cookie-backed state-changing forms use Remix CSRF protection.
- Form values and cookies are treated as untrusted input.
- Responses do not disclose hashes, credential existence through login wording, stack traces, or
  internal database errors.

## Threat Model

### Trust boundaries and assets

- Boundaries: registration/login form data, `returnTo` query values, session cookies, forwarded
  client addresses, and PostgreSQL errors/results.
- Assets: passwords, password hashes, authenticated sessions, user identity, and protected writes.

### Abuse cases and controls

- Credential stuffing and brute force → generic failures, bcrypt verification, bounded throttling,
  and `Retry-After`.
- Session fixation or stolen browser-readable tokens → session regeneration and `HttpOnly` cookies.
- Cross-site form submission → `SameSite=Lax` plus synchronizer-token CSRF checks.
- Open redirect → strict same-origin path validation.
- Account-enumeration through response copy → identical response for unknown user and wrong
  password.
- Account-enumeration through login timing → accepted risk: unknown accounts return before
  bcrypt; bounded throttling remains the mitigating control.
- Duplicate registration race → database uniqueness remains authoritative and is translated into a
  safe `422` response.
- Unauthorized writes → server-side auth middleware on every protected action.
- Sensitive-data exposure → password values are neither re-rendered nor logged; user records are
  not serialized into client entry props.

The initial throttle is process-local because this repository has no shared cache. It is a defense
for a single app process, not a distributed rate-limit guarantee; a shared store or edge limiter is
required before horizontally scaling the app.

## Testing Strategy

- Unit tests cover email normalization, auth-session parsing, safe `returnTo` handling, and throttle
  boundaries.
- Router/controller tests cover registration, duplicate registration, successful and failed login,
  throttling, guest-only redirects, logout, session rotation, and protected-route redirects.
- Tests use isolated in-memory session storage and a fake or test database; they do not require a
  developer database or real secrets.
- Response assertions cover status, `Location`, `Set-Cookie`, `Retry-After`, generic error text, and
  absence of submitted passwords.
- Manual browser verification covers keyboard navigation, error announcement, responsive layouts
  at 320/768/1024/1440 px, cookie flags, and authenticated navigation state.

## Boundaries

- Always: validate untrusted input, hash passwords, rotate sessions, use generic login errors,
  authorize protected actions on the server, preserve user-owned migration work, and run all
  verification commands.
- Ask first: add OAuth or email delivery, add a dependency, change the user schema, add roles,
  introduce distributed rate-limit infrastructure, or alter account-retention policy.
- Never: commit secrets, store plaintext passwords or auth tokens in browser storage, log passwords
  or session contents, trust client-side validation, accept external `returnTo` URLs, or weaken
  security headers to make auth work.

## Success Criteria

- A guest can register with valid unique credentials, receives a rotated authenticated session,
  and lands at the approved destination.
- A guest can sign in with valid credentials; invalid credentials return the same safe `422` error
  and never echo the password.
- Failed login bursts cross a deterministic limit and return `429` with `Retry-After`.
- Duplicate registration returns accessible field errors without a stack trace or raw database
  message.
- Authenticated users are redirected away from login/join, can visit `/profile`, see authenticated
  navigation, and can sign out only through POST.
- Guests requesting protected routes are redirected to login and return safely after authentication.
- Unsafe `returnTo` values cannot redirect off-site.
- Auth forms are keyboard-usable, labeled, responsive, and work with JavaScript disabled.
- Cookie flags and CSRF behavior are verified.
- `pnpm build`, `pnpm test`, `pnpm typecheck`, and `pnpm exec oxlint .` pass. `pnpm audit` completes
  with no unmitigated reachable high/critical issue or has an explicitly documented external
  environment blocker.

## Resolved Decisions

- Approved on 2026-08-17: credentials-only auth, a fixed 30-day cookie lifetime, and a
  process-local login throttle for the current single-process deployment.
