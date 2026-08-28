import { createClient } from "redis"
import { createCookie } from "remix/cookie"
import { Session } from "remix/session"
import { createRedisSessionStorage } from "remix/session-storage/redis"

import { env } from "../env.ts"

export const sessionCookie = createCookie("session", {
  secrets: env.SESSION_SECRETS,
  httpOnly: true,
  sameSite: "Lax",
  maxAge: 30 * 24 * 60 * 60, // 30 days
  path: "/",
  secure: env.NODE_ENV === "production",
})

const redis = createClient({
  url: env.REDIS_URL,
  keyPrefix: "session:",
})

export const sessionStorage = createRedisSessionStorage(redis)

export { Session }
