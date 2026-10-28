import * as assert from "remix/assert"
import { describe, it } from "remix/test"

import { routes } from "../routes.ts"
import {
  ALTERNATE_INDEXING_HOST,
  CANONICAL_ORIGIN,
  canonicalHref,
  DEFAULT_META_DESCRIPTION,
  getPageSeo,
  getRequestHostname,
  isIndexablePublicPath,
  PUBLIC_SITEMAP_PATHS,
  robotsTxt,
  shouldNoindex,
  sitemapXml,
} from "./seo.ts"

describe("search engine helpers", () => {
  it("builds canonical https://wtf.rent URLs from pathnames", () => {
    assert.equal(canonicalHref("/"), `${CANONICAL_ORIGIN}/`)
    assert.equal(canonicalHref(routes.about.href()), `${CANONICAL_ORIGIN}/about`)
    assert.equal(
      canonicalHref(routes.post.show.href({ id: "report-1" })),
      `${CANONICAL_ORIGIN}/posts/report-1`,
    )
  })

  it("prefers forwarded host, then Host, then the request URL", () => {
    let url = new URL("http://localhost/about")

    assert.equal(getRequestHostname(url, new Headers()), "localhost")
    assert.equal(getRequestHostname(url, new Headers({ Host: "wtf.rent:443" })), "wtf.rent")
    assert.equal(
      getRequestHostname(
        url,
        new Headers({
          Host: "localhost:3000",
          "X-Forwarded-Host": "rent.mcan.sh, wtf.rent",
        }),
      ),
      ALTERNATE_INDEXING_HOST,
    )
    assert.equal(
      getRequestHostname(new URL("https://rent.mcan.sh/"), new Headers()),
      ALTERNATE_INDEXING_HOST,
    )
  })

  it("indexes only the public, non-user-specific pages on the canonical host", () => {
    assert.deepEqual([...PUBLIC_SITEMAP_PATHS], ["/", "/directory", "/rights", "/about"])

    for (let pathname of PUBLIC_SITEMAP_PATHS) {
      assert.equal(isIndexablePublicPath(pathname), true, pathname)
      assert.equal(shouldNoindex(pathname, "localhost"), false, pathname)
      assert.equal(shouldNoindex(pathname, "wtf.rent"), false, pathname)
      assert.equal(shouldNoindex(pathname, ALTERNATE_INDEXING_HOST), true, pathname)
    }

    let noindexPaths = [
      routes.login.index.href(),
      routes.join.index.href(),
      routes.profile.href(),
      routes.post.new.href(),
      routes.post.edit.href({ id: "report-1" }),
      routes.post.show.href({ id: "report-1" }),
      "/missing",
    ]

    for (let pathname of noindexPaths) {
      assert.equal(isIndexablePublicPath(pathname), false, pathname)
      assert.equal(shouldNoindex(pathname, "wtf.rent"), true, pathname)
    }
  })

  it("points every page at a wtf.rent canonical and noindexes user-specific reports", () => {
    let publicSeo = getPageSeo({
      description: "Public copy",
      hostname: "localhost",
      pathname: routes.about.href(),
      title: "About | wtf.rent",
    })
    let reportSeo = getPageSeo({
      description: "A renter report",
      hostname: "wtf.rent",
      pathname: routes.post.show.href({ id: "report-1" }),
      title: "A leaky roof · wtf.rent",
    })
    let alternateSeo = getPageSeo({
      description: "Public copy",
      hostname: ALTERNATE_INDEXING_HOST,
      pathname: routes.home.href(),
      title: "wtf.rent",
    })

    assert.equal(publicSeo.canonicalHref, `${CANONICAL_ORIGIN}/about`)
    assert.equal(publicSeo.robots, null)
    assert.equal(reportSeo.canonicalHref, `${CANONICAL_ORIGIN}/posts/report-1`)
    assert.equal(reportSeo.robots, "noindex")
    assert.equal(alternateSeo.canonicalHref, `${CANONICAL_ORIGIN}/`)
    assert.equal(alternateSeo.robots, "noindex")

    let missingSeo = getPageSeo({
      canonicalPath: routes.home.href(),
      description: DEFAULT_META_DESCRIPTION,
      hostname: "wtf.rent",
      pathname: "/missing-seo-page",
      title: "404 Not Found | wtf.rent",
    })
    assert.equal(missingSeo.canonicalHref, `${CANONICAL_ORIGIN}/`)
    assert.equal(missingSeo.robots, "noindex")
  })

  it("lists only public pages in the sitemap and references it from robots.txt", () => {
    let robots = robotsTxt()
    let sitemap = sitemapXml()

    assert.match(robots, /^User-agent: \*\nAllow: \/\n\n/)
    assert.match(robots, /\nDisallow: \/login\n/)
    assert.match(robots, /\nDisallow: \/join\n/)
    assert.match(robots, /\nDisallow: \/profile\n/)
    assert.match(robots, /\nDisallow: \/posts\/new\n/)
    assert.match(robots, /\nDisallow: \/posts\/\*\/edit\n/)
    assert.ok(robots.endsWith(`Sitemap: ${CANONICAL_ORIGIN}/sitemap.xml\n`))

    assert.match(sitemap, /^<\?xml version="1.0" encoding="UTF-8"\?>\n/)
    assert.match(sitemap, /<urlset xmlns="http:\/\/www.sitemaps.org\/schemas\/sitemap\/0.9">/)
    assert.ok(sitemap.includes(`<loc>${CANONICAL_ORIGIN}/</loc>`))
    assert.ok(sitemap.includes(`<loc>${CANONICAL_ORIGIN}/directory</loc>`))
    assert.ok(sitemap.includes(`<loc>${CANONICAL_ORIGIN}/rights</loc>`))
    assert.ok(sitemap.includes(`<loc>${CANONICAL_ORIGIN}/about</loc>`))
    assert.doesNotMatch(sitemap, /\/login|\/join|\/profile|\/posts/)
  })
})
