import * as s from "remix/data-schema"
import { url } from "remix/data-schema/checks"
import * as coerce from "remix/data-schema/coerce"

export function arrayMinLength<T>(min: number): s.Check<Array<T>> {
  return {
    check(value) {
      return Array.isArray(value) && value.length >= min
    },
    code: "array.minLength",
    message: `Expected array of strings with at least ${min} items`,
  }
}

export function ensureArrayItemMinLength(min: number): s.Check<string[]> {
  return {
    check(value) {
      return Array.isArray(value) && value.every((item) => item.length >= min)
    },
    code: "array.itemMinLength",
    message: `Expected array of strings with each item having at least ${min} characters`,
  }
}

const envSchema = s.object({
  NODE_ENV: s.defaulted(s.enum_(["development", "test", "production"]), "development"),
  PORT: s.defaulted(coerce.number(), 3000),
  DATABASE_URL: s.string().pipe(url()),
  REDIS_URL: s.string().pipe(url()),
  SESSION_SECRETS: s
    .string()
    .transform((value) =>
      value
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    )
    .pipe(arrayMinLength(1), ensureArrayItemMinLength(32)),
})

const testDefaults = {
  DATABASE_URL: "postgresql://test:test@localhost:5432/wtf_rent_test",
  SESSION_SECRETS: "test-session-secret-that-is-at-least-32-characters",
  REDIS_URL: "redis://localhost:6379",
}

export function readEnv(source: NodeJS.ProcessEnv) {
  let input =
    source.NODE_ENV === "test"
      ? {
          ...source,
          DATABASE_URL: source.DATABASE_URL ?? testDefaults.DATABASE_URL,
          SESSION_SECRETS: source.SESSION_SECRETS ?? testDefaults.SESSION_SECRETS,
          REDIS_URL: source.REDIS_URL ?? testDefaults.REDIS_URL,
        }
      : source

  return s.parse(envSchema, input, { abortEarly: false })
}

export const env = readEnv(process.env)
