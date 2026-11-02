import * as assert from "remix/assert"
import { describe, it } from "remix/test"

import {
  createAuthenticatedReportSession,
  createReportTestApp,
  seedReportUser,
  seedStructuredReport,
} from "../../test/reports.ts"
import { routes } from "../routes.ts"
import {
  GOOGLE_FONTS_FILE_ORIGIN,
  GOOGLE_FONTS_STYLESHEET_ORIGIN,
  HOME_GOOGLE_FONTS_STYLESHEET_HREF,
  SHARED_GOOGLE_FONTS_STYLESHEET_HREF,
} from "./google-fonts.ts"

describe("document google fonts", () => {
  it("preconnects to gstatic with CORS and loads shared families on every HTML page", async (t) => {
    let app = createReportTestApp()
    t.after(() => app.close())
    let author = await seedReportUser(app)
    let report = await seedStructuredReport(app, { authorId: author.id })
    let authCookie = await createAuthenticatedReportSession(app, author)

    let pages = [
      [routes.home.href(), undefined],
      [routes.about.href(), undefined],
      [routes.directory.href(), undefined],
      [routes.rights.href(), undefined],
      [routes.login.index.href(), undefined],
      [routes.join.index.href(), undefined],
      [routes.post.show.href({ id: report.id }), undefined],
      [routes.post.new.href(), authCookie],
      [routes.profile.href(), authCookie],
      ["/missing-page", undefined],
    ] as const

    for (let [pathname, cookie] of pages) {
      let response = await app.router.fetch(request(pathname, cookie))
      let html = await response.text()
      let csp = response.headers.get("Content-Security-Policy") ?? ""

      assert.ok(response.status === 200 || response.status === 404, pathname)
      let hrefs = htmlHrefs(html)
      assert.match(html, /rel="preconnect" href="https:\/\/fonts\.googleapis\.com"/, pathname)
      assert.doesNotMatch(
        html,
        /rel="preconnect" href="https:\/\/fonts\.googleapis\.com" crossorigin/,
        pathname,
      )
      assert.match(
        html,
        /rel="preconnect" href="https:\/\/fonts\.gstatic\.com" crossorigin="anonymous"/,
        pathname,
      )
      let expectedHref =
        pathname === routes.home.href()
          ? HOME_GOOGLE_FONTS_STYLESHEET_HREF
          : SHARED_GOOGLE_FONTS_STYLESHEET_HREF
      assert.ok(hrefs.includes(expectedHref), pathname)
      assert.equal(
        hrefs.filter((href) => href.startsWith(`${GOOGLE_FONTS_STYLESHEET_ORIGIN}/css2`)).length,
        1,
        pathname,
      )
      assert.match(
        csp,
        new RegExp(`style-src[^;]*${escapeRegExp(GOOGLE_FONTS_STYLESHEET_ORIGIN)}`),
        pathname,
      )
      assert.match(
        csp,
        new RegExp(`font-src[^;]*${escapeRegExp(GOOGLE_FONTS_FILE_ORIGIN)}`),
        pathname,
      )
    }
  })

  it("loads Playfair italic only on the home page", async (t) => {
    let app = createReportTestApp()
    t.after(() => app.close())
    let author = await seedReportUser(app)
    let report = await seedStructuredReport(app, { authorId: author.id })

    let home = await app.router.fetch(request(routes.home.href()))
    let about = await app.router.fetch(request(routes.about.href()))
    let reportPage = await app.router.fetch(request(routes.post.show.href({ id: report.id })))
    let notFound = await app.router.fetch(request("/missing-page"))

    let homeHtml = await home.text()
    let aboutHtml = await about.text()
    let reportHtml = await reportPage.text()
    let notFoundHtml = await notFound.text()

    assert.ok(htmlHrefs(homeHtml).includes(HOME_GOOGLE_FONTS_STYLESHEET_HREF))
    assert.match(homeHtml, /Playfair\+Display:ital,wght@0,700\.\.800;1,700\.\.800/)
    assert.match(homeHtml, /<em class="font-bold">like<\/em>/)
    assert.match(homeHtml, />RECEIPTS\.</)
    assert.doesNotMatch(homeHtml, /[?&]text=/)

    for (let [name, html] of [
      ["about", aboutHtml],
      ["report", reportHtml],
      ["404", notFoundHtml],
    ] as const) {
      let hrefs = htmlHrefs(html)
      assert.ok(hrefs.includes(SHARED_GOOGLE_FONTS_STYLESHEET_HREF), name)
      assert.ok(!hrefs.includes(HOME_GOOGLE_FONTS_STYLESHEET_HREF), name)
      assert.doesNotMatch(html, /Playfair\+Display:ital/, name)
      assert.doesNotMatch(html, /Karla:ital/, name)
    }
  })
})

function request(pathname: string, cookie?: string): Request {
  let headers = new Headers()
  if (cookie) headers.set("Cookie", cookie)

  return new Request(new URL(pathname, "http://localhost"), { headers })
}

function htmlHrefs(html: string): string[] {
  return [...html.matchAll(/href="([^"]+)"/g)].map((match) => match[1]!.replaceAll("&amp;", "&"))
}

function escapeRegExp(value: string): string {
  return value.replaceAll(/[.*+?^${}()|[\]\\]/g, "\\$&")
}
