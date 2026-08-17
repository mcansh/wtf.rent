import { createCookie } from "remix/cookie"
import type { Cookie } from "remix/cookie"
import type { Database } from "remix/data-table"
import type { Session, SessionStorage } from "remix/session"
import { createMemorySessionStorage } from "remix/session-storage/memory"

import type { User } from "../app/data/schema.ts"
import type { LoginThrottle } from "../app/middleware/auth.ts"
import { createAppRouter } from "../app/router.ts"

export interface AuthTestRouterOptions {
  database?: Database
  loginThrottle?: LoginThrottle
}

export interface AuthTestApp {
  cookie: Cookie
  database: FakeUserDatabase
  router: ReturnType<typeof createAppRouter>
  storage: SessionStorage
}

export interface CsrfFormRequest {
  cookie: string
  html: string
  request: Request
  token: string
}

export class FakeUserDatabase {
  readonly users: User[]

  constructor(users: User[] = []) {
    this.users = [...users]
  }

  asDatabase(): Database {
    return this as unknown as Database
  }

  async find(_table: unknown, id: string): Promise<User | null> {
    return this.users.find((user) => user.id === id) ?? null
  }

  async findOne(_table: unknown, options: { where: { email?: string } }): Promise<User | null> {
    let email = options.where.email
    let username = (options.where as { username?: string }).username
    return (
      this.users.find(
        (user) =>
          (email !== undefined && user.email === email) ||
          (username !== undefined && user.username === username),
      ) ?? null
    )
  }

  async create(
    _table: unknown,
    values: Partial<User>,
    _options: { returnRow: true },
  ): Promise<User> {
    if (this.users.some((user) => user.email === values.email)) {
      throw new FakeUniqueConstraintError("User_email_key")
    }
    if (this.users.some((user) => user.username === values.username)) {
      throw new FakeUniqueConstraintError("User_username_key")
    }

    let now = new Date("2026-08-17T00:00:00.000Z")
    let user: User = {
      id: values.id ?? `user-${this.users.length + 1}`,
      username: String(values.username),
      email: String(values.email),
      password: String(values.password),
      createdAt: values.createdAt ?? now,
      updatedAt: values.updatedAt ?? now,
    }
    this.users.push(user)
    return user
  }
}

class FakeUniqueConstraintError extends Error {
  readonly code = "23505"

  constructor(readonly constraint: string) {
    super("duplicate key value violates unique constraint")
  }
}

export function createAuthTestApp(options: AuthTestRouterOptions = {}): AuthTestApp {
  let cookie = createCookie("test-session", {
    secrets: ["test-session-secret-that-is-at-least-32-characters"],
    httpOnly: true,
    sameSite: "Lax",
    path: "/",
    secure: false,
  })
  let storage = createMemorySessionStorage()
  let database =
    options.database instanceof FakeUserDatabase ? options.database : new FakeUserDatabase()
  let router = createAppRouter({
    database: options.database ?? database.asDatabase(),
    loginThrottle: options.loginThrottle,
    sessionCookie: cookie,
    sessionStorage: storage,
  })

  return { cookie, database, router, storage }
}

export function createAuthTestRouter(options: AuthTestRouterOptions = {}) {
  return createAuthTestApp(options).router
}

export async function createCsrfFormRequest(
  app: AuthTestApp,
  pathname: string,
  values: Record<string, string>,
  cookie?: string,
  method = "POST",
): Promise<CsrfFormRequest> {
  let form = await getCsrfForm(app, pathname, cookie)
  let formData = new FormData()
  for (let [name, value] of Object.entries(values)) formData.set(name, value)
  formData.set("_csrf", form.token)

  return {
    ...form,
    request: new Request(new URL(pathname, "http://localhost"), {
      method,
      headers: { Cookie: form.cookie },
      body: formData,
    }),
  }
}

export async function getCsrfForm(
  app: AuthTestApp,
  pathname: string,
  cookie?: string,
): Promise<Omit<CsrfFormRequest, "request">> {
  let headers = new Headers()
  if (cookie) headers.set("Cookie", cookie)

  let response = await app.router.fetch(
    new Request(new URL(pathname, "http://localhost"), { headers }),
  )
  let html = await response.text()
  let token = html.match(/<input[^>]*name="_csrf"[^>]*value="([^"]+)"[^>]*>/)?.[1]
  if (token == null) throw new Error("Expected page to render a CSRF token")

  let setCookie = response.headers.get("Set-Cookie")
  let activeCookie = setCookie == null ? cookie : getRequestCookie(setCookie)
  if (activeCookie == null) throw new Error("Expected CSRF form response to set a cookie")

  return { cookie: activeCookie, html, token }
}

export async function createSessionCookie(
  app: Pick<AuthTestApp, "cookie" | "storage">,
  setup: (session: Session) => void,
): Promise<string> {
  let session = await app.storage.read(null)
  setup(session)
  let value = await app.storage.save(session)
  if (value == null) throw new Error("Expected test session storage to save a session")

  return getRequestCookie(await app.cookie.serialize(value))
}

export function getResponseCookie(response: Response): string {
  let value = response.headers.get("Set-Cookie")
  if (value == null) throw new Error("Expected response to set a cookie")
  return getRequestCookie(value)
}

export async function readSessionCookie(
  app: Pick<AuthTestApp, "cookie" | "storage">,
  cookieHeader: string,
): Promise<Session> {
  let value = await app.cookie.parse(cookieHeader)
  return app.storage.read(value)
}

function getRequestCookie(setCookie: string): string {
  return setCookie.split(";", 1)[0]!
}
