import { createCookie } from "remix/cookie"
import { Session } from "remix/session"
import { createCookieSessionStorage } from "remix/session-storage/cookie"

import { env } from "../env.ts"

export const sessionCookie = createCookie("session", {
  secrets: env.SESSION_SECRETS,
  httpOnly: true,
  sameSite: "Lax",
  maxAge: 30 * 24 * 60 * 60, // 30 days
  path: "/",
  secure: env.NODE_ENV === "production",
})

export const sessionStorage = createCookieSessionStorage()

export { Session }
