import * as assert from "remix/assert"
import { describe, it } from "remix/test"

import {
  createAuthTestApp,
  createSessionCookie,
  FakeUserDatabase,
  getResponseCookie,
  readSessionCookie,
  TEST_USER_PASSWORD_HASH,
} from "../../test/auth.ts"
import {
  createAuthenticatedReportSession,
  createReportTestApp,
  seedLegacyPost,
  seedReportUser,
  seedStructuredReport,
} from "../../test/reports.ts"
import { routes } from "../routes.ts"

const user = {
  id: "user-profile",
  username: "profile-renter",
  email: "profile@example.com",
  password: TEST_USER_PASSWORD_HASH,
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
  it("renders an accessible combobox while preserving the native GET search", async (t) => {
    let app = createReportTestApp()
    t.after(() => app.close())

    let response = await app.router.fetch(request(routes.home.href()))
    let html = await response.text()

    assert.equal(response.status, 200)
    assert.match(html, /<form[^>]*method="get"[^>]*action="\/#feed"[^>]*role="search"/)
    assert.match(html, /<input[^>]*name="q"[^>]*type="search"/)
    assert.match(html, /role="combobox"/)
    assert.match(html, /aria-autocomplete="list"/)
    assert.match(html, /aria-expanded="false"/)
    assert.match(html, /autocomplete="off"/)
    assert.match(html, /aria-live="polite"/)
  })

  it("returns only published, allowlisted autocomplete values", async (t) => {
    let app = createReportTestApp()
    t.after(() => app.close())
    let author = await seedReportUser(app, {
      email: "private-suggestion@example.test",
      password: "private-suggestion-password",
    })
    await seedStructuredReport(app, {
      id: "public-suggestion",
      authorId: author.id,
      address: "808 Private Suggestion Marker",
      city: "Detroit",
      region: "MI",
    })
    await seedStructuredReport(app, {
      id: "hidden-suggestion",
      authorId: author.id,
      status: "HIDDEN",
      city: "Detention",
      region: "XX",
    })

    let href = routes.reportSuggestions.href(undefined, { searchParams: { q: "det" } })
    let response = await app.router.fetch(request(href))
    let payload = await response.json()
    let shortResponse = await app.router.fetch(
      request(routes.reportSuggestions.href(undefined, { searchParams: { q: "d" } })),
    )

    assert.equal(response.status, 200)
    assert.match(response.headers.get("Content-Type") ?? "", /^application\/json/)
    assert.equal(
      response.headers.get("Cache-Control"),
      "public, max-age=60, s-maxage=300, stale-while-revalidate=300",
    )
    assert.deepEqual(payload, {
      suggestions: [{ kind: "city", label: "Detroit", description: "City · MI", value: "Detroit" }],
    })
    assert.deepEqual(await shortResponse.json(), { suggestions: [] })
    assert.doesNotMatch(
      JSON.stringify(payload),
      /808 Private Suggestion Marker|private-suggestion@example\.test|private-suggestion-password|Detention/,
    )
  })

  it("merges cached Photon places with report-backed suggestions", async (t) => {
    let photonRequests = 0
    let app = createReportTestApp({
      photonFetch: async () => {
        photonRequests++
        return Response.json({
          type: "FeatureCollection",
          features: [
            {
              type: "Feature",
              properties: {
                type: "city",
                name: "Berlin",
                state: "Berlin",
                country: "Germany",
                street: "Provider-only street",
              },
              geometry: { type: "Point", coordinates: [13.3889, 52.517] },
            },
          ],
        })
      },
    })
    t.after(() => app.close())
    let author = await seedReportUser(app)
    await seedStructuredReport(app, {
      id: "berlin-landlord",
      authorId: author.id,
      city: "Detroit",
      region: "MI",
      landlordName: "Berlin Homes",
    })
    let href = routes.reportSuggestions.href(undefined, { searchParams: { q: "ber" } })

    let firstResponse = await app.router.fetch(request(href))
    let secondResponse = await app.router.fetch(request(href))
    let payload = await firstResponse.json()

    assert.equal(firstResponse.status, 200)
    assert.equal(secondResponse.status, 200)
    assert.equal(photonRequests, 1)
    assert.deepEqual(payload, {
      suggestions: [
        {
          kind: "landlord",
          label: "Berlin Homes",
          description: "Landlord or manager",
          value: "Berlin Homes",
        },
        {
          kind: "city",
          label: "Berlin",
          description: "City · Germany",
          value: "Berlin",
        },
      ],
    })
    assert.doesNotMatch(JSON.stringify(payload), /Provider-only street/)
  })

  it("rejects invalid suggestion queries before querying reports or Photon", async (t) => {
    let photonRequests = 0
    let app = createReportTestApp({
      photonFetch: () => {
        photonRequests++
        return Promise.resolve(Response.json({ features: [] }))
      },
    })
    t.after(() => app.close())

    let response = await app.router.fetch(request("/reports/suggestions?q=%00"))

    assert.equal(response.status, 400)
    assert.equal(await response.text(), "Invalid search query")
    assert.equal(photonRequests, 0)
  })

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

  it("preserves an active search on an out-of-range page", async (t) => {
    let app = createReportTestApp()
    t.after(() => app.close())
    let author = await seedReportUser(app)
    await seedStructuredReport(app, { authorId: author.id, city: "Detroit" })

    let response = await app.router.fetch(
      request(routes.home.href(undefined, { searchParams: { q: "Detroit", page: "999" } })),
    )
    let html = await response.text()

    assert.match(html, /Page 999 is beyond the available reports\./)
    assert.match(html, /There is 1 report on the record\./)
    assert.match(html, /href="\/\?q=Detroit#feed"[^>]*>\s*Back to the first page\s*<\/a>/)
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

describe("public directory", () => {
  it("renders grouped public entries and links them to the report feed without private data", async (t) => {
    let app = createReportTestApp()
    t.after(() => app.close())
    let author = await seedReportUser(app, {
      email: "directory-private@example.test",
      password: "directory-private-password",
    })
    await seedStructuredReport(app, {
      id: "directory-public-one",
      authorId: author.id,
      landlordName: "Maple & Co",
      address: "919 Private Directory Marker",
      city: "Detroit",
      region: "MI",
    })
    await seedStructuredReport(app, {
      id: "directory-public-two",
      authorId: author.id,
      landlordName: "Maple & Co",
      city: "Detroit",
      region: "MI",
    })
    await seedStructuredReport(app, {
      id: "directory-hidden",
      authorId: author.id,
      landlordName: "Hidden Homes",
      status: "HIDDEN",
    })
    await seedLegacyPost(app, { id: "directory-legacy", authorId: author.id })

    let response = await app.router.fetch(request(routes.directory.href()))
    let html = await response.text()

    assert.equal(response.status, 200)
    assert.match(html, /href="\/directory" aria-current="page"/)
    assert.match(html, /<summary[^>]*>\s*Menu\s*<\/summary>/)
    assert.match(html, /<form[^>]*method="get"[^>]*action="\/directory"[^>]*role="search"/)
    assert.match(html, /<input[^>]*name="q"[^>]*type="search"/)
    assert.match(html, /Browse the public record/)
    assert.match(html, /Maple &amp; Co/)
    assert.match(html, /Detroit, MI/)
    assert.match(html, /2 public reports/)
    assert.match(html, /href="\/\?q=Maple\+%26\+Co#feed"/)
    assert.doesNotMatch(
      html,
      /919 Private Directory Marker|directory-private@example\.test|directory-private-password|Hidden Homes|directory-legacy/,
    )
  })

  it("searches public directory fields through bounded native URL state", async (t) => {
    let app = createReportTestApp()
    t.after(() => app.close())
    let author = await seedReportUser(app)
    await seedStructuredReport(app, {
      id: "directory-detroit",
      authorId: author.id,
      landlordName: "Detroit Doorways",
      city: "Detroit",
      region: "MI",
    })
    await seedStructuredReport(app, {
      id: "directory-grand-rapids",
      authorId: author.id,
      landlordName: "River Homes",
      city: "Grand Rapids",
      region: "MI",
    })

    let response = await app.router.fetch(
      request(routes.directory.href(undefined, { searchParams: { q: "  DETROIT  " } })),
    )
    let html = await response.text()

    assert.equal(response.status, 200)
    assert.match(html, /name="q"[^>]*value="DETROIT"/)
    assert.match(html, /Detroit Doorways/)
    assert.doesNotMatch(html, /River Homes/)
    assert.match(html, /Showing 1–1 of 1 directory entry matching “DETROIT”\./)
    assert.match(html, /href="\/directory"[^>]*>\s*Clear search\s*<\/a>/)
  })

  it("rejects invalid directory queries before querying reports", async (t) => {
    let app = createReportTestApp()
    t.after(() => app.close())

    let response = await app.router.fetch(request("/directory?q=%00"))

    assert.equal(response.status, 400)
    assert.equal(await response.text(), "Invalid search query")
  })

  it("renders distinct all-empty, no-match, and out-of-range states", async (t) => {
    let app = createReportTestApp()
    t.after(() => app.close())

    let emptyResponse = await app.router.fetch(request(routes.directory.href()))
    let emptyHtml = await emptyResponse.text()
    assert.equal(emptyResponse.status, 200)
    assert.match(emptyHtml, /No directory entries have been published yet\./)

    let author = await seedReportUser(app)
    await seedStructuredReport(app, {
      id: "directory-empty-state-source",
      authorId: author.id,
      landlordName: "Known Homes",
    })

    let noMatchResponse = await app.router.fetch(
      request(routes.directory.href(undefined, { searchParams: { q: "Unknown" } })),
    )
    let noMatchHtml = await noMatchResponse.text()
    assert.match(noMatchHtml, /No directory entries match “Unknown”\./)
    assert.match(noMatchHtml, /href="\/directory"[^>]*>\s*Clear search\s*<\/a>/)

    let outOfRangeResponse = await app.router.fetch(
      request(routes.directory.href(undefined, { searchParams: { page: "999" } })),
    )
    let outOfRangeHtml = await outOfRangeResponse.text()
    assert.match(outOfRangeHtml, /Page 999 is beyond the available directory\./)
    assert.match(outOfRangeHtml, /There is 1 directory entry on the record\./)
    assert.match(outOfRangeHtml, /href="\/directory"[^>]*>\s*Back to the first page\s*<\/a>/)
    assert.doesNotMatch(outOfRangeHtml, /rel="prev"|rel="next"/)
  })

  it("renders 24-entry pages with search-preserving native pagination", async (t) => {
    let app = createReportTestApp()
    t.after(() => app.close())
    let author = await seedReportUser(app)
    for (let index = 1; index <= 25; index++) {
      await seedStructuredReport(app, {
        id: `directory-pagination-${String(index).padStart(2, "0")}`,
        authorId: author.id,
        landlordName: `Directory Homes ${String(index).padStart(2, "0")}`,
      })
    }

    let firstResponse = await app.router.fetch(
      request(routes.directory.href(undefined, { searchParams: { q: "Homes" } })),
    )
    let firstHtml = await firstResponse.text()
    let secondResponse = await app.router.fetch(
      request(routes.directory.href(undefined, { searchParams: { q: "Homes", page: "2" } })),
    )
    let secondHtml = await secondResponse.text()

    assert.match(firstHtml, /Showing 1–24 of 25 directory entries matching “Homes”\./)
    assert.match(firstHtml, /href="\/directory\?q=Homes&amp;page=2"[^>]*rel="next"/)
    assert.doesNotMatch(firstHtml, /rel="prev"/)

    assert.match(secondHtml, /Showing 25–25 of 25 directory entries matching “Homes”\./)
    assert.match(secondHtml, /href="\/directory\?q=Homes"[^>]*rel="prev"/)
    assert.doesNotMatch(secondHtml, /page=1|rel="next"/)
    assert.match(secondHtml, /Page 2 of 2/)
  })
})

describe("public renter rights guide", () => {
  it("renders the approved guide and reviewed source set", async (t) => {
    let app = createReportTestApp()
    t.after(() => app.close())

    let response = await app.router.fetch(request(routes.rights.href()))
    let html = await response.text()

    assert.equal(response.status, 200)
    assert.match(html, /<title>Renter rights \| wtf\.rent<\/title>/)
    assert.match(html, /href="\/rights" aria-current="page"/)
    assert.match(html, /Start with the rules that apply where you live/)
    assert.match(html, /Build a clear record/)
    assert.match(html, /Match the problem to qualified help/)
    assert.match(html, /Know what this guide cannot decide/)
    assert.match(html, /Last reviewed <time datetime="2026-08-18">August 18, 2026<\/time>/)

    let approvedSources = [
      ["USAGov", "https://www.usa.gov/tenant-rights"],
      [
        "HUD: Fair Housing Rights and Obligations",
        "https://www.hud.gov/stat/fheo/rights-obligations",
      ],
      ["HUD: Report Housing Discrimination", "https://www.hud.gov/reporthousingdiscrimination"],
      ["HUD: Housing Counseling", "https://www.hud.gov/stat/sfh/housing-counseling"],
      [
        "Legal Services Corporation",
        "https://www.lsc.gov/about-lsc/what-legal-aid/i-need-legal-help",
      ],
    ] as const

    for (let [label, href] of approvedSources) {
      assert.match(html, new RegExp(`href="${href.replaceAll(".", "\\.")}"`))
      assert.match(html, new RegExp(label))
    }
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
