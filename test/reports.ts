import { DatabaseSync } from "node:sqlite"
import type { SQLInputValue } from "node:sqlite"

import { createCookie } from "remix/cookie"
import type { Cookie } from "remix/cookie"
import * as s from "remix/data-schema"
import { Database } from "remix/data-table"
import { createSqliteDatabase } from "remix/data-table/sqlite"
import type { SqliteDatabase, SqliteDatabaseClient, SqliteStatement } from "remix/data-table/sqlite"
import { asyncContext } from "remix/middleware/async-context"
import { RequestContext } from "remix/router"
import type { SessionStorage } from "remix/session"
import { createMemorySessionStorage } from "remix/session-storage/memory"

import type { Comment, Post, User } from "../app/data/schema.ts"
import { comments, posts, users } from "../app/data/schema.ts"
import { createAppRouter } from "../app/router.ts"

export const TEST_REPORT_NOW = new Date("2026-08-17T12:00:00.000Z")

export interface ReportTestApp {
  close(): void
  cookie: Cookie
  database: SqliteDatabase
  router: ReturnType<typeof createAppRouter>
  storage: SessionStorage
}

export interface ReportTestAppOptions {
  photonFetch?: typeof globalThis.fetch
}

export interface ReportCsrfForm {
  cookie: string
  html: string
  token: string
}

export async function runWithReportDatabase<result>(
  database: Database,
  operation: () => Promise<result>,
): Promise<result> {
  let context = new RequestContext(new Request("http://localhost/test-database-context"))
  context.set(Database, database, { property: "db" })
  let outcome: { value: result } | undefined

  await asyncContext()(context, async () => {
    outcome = { value: await operation() }
    return new Response(null, { status: 204 })
  })

  if (outcome == null) throw new Error("Expected the database context operation to run")
  return outcome.value
}

type SeedUserValues = Partial<Pick<User, "id" | "username" | "email" | "password">>
type SeedLegacyPostValues = Partial<Post> & Pick<Post, "authorId">
type SeedStructuredReportValues = Partial<Post> & Pick<Post, "authorId">
type SeedCommentValues = Partial<Comment> & Pick<Comment, "authorId" | "postId">

const sqliteInputSchema = s.union([
  s.null_(),
  s.number(),
  s.bigint(),
  s.string(),
  s.instanceof_(Uint8Array),
  s.instanceof_(Date),
  s.undefined_(),
])
const sqliteOutputSchema = s.union([
  s.null_(),
  s.number(),
  s.bigint(),
  s.string(),
  s.instanceof_(Uint8Array),
])
const sqliteRowSchema = s.record(s.string(), sqliteOutputSchema)

type SqliteInputBoundary = s.InferOutput<typeof sqliteInputSchema>
type SqliteOutputValue = s.InferOutput<typeof sqliteOutputSchema>
type DateAwareSqliteValue = SqliteOutputValue | Date
type DateAwareSqliteRow = Record<string, DateAwareSqliteValue>

export function createReportTestApp(options: ReportTestAppOptions = {}): ReportTestApp {
  let client = new DateAwareSqliteClient()
  client.exec(reportTestSchema)

  let database = createSqliteDatabase(client, {
    now: () => new Date(TEST_REPORT_NOW),
  })
  let cookie = createCookie("report-test-session", {
    secrets: ["report-test-session-secret-is-at-least-32-characters"],
    httpOnly: true,
    sameSite: "Lax",
    path: "/",
    secure: false,
  })
  let storage = createMemorySessionStorage()
  let router = createAppRouter({
    database,
    photonFetch: options.photonFetch ?? emptyPhotonFetch,
    sessionCookie: cookie,
    sessionStorage: storage,
  })

  return {
    cookie,
    database,
    router,
    storage,
    close() {
      client.close()
    },
  }
}

function emptyPhotonFetch(): Promise<Response> {
  return Promise.resolve(Response.json({ type: "FeatureCollection", features: [] }))
}

export async function seedReportUser(
  app: Pick<ReportTestApp, "database">,
  values: SeedUserValues = {},
): Promise<User> {
  return app.database.create(
    users,
    {
      id: "report-author",
      username: "report-author",
      email: "report-author@example.test",
      password: "test-password-hash",
      ...values,
    },
    { returnRow: true },
  )
}

export async function seedLegacyPost(
  app: Pick<ReportTestApp, "database">,
  values: SeedLegacyPostValues,
): Promise<Post> {
  return app.database.create(
    posts,
    {
      id: "legacy-report",
      title: "A legacy renter post",
      content: "This post predates structured renter report metadata.",
      ...values,
    },
    { returnRow: true },
  )
}

export async function seedStructuredReport(
  app: Pick<ReportTestApp, "database">,
  values: SeedStructuredReportValues,
): Promise<Post> {
  return app.database.create(
    posts,
    {
      id: "structured-report",
      address: "123 Main Street",
      city: "Detroit",
      region: "MI",
      landlordName: "Example Homes",
      category: "MAINTENANCE",
      rating: 4,
      title: "Repairs took repeated follow-up",
      content: "I had to follow up several times before a recurring leak was repaired.",
      experienceConfirmedAt: new Date(TEST_REPORT_NOW),
      status: "PUBLISHED",
      ...values,
    },
    { returnRow: true },
  )
}

export async function seedComment(
  app: Pick<ReportTestApp, "database">,
  values: SeedCommentValues,
): Promise<Comment> {
  return app.database.create(
    comments,
    {
      id: "report-comment",
      content: "This report adds useful context.",
      ...values,
    },
    { returnRow: true },
  )
}

export async function createAuthenticatedReportSession(
  app: Pick<ReportTestApp, "cookie" | "storage">,
  user: Pick<User, "id">,
): Promise<string> {
  let session = await app.storage.read(null)
  session.set("auth", { userId: user.id })
  let value = await app.storage.save(session)
  if (value == null) throw new Error("Expected report test session storage to save a session")

  return getRequestCookie(await app.cookie.serialize(value))
}

export async function getReportCsrfForm(
  app: Pick<ReportTestApp, "router">,
  pathname: string,
  cookie?: string,
): Promise<ReportCsrfForm> {
  let headers = new Headers()
  if (cookie) headers.set("Cookie", cookie)

  let response = await app.router.fetch(
    new Request(new URL(pathname, "http://localhost"), { headers }),
  )
  let html = await response.text()
  let token = html.match(/<input[^>]*name="_csrf"[^>]*value="([^"]+)"[^>]*>/)?.[1]
  if (token == null) throw new Error("Expected report test page to render a CSRF token")

  let setCookie = response.headers.get("Set-Cookie")
  let activeCookie = setCookie == null ? cookie : getRequestCookie(setCookie)
  if (activeCookie == null) throw new Error("Expected report CSRF response to set a cookie")

  return { cookie: activeCookie, html, token }
}

class DateAwareSqliteClient implements SqliteDatabaseClient {
  readonly #database = new DatabaseSync(":memory:")
  #open = true

  constructor() {
    this.#database.exec("pragma foreign_keys = on")
  }

  prepare(sql: string): SqliteStatement {
    let statement = this.#database.prepare(sql)

    return {
      all: (...values) => {
        let parameters = values.map((value) =>
          normalizeSqliteInput(s.parse(sqliteInputSchema, value)),
        )
        return statement
          .all(...parameters)
          .map((row) => normalizeSqliteRow(s.parse(sqliteRowSchema, row)))
      },
      get: (...values) => {
        let parameters = values.map((value) =>
          normalizeSqliteInput(s.parse(sqliteInputSchema, value)),
        )
        let row = statement.get(...parameters)
        return row === undefined ? undefined : normalizeSqliteRow(s.parse(sqliteRowSchema, row))
      },
      run: (...values) => {
        let parameters = values.map((value) =>
          normalizeSqliteInput(s.parse(sqliteInputSchema, value)),
        )
        return statement.run(...parameters)
      },
      columns: () => statement.columns(),
    }
  }

  exec(sql: string): void {
    this.#database.exec(sql)
  }

  close(): void {
    if (!this.#open) return
    this.#open = false
    this.#database.close()
  }
}

function normalizeSqliteInput(value: SqliteInputBoundary): SQLInputValue {
  if (value instanceof Date) return value.toISOString()
  if (value === undefined) return null
  return value
}

function normalizeSqliteRow(value: s.InferOutput<typeof sqliteRowSchema>): DateAwareSqliteRow {
  return Object.fromEntries(
    Object.entries(value).map(([key, entry]) => [key, normalizeTimestampValue(key, entry)]),
  )
}

function normalizeTimestampValue(key: string, value: SqliteOutputValue): DateAwareSqliteValue {
  let parsed = s.parseSafe(s.string(), value)
  if (!parsed.success || !/(?:createdAt|updatedAt|experienceConfirmedAt)$/.test(key)) return value

  let date = new Date(parsed.value)
  return Number.isNaN(date.getTime()) ? parsed.value : date
}

function getRequestCookie(setCookie: string): string {
  let cookie = setCookie.split(";", 1)[0]
  if (cookie == null) throw new Error("Expected a cookie header value")
  return cookie
}

const reportTestSchema = `
  create table "User" (
    "id" text primary key,
    "username" text not null,
    "email" text not null,
    "password" text not null,
    "createdAt" text not null,
    "updatedAt" text not null,
    constraint "User_username_key" unique ("username"),
    constraint "User_email_key" unique ("email")
  );

  create table "Post" (
    "id" text primary key,
    "title" text not null,
    "content" text not null,
    "address" text,
    "city" text,
    "region" text,
    "landlordName" text,
    "category" text,
    "rating" integer,
    "latitude" real,
    "longitude" real,
    "experienceConfirmedAt" text,
    "status" text not null default 'PUBLISHED',
    "createdAt" text not null,
    "updatedAt" text not null,
    "authorId" text not null,
    constraint "Post_category_check" check (
      "category" is null or "category" in (
        'MAINTENANCE',
        'RENT_INCREASE',
        'FEES_OR_DEPOSIT',
        'SAFETY',
        'COMMUNICATION',
        'GOOD_EXPERIENCE',
        'OTHER'
      )
    ),
    constraint "Post_rating_check" check ("rating" between 1 and 5),
    constraint "Post_status_check" check ("status" in ('PUBLISHED', 'HIDDEN')),
    constraint "Post_authorId_fkey" foreign key ("authorId") references "User" ("id")
      on delete restrict on update cascade
  );

  create index "Post_public_feed_idx"
    on "Post" ("status", "createdAt" desc, "id" desc);

  create table "Comment" (
    "id" text primary key,
    "content" text not null,
    "createdAt" text not null,
    "updatedAt" text not null,
    "authorId" text not null,
    "postId" text not null,
    constraint "Comment_authorId_fkey" foreign key ("authorId") references "User" ("id")
      on delete restrict on update cascade,
    constraint "Comment_postId_fkey" foreign key ("postId") references "Post" ("id")
      on delete cascade on update cascade
  );

  create index "Comment_postId_createdAt_id_idx"
    on "Comment" ("postId", "createdAt", "id");
`
