import { describe, it } from "node:test"

import * as assert from "remix/assert"

import { createAuthTestRouter } from "../test/auth.ts"
import { readEnv } from "./env.ts"
import { routes } from "./routes.ts"

describe("app router", () => {
  it("uses safe defaults only in tests", () => {
    let testEnv = readEnv({ NODE_ENV: "test" })

    assert.equal(testEnv.NODE_ENV, "test")
    assert.match(testEnv.DATABASE_URL, /^postgresql:\/\//)
    assert.ok(testEnv.SESSION_SECRETS[0]!.length >= 32)

    assert.throws(() => readEnv({ NODE_ENV: "production" }))
  })

  it("builds an isolated router and preserves non-success responses", async () => {
    let router = createAuthTestRouter()
    let response = await router.fetch(
      new Request(new URL(routes.login.action.href(), "http://localhost"), {
        method: "POST",
      }),
    )

    assert.equal(response.status, 403)
    assert.equal(response.headers.get("Location"), null)
    assert.equal(response.headers.get("X-Content-Type-Options"), "nosniff")
  })

  it("serves static assets without creating session state", async () => {
    let router = createAuthTestRouter()
    let response = await router.fetch(new Request("http://localhost/favicon.svg"))

    assert.equal(response.status, 200)
    assert.equal(response.headers.get("Set-Cookie"), null)
    assert.equal(response.headers.get("X-Content-Type-Options"), "nosniff")
  })
})
