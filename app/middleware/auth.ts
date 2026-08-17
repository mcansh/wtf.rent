import { createHash } from "node:crypto"

import { createCredentialsAuthProvider } from "remix/auth"
import { Database } from "remix/data-table"
import type { AuthState } from "remix/middleware/auth"
import {
  Auth,
  auth,
  createSessionAuthScheme,
  requireAuth as requireAuthenticated,
} from "remix/middleware/auth"
import { redirect } from "remix/response/redirect"
import type { Middleware } from "remix/router"
import type { Route } from "remix/routes"

import { DUMMY_PASSWORD_HASH, verifyPassword } from "../bcrypt.ts"
import type { User } from "../data/schema.ts"
import { users } from "../data/schema.ts"
import { routes } from "../routes.ts"

interface AuthSession {
  userId: string
}

export interface LoginThrottleOptions {
  maxAttempts?: number
  maxEntries?: number
  now?: () => number
  windowMs?: number
}

export interface LoginThrottleStatus {
  allowed: boolean
  retryAfter: number
}

interface LoginThrottleEntry {
  attempts: number
  resetAt: number
}

export class LoginThrottle {
  readonly #entries = new Map<string, LoginThrottleEntry>()
  readonly #maxAttempts: number
  readonly #maxEntries: number
  readonly #now: () => number
  readonly #windowMs: number

  constructor(options: LoginThrottleOptions = {}) {
    this.#maxAttempts = options.maxAttempts ?? 5
    this.#maxEntries = options.maxEntries ?? 10_000
    this.#now = options.now ?? Date.now
    this.#windowMs = options.windowMs ?? 15 * 60 * 1_000

    if (this.#maxAttempts < 1 || this.#maxEntries < 1 || this.#windowMs < 1) {
      throw new RangeError("Login throttle limits must be positive")
    }
  }

  get size(): number {
    this.#deleteExpired()
    return this.#entries.size
  }

  check(key: string): LoginThrottleStatus {
    let now = this.#now()
    let entry = this.#entries.get(key)

    if (entry == null || now >= entry.resetAt) {
      this.#entries.delete(key)
      return { allowed: true, retryAfter: 0 }
    }

    if (entry.attempts < this.#maxAttempts) {
      return { allowed: true, retryAfter: 0 }
    }

    return {
      allowed: false,
      retryAfter: Math.max(1, Math.ceil((entry.resetAt - now) / 1_000)),
    }
  }

  recordFailure(key: string): void {
    let now = this.#now()
    let entry = this.#entries.get(key)

    if (entry != null && now < entry.resetAt) {
      entry.attempts++
      return
    }

    this.#deleteExpired()
    if (this.#entries.size >= this.#maxEntries) {
      let oldestKey = this.#entries.keys().next().value
      if (oldestKey !== undefined) this.#entries.delete(oldestKey)
    }

    this.#entries.set(key, { attempts: 1, resetAt: now + this.#windowMs })
  }

  reset(key: string): void {
    this.#entries.delete(key)
  }

  #deleteExpired(): void {
    let now = this.#now()
    for (let [key, entry] of this.#entries) {
      if (now >= entry.resetAt) this.#entries.delete(key)
    }
  }
}

export function createLoginThrottle(options?: LoginThrottleOptions): LoginThrottle {
  return new LoginThrottle(options)
}

export function loadLoginThrottle(throttle: LoginThrottle = createLoginThrottle()): Middleware<{
  key: typeof LoginThrottle
  value: LoginThrottle
  property: "loginThrottle"
}> {
  return (context, next) => {
    context.set(LoginThrottle, throttle, { property: "loginThrottle" })
    return next()
  }
}

export function loadAuth() {
  return auth({
    schemes: [
      createSessionAuthScheme<User, AuthSession>({
        read(session) {
          return parseAuthSession(session.get("auth"))
        },
        async verify(value, context) {
          let db = context.get(Database)
          if (db == null) {
            throw new Error("Expected loadDatabase() middleware before loadAuth()")
          }

          let user = await db.find(users, value.userId)

          return user ?? null
        },
        invalidate(session) {
          session.unset("auth")
        },
      }),
    ],
  })
}

export const passwordProvider = createCredentialsAuthProvider({
  parse(context) {
    let formData = context.get(FormData)
    if (formData == null) {
      throw new Error("Expected formData() middleware before password auth provider")
    }

    return {
      email: normalizeEmail(formData.get("email")?.toString() ?? ""),
      password: formData.get("password")?.toString() ?? "",
    }
  },
  async verify({ email, password }, context) {
    let db = context.get(Database)
    if (db == null) {
      throw new Error("Expected loadDatabase() middleware before password auth provider")
    }

    let user = await db.findOne(users, { where: { email } })

    let valid = await verifyPassword(password, user?.password ?? DUMMY_PASSWORD_HASH)

    if (!user || !valid) {
      return null
    }

    return user
  },
})

export interface RequireAuthOptions {
  redirectTo?: Route
}

export interface RequireGuestOptions {
  redirectTo?: Route
}

export function requireAuth(options?: RequireAuthOptions) {
  let redirectTo = options?.redirectTo ?? routes.login.index

  return requireAuthenticated<User>({
    onFailure(context) {
      return redirect(
        redirectTo.href(undefined, {
          searchParams: {
            returnTo:
              getSafeReturnTo(context.url.searchParams.get("returnTo")) ??
              context.url.pathname + context.url.search,
          },
        }),
      )
    },
  })
}

export function requireGuest(options?: RequireGuestOptions): Middleware {
  let redirectTo = options?.redirectTo ?? routes.home

  return (context, next) => {
    let currentAuth = context.get(Auth) as AuthState<User>
    if (currentAuth.ok) {
      return redirect(redirectTo.href(), 303)
    }

    return next()
  }
}

export function getPostAuthRedirect(url: URL, fallback = routes.profile.href()): string {
  return getSafeReturnTo(url.searchParams.get("returnTo")) ?? fallback
}

export function getLoginRedirectURL(url: URL, route: Route<any, any> = routes.login.index): string {
  return route.href(undefined, {
    searchParams: {
      returnTo: getSafeReturnTo(url.searchParams.get("returnTo")),
    },
  })
}

export function parseAuthSession(value: unknown): AuthSession | null {
  if (typeof value !== "object" || value == null) {
    return null
  }

  if (!("userId" in value) || typeof value.userId !== "string") {
    return null
  }

  return { userId: value.userId }
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

export function getLoginThrottleKey(request: Request, email: string): string {
  let forwardedFor = request.headers.get("X-Forwarded-For")?.split(",", 1)[0]?.trim()
  let client = request.headers.get("Cf-Connecting-Ip")?.trim() || forwardedFor || "unknown"
  let identifier = `${client.slice(0, 256)}\0${normalizeEmail(email).slice(0, 512)}`

  return createHash("sha256").update(identifier).digest("base64url")
}

export function getSafeReturnTo(returnTo: string | null): string | undefined {
  if (returnTo == null || returnTo === "") {
    return undefined
  }

  if (
    !returnTo.startsWith("/") ||
    returnTo.startsWith("//") ||
    returnTo.includes("\\") ||
    /[\u0000-\u001f\u007f]/.test(returnTo)
  ) {
    return undefined
  }

  try {
    let base = new URL("http://localhost")
    let resolved = new URL(returnTo, base)
    if (resolved.origin !== base.origin) return undefined

    return resolved.pathname + resolved.search + resolved.hash
  } catch {
    return undefined
  }
}
