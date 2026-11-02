import * as Sentry from "@sentry/node"
import type { NodeOptions } from "@sentry/node"

declare const sentryDsnBrand: unique symbol

/** Trimmed Sentry DSN string that readFailureDisposition already accepted. */
export type SentryDsn = string & { readonly [sentryDsnBrand]: "SentryDsn" }

export interface SilentFailureDisposition {
  readonly kind: "silent"
}

export interface ErrorsOnlyFailureDisposition {
  readonly kind: "errors-only"
  readonly dsn: SentryDsn
}

/**
 * Armed state of this process.
 * There is no tracing state. A sample rate other than 0 cannot be stored.
 */
export type FailureDisposition = SilentFailureDisposition | ErrorsOnlyFailureDisposition

/**
 * Fields the SDK receives on the only enabled init.
 * Literal types pin every signal this process is willing to turn on.
 * In v10, sendDefaultPii controls collection when dataCollection is absent.
 * From v11, the collection defaults apply on their own, so these keys are set false.
 * Docs: https://docs.sentry.io/platforms/javascript/guides/node/configuration/options/
 */
export interface ErrorsOnlyDataCollection {
  readonly userInfo: false
  readonly cookies: false
  readonly httpHeaders: false
  readonly httpBodies: readonly []
  readonly urlQueryParams: false
  readonly stackFrameVariables: false
  readonly databaseQueryData: false
}

export interface ErrorsOnlySentryOptions {
  readonly dsn: SentryDsn
  readonly tracesSampleRate: 0
  readonly sendDefaultPii: false
  readonly enableLogs: false
  readonly tracePropagationTargets: readonly []
  readonly dataCollection: ErrorsOnlyDataCollection
}

/** Port the tests implement. Production supplies the private @sentry/node adapter. */
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

/** Fixed message. The raw DSN is not part of the message or the cause string. */
export class InvalidSentryDsnError extends Error {
  constructor(cause: unknown) {
    super("SENTRY_DSN is set and is not a Sentry DSN.", { cause })
  }
}

/** Second arm disagreed with the disposition already stored. The first client stays. */
export class DispositionConflictError extends Error {
  constructor() {
    super("This process already armed a different failure disposition.")
  }
}

const DRAIN_TIMEOUT_MS = 2_000

function brandSentryDsn(value: string): SentryDsn {
  // SAFETY: readFailureDisposition accepted http or https, a non-empty public key, and a numeric project id.
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
    sendDefaultPii: false,
    enableLogs: false,
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

/**
 * Each call owns its disposition cell. Tests use this so cases do not share the singleton.
 * The real SDK adapter is not an argument the app can reach.
 */
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
      let initOptions: unknown = options
      // SAFETY: ErrorsOnlySentryOptions is the only init record. Its empty lists are the arrays NodeOptions stores, and sendDefaultPii plus enableLogs stay set for the v10 collection switch even though @sentry/node 11's option types omit them.
      Sentry.init(initOptions as NodeOptions)
    },
    captureException(error) {
      Sentry.captureException(error)
    },
    // close flushes, then disables the client. It does not remove listeners.
    // server.ts exits after drain, so leftover listeners end with the process.
    // https://docs.sentry.io/platforms/javascript/guides/node/configuration/apis/
    close(timeoutMs) {
      return Sentry.close(timeoutMs)
    },
  }
}

/**
 * The process reporter server.ts and instrument.ts share.
 * Constructing it does not read the environment and does not call Sentry.init.
 */
export const processErrorReport = createProcessErrorReport(createSentryErrorReportSdk())
