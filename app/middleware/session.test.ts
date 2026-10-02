import * as assert from "remix/assert"
import type { RedisSessionStorageClient } from "remix/session-storage/redis"
import { describe, it } from "remix/test"

import { createSessionStorage, sessionCookie } from "./session.ts"

const daySeconds = 24 * 60 * 60

function createRedisFixture() {
  let now = 0
  let entries = new Map<string, { value: string; expiresAt: number }>()
  let client = {
    get(key) {
      let entry = entries.get(key)
      if (entry == null) return null
      if (entry.expiresAt <= now) {
        entries.delete(key)
        return null
      }
      return entry.value
    },
    set(key, value) {
      entries.set(key, { value, expiresAt: Infinity })
    },
    setEx(key, ttlSeconds, value) {
      entries.set(key, { value, expiresAt: now + ttlSeconds })
    },
    del(key) {
      return entries.delete(key)
    },
  } satisfies RedisSessionStorageClient

  return {
    storage: createSessionStorage(client),
    advance(seconds: number) {
      now += seconds
    },
  }
}

describe("Redis sessions", () => {
  it("expires after 30 days without extending the lifetime on reads", async () => {
    let { storage, advance } = createRedisFixture()
    let session = await storage.read(null)
    session.set("auth", { userId: "user-1" })
    let id = await storage.save(session)
    assert.ok(id)
    assert.match(await sessionCookie.serialize(id), /(?:^|; )Max-Age=2592000(?:;|$)/)

    advance(29 * daySeconds)
    let active = await storage.read(id)
    assert.deepEqual(active.get("auth"), { userId: "user-1" })
    assert.equal(await storage.save(active), null)

    advance(daySeconds)
    let expired = await storage.read(id)
    assert.equal(expired.get("auth"), undefined)
    assert.notEqual(expired.id, id)
  })

  it("renews changed sessions and invalidates previous ids on rotation and logout", async () => {
    let { storage, advance } = createRedisFixture()
    let session = await storage.read(null)
    session.set("auth", { userId: "user-1" })
    let originalId = await storage.save(session)
    assert.ok(originalId)

    advance(daySeconds)
    let rotated = await storage.read(originalId)
    rotated.regenerateId(true)
    let rotatedId = await storage.save(rotated)
    assert.ok(rotatedId)
    assert.notEqual(rotatedId, originalId)
    assert.equal((await storage.read(originalId)).get("auth"), undefined)

    advance(29 * daySeconds)
    assert.deepEqual((await storage.read(rotatedId)).get("auth"), { userId: "user-1" })

    let loggedOut = await storage.read(rotatedId)
    loggedOut.unset("auth")
    loggedOut.regenerateId(true)
    let loggedOutId = await storage.save(loggedOut)
    assert.ok(loggedOutId)
    assert.notEqual(loggedOutId, rotatedId)
    assert.equal((await storage.read(rotatedId)).get("auth"), undefined)
    assert.equal((await storage.read(loggedOutId)).get("auth"), undefined)

    advance(30 * daySeconds)
    assert.notEqual((await storage.read(loggedOutId)).id, loggedOutId)
  })
})
