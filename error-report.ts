import * as Sentry from "@sentry/node"

declare const sentryDsnBrand: unique symbol

export type SentryDsn = string & { readonly [sentryDsnBrand]: "SentryDsn" }

export interface SilentFailureDisposition {
  readonly kind: "silent"
}

export interface ErrorsOnlyFailureDisposition {
  readonly kind: "errors-only"
  readonly dsn: SentryDsn
}

export type FailureDisposition = SilentFailureDisposition | ErrorsOnlyFailureDisposition

export interface ErrorsOnlyDataCollection {
  readonly userInfo: false
  readonly cookies: false
  readonly httpHeaders: false
  readonly httpBodies: []
  readonly urlQueryParams: false
  readonly stackFrameVariables: false
  readonly databaseQueryData: false
}

export interface ErrorsOnlySentryOptions {
  readonly dsn: SentryDsn
  readonly tracesSampleRate: 0
  readonly tracePropagationTargets: []
  readonly dataCollection: ErrorsOnlyDataCollection
}

export interface ErrorReportSdk {
  init(options: ErrorsOnlySentryOptions): void
  captureException(error: Error): void
  close(timeoutMs: number): Promise<boolean>
}

export interface ProcessErrorReport {
  /**
   * Parse source and store the disposition.
   * Calls sdk.init only when moving from unarmed to errors-only.
   * Same disposition again is a no-op. A different disposition throws.
   * An invalid non-empty DSN throws and leaves the reporter unarmed.
   */
  arm(source: NodeJS.ProcessEnv): FailureDisposition
  /** Send one caught failure when the armed disposition is errors-only. Never throws. */
  report(cause: unknown): void
  /** Flush and disable the SDK during process shutdown. Safe to call twice. */
  drain(): Promise<void>
}

export class InvalidSentryDsnError extends Error {
  constructor(cause: unknown) {
    super("SENTRY_DSN is set and is not a Sentry DSN.", { cause })
  }
}

export class DispositionConflictError extends Error {
  constructor() {
    super("This process already armed a different failure disposition.")
  }
}

const DRAIN_TIMEOUT_MS = 2_000

function brandSentryDsn(value: string): SentryDsn {
  // SAFETY: readFailureDisposition only calls this after protocol, public key, query, hash, and project id checks.
  return value as SentryDsn
}

function readFailureDisposition(source: NodeJS.ProcessEnv): FailureDisposition {
  let raw = source.SENTRY_DSN
  if (raw === undefined) {
    return { kind: "silent" }
  }

  let dsn = raw.trim()
  if (dsn === "") {
    return { kind: "silent" }
  }

  let url = parseDsnUrl(dsn)
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new InvalidSentryDsnError("protocol")
  }
  if (url.username === "") {
    throw new InvalidSentryDsnError("public key")
  }
  if (url.search !== "") {
    throw new InvalidSentryDsnError("query")
  }
  if (url.hash !== "") {
    throw new InvalidSentryDsnError("hash")
  }

  let projectId = ""
  for (let segment of url.pathname.split("/")) {
    if (segment !== "") {
      projectId = segment
    }
  }
  if (!/^\d+$/.test(projectId)) {
    throw new InvalidSentryDsnError("project id")
  }

  return { kind: "errors-only", dsn: brandSentryDsn(dsn) }
}

function parseDsnUrl(dsn: string): URL {
  try {
    return new URL(dsn)
  } catch {
    throw new InvalidSentryDsnError("url")
  }
}

function errorsOnlyInit(dsn: SentryDsn): ErrorsOnlySentryOptions {
  return {
    dsn,
    tracesSampleRate: 0,
    tracePropagationTargets: [],
    dataCollection: {
      userInfo: false,
      cookies: false,
      httpHeaders: false,
      httpBodies: [],
      urlQueryParams: false,
      stackFrameVariables: false,
      databaseQueryData: false,
    },
  }
}

function readThrownError(cause: unknown): Error {
  if (cause instanceof Error) {
    return cause
  }
  if (Object.prototype.toString.call(cause) === "[object String]") {
    return new Error(String(cause))
  }
  return new Error("non-error thrown")
}

function sameFailureDisposition(stored: FailureDisposition, next: FailureDisposition): boolean {
  if (stored.kind === "silent" || next.kind === "silent") {
    return stored.kind === "silent" && next.kind === "silent"
  }
  return stored.dsn === next.dsn
}

export function createProcessErrorReport(sdk: ErrorReportSdk): ProcessErrorReport {
  let disposition: FailureDisposition | undefined
  let drained = false

  return {
    arm(source) {
      let next = readFailureDisposition(source)
      if (disposition === undefined) {
        if (next.kind === "errors-only") {
          sdk.init(errorsOnlyInit(next.dsn))
        }
        disposition = next
        return disposition
      }
      if (sameFailureDisposition(disposition, next)) {
        return disposition
      }
      throw new DispositionConflictError()
    },
    report(cause) {
      if (drained || disposition === undefined || disposition.kind === "silent") {
        return
      }
      try {
        sdk.captureException(readThrownError(cause))
      } catch {
        return
      }
    },
    async drain() {
      if (drained) {
        return
      }
      drained = true
      if (disposition?.kind !== "errors-only") {
        return
      }
      try {
        await sdk.close(DRAIN_TIMEOUT_MS)
      } catch {
        return
      }
    },
  }
}

function createSentryErrorReportSdk(): ErrorReportSdk {
  return {
    init(options) {
      Sentry.init(options)
    },
    captureException(error) {
      Sentry.captureException(error)
    },
    close(timeoutMs) {
      return Sentry.close(timeoutMs)
    },
  }
}

export const processErrorReport = createProcessErrorReport(createSentryErrorReportSdk())
