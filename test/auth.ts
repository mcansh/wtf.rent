import { createCookie } from "remix/cookie"
import type { Cookie } from "remix/cookie"
import * as s from "remix/data-schema"
import { Database, getTableName } from "remix/data-table"
import type {
  DataManipulationOperation,
  DataManipulationRequest,
  DataManipulationResult,
  DatabaseCapabilities,
  DatabaseDriver,
  Predicate,
  TableRef,
  TransactionToken,
} from "remix/data-table"
import type { Session, SessionStorage } from "remix/session"
import { createMemorySessionStorage } from "remix/session-storage/memory"

import type { User } from "../app/data/schema.ts"
import type { LoginThrottle } from "../app/middleware/auth.ts"
import { createAppRouter } from "../app/router.ts"

export const TEST_USER_PASSWORD = "not-a-real-user-password"
export const TEST_USER_PASSWORD_HASH =
  "$2b$12$vJ1orAwyHYmqneb.rktQl.6xY2LbXZbNmv2LU4PeO5hrg14wmey.2"

const fakeDatabaseCapabilities = {
  migrationLock: false,
  returning: true,
  savepoints: false,
  transactionalDdl: false,
  upsert: false,
} as const satisfies DatabaseCapabilities

const fakeUserRowSchema = s.object({
  id: s.string(),
  username: s.string(),
  email: s.string(),
  password: s.string(),
  createdAt: s.instanceof_(Date),
  updatedAt: s.instanceof_(Date),
})

const userColumns = new Set(["id", "username", "email", "password", "createdAt", "updatedAt"])

type FakeInsertOperation = Extract<DataManipulationOperation, { kind: "insert" }>
type FakeSelectOperation = Extract<DataManipulationOperation, { kind: "select" }>

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

class FakeUniqueConstraintError extends Error {
  readonly code = "23505"

  constructor(readonly constraint: string) {
    super("duplicate key value violates unique constraint")
  }
}

class FakeUserDatabaseDriver implements DatabaseDriver<"test"> {
  readonly capabilities = fakeDatabaseCapabilities
  readonly dialect = "test"
  readonly users: User[]

  constructor(users: User[] = []) {
    this.users = [...users]
  }

  async execute(request: DataManipulationRequest): Promise<DataManipulationResult> {
    switch (request.operation.kind) {
      case "insert":
        return this.#insert(request.operation)
      case "select":
        return this.#select(request.operation)
      default:
        throw new Error(`Unsupported fake database operation: ${request.operation.kind}`)
    }
  }

  async executeScript(_sql: string, _transaction?: TransactionToken): Promise<void> {
    throw new Error("Fake user database does not execute SQL scripts")
  }

  async beginTransaction(): Promise<TransactionToken> {
    throw new Error("Fake user database does not support transactions")
  }

  async commitTransaction(_token: TransactionToken): Promise<void> {
    throw new Error("Fake user database does not support transactions")
  }

  async rollbackTransaction(_token: TransactionToken): Promise<void> {
    throw new Error("Fake user database does not support transactions")
  }

  async hasTable(table: TableRef): Promise<boolean> {
    return table.name === "User"
  }

  async hasColumn(table: TableRef, column: string): Promise<boolean> {
    return table.name === "User" && userColumns.has(column)
  }

  async createSavepoint(_token: TransactionToken, _name: string): Promise<void> {
    throw new Error("Fake user database does not support savepoints")
  }

  async rollbackToSavepoint(_token: TransactionToken, _name: string): Promise<void> {
    throw new Error("Fake user database does not support savepoints")
  }

  async releaseSavepoint(_token: TransactionToken, _name: string): Promise<void> {
    throw new Error("Fake user database does not support savepoints")
  }

  async wipe(): Promise<void> {
    this.users.length = 0
  }

  close(): void {}

  #insert(operation: FakeInsertOperation): DataManipulationResult {
    this.#assertUsersTable(operation)
    let user = s.parse(fakeUserRowSchema, operation.values)

    if (this.users.some((existingUser) => existingUser.email === user.email)) {
      throw new FakeUniqueConstraintError("User_email_key")
    }
    if (this.users.some((existingUser) => existingUser.username === user.username)) {
      throw new FakeUniqueConstraintError("User_username_key")
    }

    this.users.push(user)
    if (operation.returning == null) return { affectedRows: 1 }

    return { affectedRows: 1, rows: [{ ...user }] }
  }

  #select(operation: FakeSelectOperation): DataManipulationResult {
    this.#assertUsersTable(operation)
    if (operation.select !== "*") {
      throw new Error("Fake user database only supports full-row selections")
    }

    let offset = operation.offset ?? 0
    let end = operation.limit == null ? undefined : offset + operation.limit
    let rows = this.users
      .filter((user) => operation.where.every((predicate) => matchesUser(user, predicate)))
      .slice(offset, end)
      .map((user) => ({ ...user }))

    return { rows }
  }

  #assertUsersTable(operation: FakeInsertOperation | FakeSelectOperation): void {
    if (getTableName(operation.table) !== "User") {
      throw new Error(`Fake user database cannot access table ${getTableName(operation.table)}`)
    }
  }
}

export class FakeUserDatabase extends Database<"test"> {
  readonly #testDriver: FakeUserDatabaseDriver

  constructor(users: User[] = []) {
    let driver = new FakeUserDatabaseDriver(users)
    super(driver, { now: () => new Date("2026-08-17T00:00:00.000Z") })
    this.#testDriver = driver
  }

  get users(): User[] {
    return this.#testDriver.users
  }
}

function matchesUser(user: User, predicate: Predicate): boolean {
  if (predicate.type === "logical") {
    return predicate.operator === "and"
      ? predicate.predicates.every((child) => matchesUser(user, child))
      : predicate.predicates.some((child) => matchesUser(user, child))
  }

  if (
    predicate.type !== "comparison" ||
    predicate.operator !== "eq" ||
    predicate.valueType !== "value"
  ) {
    throw new Error("Fake user database only supports equality predicates")
  }

  return getUserColumnValue(user, predicate.column) === predicate.value
}

function getUserColumnValue(user: User, column: string): string {
  switch (column) {
    case "id":
    case "User.id":
      return user.id
    case "email":
    case "User.email":
      return user.email
    case "username":
    case "User.username":
      return user.username
    default:
      throw new Error(`Fake user database cannot filter by column ${column}`)
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
    database: options.database ?? database,
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

  let url = new URL(pathname, "http://localhost")

  return {
    ...form,
    request: new Request(url, {
      method,
      headers: { Cookie: form.cookie, Origin: url.origin },
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
  let cookie = setCookie.split(";", 1)[0]
  if (cookie == null) throw new Error("Expected a cookie header value")
  return cookie
}
