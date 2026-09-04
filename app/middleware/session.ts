import { createCookie } from "remix/cookie"
import { Session } from "remix/session"
import { createRedisSessionStorage } from "remix/session-storage/redis"

import { env } from "../env.ts"
import { redis } from "../redis.ts"

export const sessionCookie = createCookie("session", {
  secrets: env.SESSION_SECRETS,
  httpOnly: true,
  sameSite: "Lax",
  maxAge: 30 * 24 * 60 * 60, // 30 days
  path: "/",
  secure: env.NODE_ENV === "production",
})

export const sessionStorage = createRedisSessionStorage(redis, { keyPrefix: "session:" })

export { Session }
