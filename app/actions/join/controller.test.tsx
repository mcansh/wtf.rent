import { describe, it } from "node:test"

import * as assert from "remix/assert"

import {
  createAuthTestApp,
  createCsrfFormRequest,
  createSessionCookie,
  FakeUserDatabase,
  getResponseCookie,
  readSessionCookie,
  TEST_USER_PASSWORD_HASH,
} from "../../../test/auth.ts"
import { verifyPassword } from "../../bcrypt.ts"
import { routes } from "../../routes.ts"

const existingUser = {
  id: "user-existing",
  username: "existing-renter",
  email: "existing@example.com",
  password: TEST_USER_PASSWORD_HASH,
  createdAt: new Date("2026-08-17T00:00:00.000Z"),
  updatedAt: new Date("2026-08-17T00:00:00.000Z"),
}

describe("join", () => {
  it("rejects missing and invalid CSRF tokens", async () => {
    let values = {
      username: "csrf-renter",
      email: "csrf@example.com",
      password: "valid-password",
      confirm_password: "valid-password",
    }
    let missingApp = createAuthTestApp()
    let missing = await missingApp.router.fetch(formRequest(routes.join.action.href(), values))

    let invalidApp = createAuthTestApp()
    let invalidCookie = await createSessionCookie(invalidApp, (session) =>
      session.set("_csrf", "expected-token"),
    )
    let invalid = await invalidApp.router.fetch(
      formRequest(routes.join.action.href(), { ...values, _csrf: "invalid-token" }, invalidCookie),
    )

    assert.equal(missing.status, 403)
    assert.equal(invalid.status, 403)
  })

  it("renders the guest registration page", async () => {
    let app = createAuthTestApp()
    let response = await app.router.fetch(request(routes.join.index.href()))
    let html = await response.text()

    assert.equal(response.status, 200)
    assert.match(html, /Create your account/)
    assert.match(html, /<form[^>]*rmx-document/)
    assert.match(html, /name="_csrf"/)
    assert.match(html, /name="username"/)
    assert.match(html, /name="confirm_password"/)
  })

  it("returns field errors without echoing passwords", async () => {
    let app = createAuthTestApp()
    let form = await createCsrfFormRequest(app, routes.join.action.href(), {
      username: "x",
      email: "not-an-email",
      password: "secret-password",
      confirm_password: "different-password",
    })
    let response = await app.router.fetch(form.request)
    let html = await response.text()

    assert.equal(response.status, 422)
    assert.match(html, /aria-invalid="true"/)
    assert.doesNotMatch(html, /secret-password|different-password/)
  })

  it("attaches password mismatch errors to confirmation", async () => {
    let app = createAuthTestApp()
    let form = await createCsrfFormRequest(app, routes.join.action.href(), {
      username: "new-renter",
      email: "new@example.com",
      password: "valid-password",
      confirm_password: "other-password",
    })
    let response = await app.router.fetch(form.request)
    let html = await response.text()

    assert.equal(response.status, 422)
    assert.match(html, /confirm_password-error/)
    assert.match(html, /Passwords do not match/)
  })

  it("translates duplicate email and username constraints into safe field errors", async () => {
    let emailDatabase = new FakeUserDatabase([existingUser])
    let emailApp = createAuthTestApp({ database: emailDatabase })
    let duplicateEmailForm = await createCsrfFormRequest(emailApp, routes.join.action.href(), {
      username: "another-renter",
      email: existingUser.email,
      password: "valid-password",
      confirm_password: "valid-password",
    })
    let duplicateEmail = await emailApp.router.fetch(duplicateEmailForm.request)
    let emailHtml = await duplicateEmail.text()

    let usernameDatabase = new FakeUserDatabase([existingUser])
    let usernameApp = createAuthTestApp({ database: usernameDatabase })
    let duplicateUsernameForm = await createCsrfFormRequest(
      usernameApp,
      routes.join.action.href(),
      {
        username: existingUser.username,
        email: "another@example.com",
        password: "valid-password",
        confirm_password: "valid-password",
      },
    )
    let duplicateUsername = await usernameApp.router.fetch(duplicateUsernameForm.request)
    let usernameHtml = await duplicateUsername.text()

    assert.equal(duplicateEmail.status, 422)
    assert.match(emailHtml, /email-error/)
    assert.match(emailHtml, /account with this email already exists/i)
    assert.doesNotMatch(emailHtml, /duplicate key|User_email_key/)

    assert.equal(duplicateUsername.status, 422)
    assert.match(usernameHtml, /username-error/)
    assert.match(usernameHtml, /account with this username already exists/i)
    assert.doesNotMatch(usernameHtml, /duplicate key|User_username_key/)
  })

  it("normalizes data, hashes the password, rotates the session, and redirects safely", async () => {
    let database = new FakeUserDatabase()
    let app = createAuthTestApp({ database })
    let oldCookie = await createSessionCookie(app, (session) => session.set("marker", "before"))
    let pathname = routes.join.action.href(undefined, {
      searchParams: { returnTo: routes.directory.href() },
    })
    let form = await createCsrfFormRequest(
      app,
      pathname,
      {
        username: "  new-renter  ",
        email: "  NEW@EXAMPLE.COM  ",
        password: "valid-password",
        confirm_password: "valid-password",
      },
      oldCookie,
    )
    let response = await app.router.fetch(form.request)

    assert.equal(response.status, 303)
    assert.equal(response.headers.get("Location"), routes.directory.href())
    assert.equal(database.users.length, 1)
    assert.equal(database.users[0]!.username, "new-renter")
    assert.equal(database.users[0]!.email, "new@example.com")
    assert.notEqual(database.users[0]!.password, "valid-password")
    assert.equal(await verifyPassword("valid-password", database.users[0]!.password), true)

    let newCookie = getResponseCookie(response)
    assert.notEqual(newCookie, form.cookie)
    let session = await readSessionCookie(app, newCookie)
    assert.deepEqual(session.get("auth"), { userId: database.users[0]!.id })
  })

  it("redirects authenticated users away", async () => {
    let database = new FakeUserDatabase([existingUser])
    let app = createAuthTestApp({ database })
    let authCookie = await createSessionCookie(app, (session) =>
      session.set("auth", { userId: existingUser.id }),
    )
    let response = await app.router.fetch(request(routes.join.index.href(), authCookie))

    assert.equal(response.status, 303)
    assert.equal(response.headers.get("Location"), routes.home.href())
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
