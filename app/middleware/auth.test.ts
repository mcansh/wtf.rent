import { describe, it } from "node:test"

import * as assert from "remix/assert"
import { Session } from "remix/session"

import {
  createLoginThrottle,
  getLoginThrottleKey,
  getSafeReturnTo,
  normalizeEmail,
  parseAuthSession,
  requireGuest,
} from "./auth.ts"

describe("auth helpers", () => {
  it("normalizes email addresses", () => {
    assert.equal(normalizeEmail("  RentER@Example.COM "), "renter@example.com")
  })

  it("accepts only safe same-origin return paths", () => {
    assert.equal(getSafeReturnTo("/profile?tab=reports#saved"), "/profile?tab=reports#saved")

    for (let unsafe of [
      "https://evil.example",
      "//evil.example",
      "/\\evil.example",
      "profile",
      "/profile\nSet-Cookie: stolen=true",
      "",
    ]) {
      assert.equal(getSafeReturnTo(unsafe), undefined, unsafe)
    }
  })

  it("parses only the expected auth-session shape", () => {
    let session = new Session()

    session.set("auth", { userId: "user-1" })
    assert.deepEqual(parseAuthSession(session), { userId: "user-1" })

    session.set("auth", { userId: 1 })
    assert.equal(parseAuthSession(session), null)

    session.set("auth", null)
    assert.equal(parseAuthSession(session), null)
  })

  it("redirects authenticated users and passes guests through", async () => {
    let middleware = requireGuest()
    let nextCalls = 0

    // SAFETY: requireGuest reads only Auth and url; this stub provides both exercised properties.
    let guestResponse = await middleware(
      {
        get: () => ({ ok: false }),
        url: new URL("http://localhost/login"),
      } as never,
      () => {
        nextCalls++
        return Promise.resolve(new Response("guest"))
      },
    )
    assert.equal(await guestResponse.text(), "guest")
    assert.equal(nextCalls, 1)

    // SAFETY: requireGuest reads only Auth and url; this stub provides both exercised properties.
    let userResponse = await middleware(
      {
        get: () => ({ ok: true, identity: { id: "user-1" }, method: "session" }),
        url: new URL("http://localhost/login"),
      } as never,
      () => {
        nextCalls++
        return Promise.resolve(new Response("unexpected"))
      },
    )
    assert.equal(userResponse.status, 303)
    assert.equal(userResponse.headers.get("Location"), "/")
    assert.equal(nextCalls, 1)
  })
})

describe("login throttle", () => {
  it("blocks after the failure limit, reports retry time, expires, and resets", () => {
    let now = 1_000
    let throttle = createLoginThrottle({
      maxAttempts: 2,
      windowMs: 10_000,
      now: () => now,
    })

    assert.deepEqual(throttle.check("key"), { allowed: true, retryAfter: 0 })
    throttle.recordFailure("key")
    throttle.recordFailure("key")
    assert.deepEqual(throttle.check("key"), { allowed: false, retryAfter: 10 })

    now += 4_001
    assert.deepEqual(throttle.check("key"), { allowed: false, retryAfter: 6 })

    throttle.reset("key")
    assert.deepEqual(throttle.check("key"), { allowed: true, retryAfter: 0 })

    throttle.recordFailure("key")
    throttle.recordFailure("key")
    now += 10_000
    assert.deepEqual(throttle.check("key"), { allowed: true, retryAfter: 0 })
  })

  it("bounds retained entries and hashes client/email identifiers", () => {
    let throttle = createLoginThrottle({ maxEntries: 2 })
    throttle.recordFailure("one")
    throttle.recordFailure("two")
    throttle.recordFailure("three")
    assert.equal(throttle.size, 2)

    let first = getLoginThrottleKey(
      new Request("http://localhost/login", {
        headers: { "X-Forwarded-For": "192.0.2.1, 10.0.0.1" },
      }),
      "Renter@example.com",
    )
    let same = getLoginThrottleKey(
      new Request("http://localhost/login", {
        headers: { "X-Forwarded-For": "192.0.2.1" },
      }),
      "renter@example.com",
    )
    let other = getLoginThrottleKey(new Request("http://localhost/login"), "renter@example.com")

    assert.equal(first, same)
    assert.notEqual(first, other)
    assert.doesNotMatch(first, /renter|192\.0\.2\.1/i)
  })
})
