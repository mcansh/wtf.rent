import * as assert from "remix/assert"
import { describe, it } from "remix/test"

import {
  createAuthTestApp,
  createSessionCookie,
  FakeUserDatabase,
  getResponseCookie,
  readSessionCookie,
} from "../../test/auth.ts"
import { DUMMY_PASSWORD_HASH } from "../bcrypt.ts"
import { routes } from "../routes.ts"

const user = {
  id: "user-profile",
  username: "profile-renter",
  email: "profile@example.com",
  password: DUMMY_PASSWORD_HASH,
  createdAt: new Date("2026-08-17T00:00:00.000Z"),
  updatedAt: new Date("2026-08-17T00:00:00.000Z"),
}

describe("profile and logout", () => {
  it("shows Join and Sign in navigation to guests", async () => {
    let app = createAuthTestApp()
    let response = await app.router.fetch(request(routes.home.href()))
    let html = await response.text()

    assert.equal(response.status, 200)
    assert.match(html, /href="\/join"[^>]*>Join<\/a>/)
    assert.match(html, /href="\/login"[^>]*>Sign in<\/a>/)
    assert.doesNotMatch(html, /action="\/logout"/)
  })

  it("shows Profile and a session-backed logout form to authenticated users", async () => {
    let app = createAuthTestApp({ database: new FakeUserDatabase([user]) })
    let authCookie = await createSessionCookie(app, (session) =>
      session.set("auth", { userId: user.id }),
    )
    let response = await app.router.fetch(request(routes.profile.href(), authCookie))
    let html = await response.text()
    let renderedToken = html.match(/name="_csrf" value="([^"]+)"/)?.[1]

    assert.equal(response.status, 200)
    assert.match(html, /href="\/profile"[^>]*>Profile<\/a>/)
    assert.match(html, /method="post" action="\/logout"/)
    assert.match(html, /<form[^>]*rmx-document/)
    assert.match(html, />Sign out<\/button>/)
    assert.doesNotMatch(html, /href="\/join"[^>]*>Join<\/a>/)
    assert.ok(renderedToken)

    let responseCookie = getResponseCookie(response)
    let session = await readSessionCookie(app, responseCookie)
    assert.equal(session.get("_csrf"), renderedToken)
  })

  it("redirects profile guests to login with the requested path", async () => {
    let app = createAuthTestApp()
    let response = await app.router.fetch(request(routes.profile.href()))

    assert.equal(response.status, 302)
    let location = new URL(response.headers.get("Location")!, "http://localhost")
    assert.equal(location.pathname, routes.login.index.href())
    assert.equal(location.searchParams.get("returnTo"), routes.profile.href())
  })

  it("renders the authenticated user's profile without exposing their password hash", async () => {
    let app = createAuthTestApp({ database: new FakeUserDatabase([user]) })
    let cookie = await createSessionCookie(app, (session) =>
      session.set("auth", { userId: user.id }),
    )
    let response = await app.router.fetch(request(routes.profile.href(), cookie))
    let html = await response.text()

    assert.equal(response.status, 200)
    assert.match(html, new RegExp(user.username))
    assert.match(html, new RegExp(user.email))
    assert.doesNotMatch(html, new RegExp(user.password.replaceAll("$", "\\$")))
  })

  it("logs out only by POST, clears auth, rotates the session, and redirects home", async () => {
    let app = createAuthTestApp({ database: new FakeUserDatabase([user]) })
    let csrfToken = "logout-csrf-token"
    let oldCookie = await createSessionCookie(app, (session) => {
      session.set("auth", { userId: user.id })
      session.set("marker", "preserved")
      session.set("_csrf", csrfToken)
    })

    let getResponse = await app.router.fetch(request("/logout", oldCookie))
    assert.equal(getResponse.status, 404)

    let postResponse = await app.router.fetch(
      formRequest("/logout", { _csrf: csrfToken }, oldCookie),
    )
    assert.equal(postResponse.status, 303)
    assert.equal(postResponse.headers.get("Location"), routes.home.href())

    let newCookie = getResponseCookie(postResponse)
    assert.notEqual(newCookie, oldCookie)
    let session = await readSessionCookie(app, newCookie)
    assert.equal(session.get("auth"), undefined)
    assert.equal(session.get("marker"), "preserved")
  })
})

function request(pathname: string, cookie?: string, method = "GET"): Request {
  let headers = new Headers()
  if (cookie) headers.set("Cookie", cookie)

  return new Request(new URL(pathname, "http://localhost"), { method, headers })
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
