import { describe, it } from "node:test"

import * as assert from "remix/assert"
import { createRouter } from "remix/router"

import { ALTERNATE_INDEXING_HOST } from "../utils/seo.ts"
import { robotsTag } from "./robots-tag.ts"

describe("robots tag middleware", () => {
  it("marks alternate-host and user-specific responses as noindex without changing the body", async () => {
    let router = createRouter({ middleware: [robotsTag()] })
    router.get("/", () => new Response("home", { headers: { "X-Existing": "kept" } }))
    router.get("/posts/:id", () => new Response("report"))

    let publicResponse = await router.fetch(new Request("http://localhost/"))
    let alternateResponse = await router.fetch(new Request("https://rent.mcan.sh/"))
    let forwardedResponse = await router.fetch(
      new Request("http://localhost/", {
        headers: { "X-Forwarded-Host": ALTERNATE_INDEXING_HOST },
      }),
    )
    let reportResponse = await router.fetch(new Request("http://localhost/posts/report-1"))

    assert.equal(publicResponse.status, 200)
    assert.equal(publicResponse.headers.get("X-Robots-Tag"), null)
    assert.equal(publicResponse.headers.get("X-Existing"), "kept")
    assert.equal(await publicResponse.text(), "home")

    assert.equal(alternateResponse.headers.get("X-Robots-Tag"), "noindex")
    assert.equal(await alternateResponse.text(), "home")
    assert.equal(forwardedResponse.headers.get("X-Robots-Tag"), "noindex")
    assert.equal(reportResponse.headers.get("X-Robots-Tag"), "noindex")
  })

  it("leaves an existing X-Robots-Tag header in place", async () => {
    let router = createRouter({ middleware: [robotsTag()] })
    router.get(
      "/profile",
      () => new Response("profile", { headers: { "X-Robots-Tag": "noindex, nofollow" } }),
    )

    let response = await router.fetch(new Request("http://localhost/profile"))

    assert.equal(response.headers.get("X-Robots-Tag"), "noindex, nofollow")
  })
})
