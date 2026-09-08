import { createCookie } from "remix/cookie"
import { Session } from "remix/session"
import { createRedisSessionStorage } from "remix/session-storage/redis"
import type { RedisSessionStorageClient } from "remix/session-storage/redis"

import { env } from "../env.ts"
import { redis } from "../redis.ts"

const sessionLifetimeSeconds = 30 * 24 * 60 * 60

export const sessionCookie = createCookie("session", {
  secrets: env.SESSION_SECRETS,
  httpOnly: true,
  sameSite: "Lax",
  maxAge: sessionLifetimeSeconds,
  path: "/",
  secure: env.NODE_ENV === "production",
})

export function createSessionStorage(client: RedisSessionStorageClient = redis) {
  return createRedisSessionStorage(client, {
    keyPrefix: "session:",
    ttl: sessionLifetimeSeconds,
  })
}

export const sessionStorage = createSessionStorage()

export { Session }
