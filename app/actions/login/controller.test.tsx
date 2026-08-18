import { describe, it } from "node:test"

import * as assert from "remix/assert"

import {
  createAuthTestApp,
  createCsrfFormRequest,
  createSessionCookie,
  FakeUserDatabase,
  getCsrfForm,
  getResponseCookie,
  readSessionCookie,
  TEST_USER_PASSWORD,
  TEST_USER_PASSWORD_HASH,
} from "../../../test/auth.ts"
import { createLoginThrottle } from "../../middleware/auth.ts"
import { routes } from "../../routes.ts"

const user = {
  id: "user-1",
  username: "renter",
  email: "renter@example.com",
  password: TEST_USER_PASSWORD_HASH,
  createdAt: new Date("2026-08-17T00:00:00.000Z"),
  updatedAt: new Date("2026-08-17T00:00:00.000Z"),
}

describe("login", () => {
  it("rejects missing and invalid CSRF tokens", async () => {
    let credentials = { email: "missing@example.com", password: "incorrect-password" }
    let missingApp = createAuthTestApp()
    let missing = await missingApp.router.fetch(
      formRequest(routes.login.action.href(), credentials),
    )

    let invalidApp = createAuthTestApp()
    let invalidCookie = await createSessionCookie(invalidApp, (session) =>
      session.set("_csrf", "expected-token"),
    )
    let invalid = await invalidApp.router.fetch(
      formRequest(
        routes.login.action.href(),
        { ...credentials, _csrf: "invalid-token" },
        invalidCookie,
      ),
    )

    assert.equal(missing.status, 403)
    assert.equal(invalid.status, 403)
  })

  it("renders the guest login page", async () => {
    let app = createAuthTestApp()
    let response = await app.router.fetch(request(routes.login.index.href()))
    let html = await response.text()

    assert.equal(response.status, 200)
    assert.match(html, /Sign in to wtf\.rent/)
    assert.match(html, /<form[^>]*rmx-document/)
    assert.match(html, /name="_csrf"/)
    assert.match(html, /name="email"/)
    assert.match(html, /name="password"/)
  })

  it("returns accessible validation errors without echoing passwords", async () => {
    let app = createAuthTestApp()
    let form = await createCsrfFormRequest(app, routes.login.action.href(), {
      email: "not-an-email",
      password: "super-secret-password",
    })
    let response = await app.router.fetch(form.request)
    let html = await response.text()

    assert.equal(response.status, 422)
    assert.match(html, /aria-invalid="true"/)
    assert.doesNotMatch(html, /super-secret-password/)
  })

  it("rejects unknown users without a fallback hash and preserves the generic error", async () => {
    let knownUserApp = createAuthTestApp({ database: new FakeUserDatabase([user]) })
    let wrongPasswordForm = await createCsrfFormRequest(knownUserApp, routes.login.action.href(), {
      email: user.email,
      password: "incorrect-password",
    })
    let wrongPassword = await knownUserApp.router.fetch(wrongPasswordForm.request)
    let unknownUserApp = createAuthTestApp()
    let unknownUserForm = await createCsrfFormRequest(unknownUserApp, routes.login.action.href(), {
      email: "missing@example.com",
      password: "incorrect-password",
    })
    let unknownUser = await unknownUserApp.router.fetch(unknownUserForm.request)

    assert.equal(wrongPassword.status, 422)
    assert.equal(unknownUser.status, 422)
    assert.match(await wrongPassword.text(), /Invalid email or password\./)
    assert.match(await unknownUser.text(), /Invalid email or password\./)
  })

  it("throttles repeated failures with Retry-After", async () => {
    let throttle = createLoginThrottle({ maxAttempts: 2, windowMs: 30_000 })
    let app = createAuthTestApp({ loginThrottle: throttle })
    let credentials = { email: "missing@example.com", password: "incorrect-password" }
    let form = await getCsrfForm(app, routes.login.index.href())
    let values = { ...credentials, _csrf: form.token }

    assert.equal(
      (await app.router.fetch(formRequest(routes.login.action.href(), values, form.cookie))).status,
      422,
    )
    assert.equal(
      (await app.router.fetch(formRequest(routes.login.action.href(), values, form.cookie))).status,
      422,
    )

    let throttled = await app.router.fetch(
      formRequest(routes.login.action.href(), values, form.cookie),
    )
    assert.equal(throttled.status, 429)
    assert.equal(throttled.headers.get("Retry-After"), "30")
  })

  it("rotates the session and redirects safely after successful login", async () => {
    let database = new FakeUserDatabase([user])
    let app = createAuthTestApp({ database })
    let oldCookie = await createSessionCookie(app, (session) => session.set("marker", "before"))
    let pathname = routes.login.action.href(undefined, {
      searchParams: { returnTo: routes.directory.href() },
    })
    let form = await createCsrfFormRequest(
      app,
      pathname,
      { email: `  ${user.email.toUpperCase()}  `, password: TEST_USER_PASSWORD },
      oldCookie,
    )
    let response = await app.router.fetch(form.request)

    assert.equal(response.status, 303)
    assert.equal(response.headers.get("Location"), routes.directory.href())

    let newCookie = getResponseCookie(response)
    assert.notEqual(newCookie, form.cookie)
    let session = await readSessionCookie(app, newCookie)
    assert.deepEqual(session.get("auth"), { userId: user.id })
  })

  it("ignores external return paths and redirects authenticated users away", async () => {
    let database = new FakeUserDatabase([user])
    let app = createAuthTestApp({ database })
    let form = await createCsrfFormRequest(app, "/login?returnTo=https://evil.example", {
      email: user.email,
      password: TEST_USER_PASSWORD,
    })
    let response = await app.router.fetch(form.request)
    assert.equal(response.headers.get("Location"), routes.profile.href())

    let authCookie = getResponseCookie(response)
    let guestOnlyResponse = await app.router.fetch(request(routes.login.index.href(), authCookie))
    assert.equal(guestOnlyResponse.status, 303)
    assert.equal(guestOnlyResponse.headers.get("Location"), routes.home.href())
  })
})

function request(pathname: string, cookie?: string): Request {
  let headers = new Headers()
  if (cookie) headers.set("Cookie", cookie)
  return new Request(new URL(pathname, "http://localhost"), { headers })
}

function formRequest(pathname: string, values: Record<string, string>, cookie?: string): Request {
  let headers = new Headers()
  if (cookie) headers.set("Cookie", cookie)

  let formData = new FormData()
  for (let [name, value] of Object.entries(values)) formData.set(name, value)

  return new Request(new URL(pathname, "http://localhost"), {
    method: "POST",
    headers,
    body: formData,
  })
}
