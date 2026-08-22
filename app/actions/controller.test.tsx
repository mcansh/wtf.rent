import { describe, it } from "node:test"

import * as assert from "remix/assert"

import {
  createAuthTestApp,
  createSessionCookie,
  FakeUserDatabase,
  getResponseCookie,
  readSessionCookie,
} from "../../test/auth.ts"
import {
  createAuthenticatedReportSession,
  createReportTestApp,
  seedLegacyPost,
  seedReportUser,
  seedStructuredReport,
} from "../../test/reports.ts"
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
  it("shows Join and Sign in navigation to guests", async (t) => {
    let app = createReportTestApp()
    t.after(() => app.close())
    let response = await app.router.fetch(request(routes.home.href()))
    let html = await response.text()

    assert.equal(response.status, 200)
    assert.match(html, /href="\/join"[^>]*>Join<\/a>/)
    assert.match(html, /href="\/login"[^>]*>Sign in<\/a>/)
    assert.doesNotMatch(html, /action="\/logout"/)
  })

  it("shows Profile and a session-backed logout form to authenticated users", async (t) => {
    let app = createReportTestApp()
    t.after(() => app.close())
    let reportUser = await seedReportUser(app, user)
    let authCookie = await createAuthenticatedReportSession(app, reportUser)
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

describe("home report discovery", () => {
  it("renders the real default page with legacy rows and without hidden, private, or mock data", async (t) => {
    let app = createReportTestApp()
    t.after(() => app.close())
    let author = await seedReportUser(app, {
      username: "public-home-renter",
      email: "private-home@example.test",
      password: "private-home-password",
    })
    let legacy = await seedLegacyPost(app, {
      id: "home-legacy",
      authorId: author.id,
      createdAt: new Date("2026-08-15T12:00:00.000Z"),
    })
    let published = await seedStructuredReport(app, {
      id: "home-published",
      authorId: author.id,
      title: 'Repairs <script>alert("feed")</script> stayed unresolved',
      content: 'Firsthand <img src=x onerror="alert(1)"> report content.',
      address: "717 Private Feed Marker",
      city: "Detroit",
      region: "MI",
      createdAt: new Date("2026-08-16T12:00:00.000Z"),
    })
    await seedStructuredReport(app, {
      id: "home-hidden",
      authorId: author.id,
      status: "HIDDEN",
      createdAt: new Date("2026-08-17T12:00:00.000Z"),
    })

    let response = await app.router.fetch(request(routes.home.href()))
    let html = await response.text()

    assert.equal(response.status, 200)
    assert.ok(html.indexOf(`/posts/${published.id}`) < html.indexOf(`/posts/${legacy.id}`))
    assert.match(html, /2 public reports on the record/i)
    assert.match(html, /Showing 1–2 of 2 reports\./)
    assert.match(html, /Page 1 of 1/)
    assert.match(html, /Maintenance/)
    assert.match(html, /Legacy report/)
    assert.match(html, /Location unavailable/)
    assert.match(html, /Detroit, MI/)
    assert.match(html, /datetime="2026-08-16T12:00:00\.000Z"/)
    assert.match(html, /Repairs &lt;script&gt;alert\("feed"\)&lt;\/script&gt; stayed unresolved/)
    assert.match(html, /Firsthand &lt;img src=x onerror="alert\(1\)"&gt; report content\./)
    assert.doesNotMatch(html, /<script>alert\("feed"\)|<img src=x/)
    assert.doesNotMatch(
      html,
      /717 Private Feed Marker|private-home@example\.test|private-home-password|home-hidden/,
    )
    assert.doesNotMatch(
      html,
      /Maya K\.|1,284 NEW REPORTS|>For you<|>Following<|>Near you<|Top rated landlords|Change city|Give a cheer|Save review|Load more reports/i,
    )
  })

  it("does not expose or search a stored street address", async (t) => {
    let app = createReportTestApp()
    t.after(() => app.close())
    let author = await seedReportUser(app)
    await seedStructuredReport(app, {
      id: "private-address-report",
      authorId: author.id,
      address: "616 Private Search Marker",
      city: "Detroit",
      region: "MI",
    })

    let defaultResponse = await app.router.fetch(request(routes.home.href()))
    let defaultHtml = await defaultResponse.text()
    let searchResponse = await app.router.fetch(
      request(routes.home.href(undefined, { searchParams: { q: "Private Search Marker" } })),
    )
    let searchHtml = await searchResponse.text()

    assert.match(defaultHtml, /Detroit, MI/)
    assert.doesNotMatch(defaultHtml, /616 Private Search Marker/)
    assert.match(searchHtml, /0 public reports on the record/i)
    assert.doesNotMatch(
      searchHtml,
      /616 Private Search Marker|href="\/posts\/private-address-report"/,
    )
  })

  it("normalizes and searches a bounded query through the real report operation", async (t) => {
    let app = createReportTestApp()
    t.after(() => app.close())
    let author = await seedReportUser(app)
    let matching = await seedStructuredReport(app, {
      id: "matching-boiler-report",
      authorId: author.id,
      title: "Boiler repairs took repeated requests",
    })
    await seedStructuredReport(app, {
      id: "unrelated-report",
      authorId: author.id,
      title: "A smooth move-in experience",
      category: "GOOD_EXPERIENCE",
    })
    let url = routes.home.href(undefined, {
      searchParams: { q: "  BOILER  ", page: "not-a-page" },
    })

    let response = await app.router.fetch(request(url))
    let html = await response.text()

    assert.match(html, /name="q"[^>]*value="BOILER"/)
    assert.match(html, new RegExp(`href="/posts/${matching.id}"`))
    assert.doesNotMatch(html, /href="\/posts\/unrelated-report"/)
    assert.match(html, /Showing 1–1 of 1 report matching “BOILER”\./)
    assert.match(html, /Page 1 of 1/)
  })

  it("rejects a NUL search query before querying reports", async (t) => {
    let app = createReportTestApp()
    t.after(() => app.close())

    let response = await app.router.fetch(request("/?q=%00"))

    assert.equal(response.status, 400)
    assert.equal(await response.text(), "Invalid search query")
  })

  it("renders a truthful empty page for a capped query with no matches", async (t) => {
    let app = createReportTestApp()
    t.after(() => app.close())
    let query = "x".repeat(120)

    let response = await app.router.fetch(
      request(routes.home.href(undefined, { searchParams: { q: query } })),
    )
    let html = await response.text()

    assert.match(html, new RegExp(`name="q"[^>]*value="${"x".repeat(100)}"`))
    assert.match(html, /0 public reports on the record/i)
    assert.match(html, new RegExp(`No reports match “${"x".repeat(100)}”\\.`))
    assert.match(html, /href="\/#feed"[^>]*>\s*Clear search\s*<\/a>/)
    assert.doesNotMatch(html, /Page 1 of/)
  })

  it("preserves a positive out-of-range page with real totals and no fabricated rows", async (t) => {
    let app = createReportTestApp()
    t.after(() => app.close())
    let author = await seedReportUser(app)
    await seedStructuredReport(app, { authorId: author.id })

    let response = await app.router.fetch(
      request(routes.home.href(undefined, { searchParams: { page: "999" } })),
    )
    let html = await response.text()

    assert.match(html, /Page 999 is beyond the available reports\./)
    assert.match(html, /There is 1 report on the record\./)
    assert.match(html, /href="\/#feed"[^>]*>\s*Back to the first page\s*<\/a>/)
    assert.doesNotMatch(html, /rel="prev"/)
    assert.doesNotMatch(html, /rel="next"/)
  })

  it("renders native pagination that preserves search and omits page one", async (t) => {
    let app = createReportTestApp()
    t.after(() => app.close())
    let author = await seedReportUser(app)
    for (let index = 1; index <= 21; index++) {
      await seedStructuredReport(app, {
        id: `pagination-${String(index).padStart(2, "0")}`,
        authorId: author.id,
        title: `Detroit report ${index}`,
      })
    }

    let firstResponse = await app.router.fetch(
      request(routes.home.href(undefined, { searchParams: { q: "Detroit" } })),
    )
    let firstHtml = await firstResponse.text()
    let secondResponse = await app.router.fetch(
      request(routes.home.href(undefined, { searchParams: { q: "Detroit", page: "2" } })),
    )
    let secondHtml = await secondResponse.text()

    assert.match(firstHtml, /Showing 1–20 of 21 reports matching “Detroit”\./)
    assert.match(firstHtml, /href="\/\?q=Detroit&amp;page=2#feed"[^>]*rel="next"/)
    assert.doesNotMatch(firstHtml, /rel="prev"/)
    assert.doesNotMatch(firstHtml, /href="\/posts\/pagination-01"/)

    assert.match(secondHtml, /Showing 21–21 of 21 reports matching “Detroit”\./)
    assert.match(secondHtml, /href="\/\?q=Detroit#feed"[^>]*rel="prev"/)
    assert.doesNotMatch(secondHtml, /page=1/)
    assert.doesNotMatch(secondHtml, /rel="next"/)
    assert.match(secondHtml, /href="\/posts\/pagination-01"/)
    assert.match(secondHtml, /name="q"[^>]*value="Detroit"/)
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
