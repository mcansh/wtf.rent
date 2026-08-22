import * as assert from "remix/assert"
import { describe, it } from "remix/test"

import { createAuthTestApp, createSessionCookie } from "../../../test/auth.ts"
import {
  createAuthenticatedReportSession,
  createReportTestApp,
  getReportCsrfForm,
  seedLegacyPost,
  seedStructuredReport,
  seedReportUser,
} from "../../../test/reports.ts"
import { posts } from "../../data/schema.ts"
import { routes } from "../../routes.ts"
import { REPORT_CATEGORY_LABELS } from "./report-input.ts"

describe("post authorization", () => {
  it("redirects guests from every post write and editor route", async () => {
    let app = createAuthTestApp()
    let csrfToken = "post-csrf-token"
    let cookie = await createSessionCookie(app, (session) => session.set("_csrf", csrfToken))
    let protectedRequests = [
      [routes.post.new.href(), "GET"],
      [routes.post.create.href(), "POST"],
      [routes.post.edit.href({ id: "report-id" }), "GET"],
      [routes.post.update.href({ id: "report-id" }), "PUT"],
      [routes.post.destroy.href({ id: "report-id" }), "DELETE"],
    ] as const

    for (let [pathname, method] of protectedRequests) {
      let response = await app.router.fetch(request(pathname, method, cookie, csrfToken))
      let location = new URL(response.headers.get("Location")!, "http://localhost")

      assert.equal(response.status, 302, `${method} ${pathname}`)
      assert.equal(location.pathname, routes.login.index.href(), `${method} ${pathname}`)
      assert.equal(location.searchParams.get("returnTo"), pathname, `${method} ${pathname}`)
    }
  })

  it("keeps the post show route public", async (t) => {
    let app = createReportTestApp()
    t.after(() => app.close())
    let response = await app.router.fetch(request(routes.post.show.href({ id: "report-id" })))

    assert.equal(response.status, 404)
    assert.equal(response.headers.get("Location"), null)
  })
})

describe("report detail", () => {
  it("renders escaped public metadata with city and region but no street address", async (t) => {
    let app = createReportTestApp()
    t.after(() => app.close())
    let author = await seedReportUser(app, {
      username: "public-<renter>",
      email: "private-detail@example.test",
      password: "private-password-hash",
    })
    let report = await seedStructuredReport(app, {
      authorId: author.id,
      title: 'Leak <script>alert("title")</script> took weeks',
      content: 'First line.\nSecond <img src=x onerror="alert(1)"> line.',
      address: "515 Private Detail Marker",
      city: "Detroit",
      region: "MI",
      landlordName: "Public Property Group",
      category: "MAINTENANCE",
      rating: 4,
      createdAt: new Date("2026-08-16T18:30:00.000Z"),
      experienceConfirmedAt: new Date("2026-08-17T12:00:00.000Z"),
    })

    let response = await app.router.fetch(request(routes.post.show.href({ id: report.id })))
    let html = await response.text()

    assert.equal(response.status, 200)
    assert.match(html, /Leak &lt;script&gt;alert\("title"\)&lt;\/script&gt; took weeks/)
    assert.match(html, /Second &lt;img src=x onerror="alert\(1\)"&gt; line\./)
    assert.doesNotMatch(html, /<script>|<img src=x/)
    assert.match(html, /public-&lt;renter&gt;/)
    assert.match(html, /Detroit, MI/)
    assert.doesNotMatch(html, /515 Private Detail Marker/)
    assert.match(html, /Public Property Group/)
    assert.match(html, /Maintenance/)
    assert.match(html, /aria-label="4 out of 5 rating"/)
    assert.match(html, /datetime="2026-08-16T18:30:00\.000Z"[^>]*>August 16, 2026/)
    assert.match(html, /datetime="2026-08-17T12:00:00\.000Z"[^>]*>August 17, 2026/)
    assert.doesNotMatch(html, /private-detail@example\.test|private-password-hash/)
    assert.doesNotMatch(html, />\s*(?:Edit|Delete|Comment|Cheer|Save)\s*</i)
  })

  it("renders a legacy report without inventing unavailable metadata", async (t) => {
    let app = createReportTestApp()
    t.after(() => app.close())
    let author = await seedReportUser(app, { username: "legacy-renter" })
    let report = await seedLegacyPost(app, {
      authorId: author.id,
      createdAt: new Date("2025-12-01T09:00:00.000Z"),
    })

    let response = await app.router.fetch(request(routes.post.show.href({ id: report.id })))
    let html = await response.text()

    assert.equal(response.status, 200)
    assert.match(html, /Legacy report/)
    assert.match(html, /A legacy renter post/)
    assert.match(html, /This post predates structured renter report metadata\./)
    assert.match(html, /@legacy-renter/)
    assert.match(html, /December 1, 2025/)
    assert.match(html, /predates structured report details/i)
    assert.doesNotMatch(html, /<dt[^>]*>Overall rating|<dt[^>]*>Location|<dt[^>]*>Category/)
    assert.doesNotMatch(html, /Example Homes|123 Main Street|Maintenance|[1-5] \/ 5/)
  })

  it("uses the same standard 404 for hidden and missing reports", async (t) => {
    let app = createReportTestApp()
    t.after(() => app.close())
    let author = await seedReportUser(app)
    let hidden = await seedStructuredReport(app, {
      id: "hidden-report",
      authorId: author.id,
      status: "HIDDEN",
    })

    let hiddenResponse = await app.router.fetch(request(routes.post.show.href({ id: hidden.id })))
    let missingResponse = await app.router.fetch(
      request(routes.post.show.href({ id: "missing-report" })),
    )
    let hiddenHtml = await hiddenResponse.text()
    let missingHtml = await missingResponse.text()

    assert.equal(hiddenResponse.status, 404)
    assert.equal(missingResponse.status, 404)
    assert.equal(hiddenHtml, missingHtml)
    assert.match(hiddenHtml, /<title>404 Not Found \| wtf\.rent<\/title>/)
    assert.doesNotMatch(hiddenHtml, /hidden-report|Repairs took repeated follow-up/)
  })
})

describe("new report form", () => {
  it("renders a native, labeled report form with disclosure and active CSRF token", async (t) => {
    let app = createReportTestApp()
    t.after(() => app.close())
    let author = await seedReportUser(app)
    let cookie = await createAuthenticatedReportSession(app, author)

    let response = await app.router.fetch(
      new Request(new URL(routes.post.new.href(), "http://localhost"), {
        headers: { Cookie: cookie },
      }),
    )
    let html = await response.text()

    assert.equal(response.status, 200)
    assert.equal(response.headers.get("Cache-Control"), "private, no-store")
    assert.equal(response.headers.get("Vary"), "Cookie")
    assert.match(html, /<form[^>]*method="post"[^>]*action="\/posts"[^>]*rmx-document/)
    assert.match(html, /name="_csrf" value="[A-Za-z0-9_-]+"/)
    for (let name of [
      "address",
      "city",
      "region",
      "landlordName",
      "category",
      "rating",
      "title",
      "content",
      "isFirsthand",
    ]) {
      assert.match(html, new RegExp(`(?:for|name)="${name}(?:-[1-5])?"`), name)
    }
    for (let [value, label] of Object.entries(REPORT_CATEGORY_LABELS)) {
      assert.match(html, new RegExp(`<option value="${value}">${label}</option>`), value)
    }
    for (let rating = 1; rating <= 5; rating++) {
      assert.match(html, new RegExp(`name="rating"[^>]*value="${rating}"`), String(rating))
    }
    assert.match(html, /street address is stored[^.]*not shown publicly/i)
    assert.match(html, /city and state, province, or region/i)
    assert.match(html, /your public username/i)
    assert.match(html, /firsthand rental experience/i)
    assert.match(html, /no apartment, unit, or suite/i)
    assert.doesNotMatch(html, /name="(?:apartment|unit|suite)"/i)
  })
})

describe("create report", () => {
  it("requires a valid CSRF token without writing a report", async (t) => {
    let app = createReportTestApp()
    t.after(() => app.close())
    let author = await seedReportUser(app)
    let cookie = await createAuthenticatedReportSession(app, author)

    let missing = await app.router.fetch(reportCreateRequest(validReportValues(), cookie))
    let form = await getReportCsrfForm(app, routes.post.new.href(), cookie)
    let invalid = await app.router.fetch(
      reportCreateRequest(validReportValues({ _csrf: "invalid-token" }), form.cookie),
    )

    assert.equal(missing.status, 403)
    assert.equal(invalid.status, 403)
    assert.deepEqual(await app.database.findMany(posts), [])
  })

  it("returns field-linked 422 responses and never writes any invalid class", async (t) => {
    let app = createReportTestApp()
    t.after(() => app.close())
    let author = await seedReportUser(app)
    let cookie = await createAuthenticatedReportSession(app, author)
    let form = await getReportCsrfForm(app, routes.post.new.href(), cookie)
    let invalidCases = [
      ["blank required value", { address: " " }, "address"],
      ["unit detail", { address: "123 Main Street Apt. 4" }, "address"],
      ["overlong value", { city: "x".repeat(101) }, "city"],
      ["unsupported category", { category: "UNSUPPORTED" }, "category"],
      ["out-of-range rating", { rating: "6" }, "rating"],
      ["NUL character", { title: "Repairs\0required repeated follow-up" }, "title"],
      ["missing confirmation", { isFirsthand: undefined }, "isFirsthand"],
    ] as const

    for (let [label, overrides, field] of invalidCases) {
      let response = await app.router.fetch(
        reportCreateRequest(validReportValues({ ...overrides, _csrf: form.token }), form.cookie),
      )
      let html = await response.text()

      assert.equal(response.status, 422, label)
      assert.equal(response.headers.get("Cache-Control"), "private, no-store", label)
      assert.equal(response.headers.get("Vary"), "Cookie", label)
      assert.match(html, /role="alert"/, label)
      assert.match(html, new RegExp(`id="${field}-error"`), label)
      assert.match(html, new RegExp(`aria-describedby="[^"]*${field}-error[^"]*"`), label)
      assert.match(html, /aria-invalid="true"/, label)
      assert.deepEqual(await app.database.findMany(posts), [], label)
    }
  })

  it("redisplays only bounded escaped report values after validation fails", async (t) => {
    let app = createReportTestApp()
    t.after(() => app.close())
    let author = await seedReportUser(app)
    let cookie = await createAuthenticatedReportSession(app, author)
    let form = await getReportCsrfForm(app, routes.post.new.href(), cookie)
    let submittedAddress = "a".repeat(200)
    let response = await app.router.fetch(
      reportCreateRequest(
        validReportValues({
          _csrf: form.token,
          address: submittedAddress,
          content: 'I saw <script>alert("unsafe")</script> in this firsthand report.',
          authorId: "forged-author-marker",
          experienceConfirmedAt: "2000-01-01T00:00:00.000Z",
          status: "HIDDEN",
        }),
        form.cookie,
      ),
    )
    let html = await response.text()

    assert.equal(response.status, 422)
    assert.match(html, new RegExp(`value="${"a".repeat(160)}"`))
    assert.doesNotMatch(html, new RegExp("a".repeat(161)))
    assert.match(html, /&lt;script&gt;alert\("unsafe"\)&lt;\/script&gt;/)
    assert.doesNotMatch(html, /<script>alert|forged-author-marker|2000-01-01|HIDDEN/)
    assert.deepEqual(await app.database.findMany(posts), [])
  })

  it("persists trusted publication fields and redirects to the detail route with 303", async (t) => {
    let app = createReportTestApp()
    t.after(() => app.close())
    let author = await seedReportUser(app)
    await seedReportUser(app, {
      id: "forged-author",
      username: "forged-author",
      email: "forged-author@example.test",
    })
    let cookie = await createAuthenticatedReportSession(app, author)
    let form = await getReportCsrfForm(app, routes.post.new.href(), cookie)
    let response = await app.router.fetch(
      reportCreateRequest(
        validReportValues({
          _csrf: form.token,
          address: "  123 Main Street  ",
          city: "  Detroit ",
          region: " MI  ",
          landlordName: "   ",
          title: "  Repairs required repeated follow-up  ",
          content: "  I followed up several times before the leak was repaired.  ",
          id: "forged-report",
          authorId: "forged-author",
          status: "HIDDEN",
          experienceConfirmedAt: "2000-01-01T00:00:00.000Z",
        }),
        form.cookie,
      ),
    )
    let reports = await app.database.findMany(posts)

    assert.equal(reports.length, 1)
    let report = reports[0]!
    assert.equal(response.status, 303)
    assert.equal(response.headers.get("Location"), routes.post.show.href({ id: report.id }))
    assert.notEqual(report.id, "forged-report")
    assert.equal(report.authorId, author.id)
    assert.equal(report.status, "PUBLISHED")
    assert.equal(report.address, "123 Main Street")
    assert.equal(report.city, "Detroit")
    assert.equal(report.region, "MI")
    assert.equal(report.landlordName, null)
    assert.equal(report.category, "MAINTENANCE")
    assert.equal(report.rating, 4)
    assert.equal(report.title, "Repairs required repeated follow-up")
    assert.equal(report.content, "I followed up several times before the leak was repaired.")
    assert.equal(report.experienceConfirmedAt instanceof Date, true)
    assert.notEqual(report.experienceConfirmedAt?.toISOString(), "2000-01-01T00:00:00.000Z")
  })
})

function validReportValues(overrides: Record<string, string | undefined> = {}) {
  return {
    address: "123 Main Street",
    city: "Detroit",
    region: "MI",
    landlordName: "Example Homes",
    category: "MAINTENANCE",
    rating: "4",
    title: "Repairs required repeated follow-up",
    content: "I followed up several times before the leak was repaired.",
    isFirsthand: "on",
    ...overrides,
  }
}

function reportCreateRequest(values: Record<string, string | undefined>, cookie: string): Request {
  let formData = new FormData()
  for (let [name, value] of Object.entries(values)) {
    if (value !== undefined) formData.set(name, value)
  }

  return new Request(new URL(routes.post.create.href(), "http://localhost"), {
    method: "POST",
    headers: { Cookie: cookie },
    body: formData,
  })
}

function request(pathname: string, method = "GET", cookie?: string, csrfToken?: string): Request {
  let headers = new Headers()
  if (cookie) headers.set("Cookie", cookie)

  let formData: FormData | undefined
  if (csrfToken && method !== "GET") {
    formData = new FormData()
    formData.set("_csrf", csrfToken)
  }

  return new Request(new URL(pathname, "http://localhost"), {
    method,
    headers,
    body: formData,
  })
}
