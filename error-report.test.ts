import * as assert from "remix/assert"
import { describe, it } from "remix/test"

import {
  createProcessErrorReport,
  DispositionConflictError,
  InvalidSentryDsnError,
} from "./error-report.ts"
import type { ErrorReportSdk, ErrorsOnlySentryOptions, ProcessErrorReport } from "./error-report.ts"

const sentryDsn = "https://public@o1.ingest.sentry.io/456"

interface RecordedSdk {
  sdk: ErrorReportSdk
  inits: ErrorsOnlySentryOptions[]
  captured: Error[]
  closes: number[]
}

interface ArmedReport {
  recorded: RecordedSdk
  reporter: ProcessErrorReport
}

interface InvalidDsnCase {
  readonly dsn: string
  readonly cause: string
}

function recordedSdk(): RecordedSdk {
  let inits: ErrorsOnlySentryOptions[] = []
  let captured: Error[] = []
  let closes: number[] = []
  let sdk: ErrorReportSdk = {
    init(options) {
      inits.push(options)
    },
    captureException(error) {
      captured.push(error)
    },
    close(timeoutMs) {
      closes.push(timeoutMs)
      return Promise.resolve(true)
    },
  }
  return { sdk, inits, captured, closes }
}

function armedReporter(source: NodeJS.ProcessEnv): ArmedReport {
  let recorded = recordedSdk()
  let reporter = createProcessErrorReport(recorded.sdk)
  reporter.arm(source)
  return { recorded, reporter }
}

describe("process error report", () => {
  it("initializes errors-only once for a valid DSN", () => {
    let recorded = recordedSdk()
    let reporter = createProcessErrorReport(recorded.sdk)
    let disposition = reporter.arm({ SENTRY_DSN: sentryDsn })

    if (disposition.kind !== "errors-only") {
      assert.fail("Expected an errors-only disposition")
    }
    assert.equal(disposition.dsn, sentryDsn)
    assert.deepEqual(recorded.inits, [
      {
        dsn: sentryDsn,
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
      },
    ])

    let again = reporter.arm({ SENTRY_DSN: sentryDsn })
    assert.equal(again, disposition)
    assert.equal(recorded.inits.length, 1)
  })

  it("keeps the trimmed DSN text", () => {
    let recorded = recordedSdk()
    let reporter = createProcessErrorReport(recorded.sdk)
    let padded = reporter.arm({ SENTRY_DSN: `  ${sentryDsn}\n` })
    if (padded.kind !== "errors-only") {
      assert.fail("Expected an errors-only disposition")
    }
    assert.equal(padded.dsn, sentryDsn)
    assert.equal(recorded.inits[0]?.dsn, sentryDsn)
    assert.equal(recorded.inits.length, 1)
  })

  it("stores a DSN whose host casing differs from URL.href", () => {
    let dsn = "HTTPS://Public@Host/456"
    let recorded = recordedSdk()
    let reporter = createProcessErrorReport(recorded.sdk)
    let disposition = reporter.arm({ SENTRY_DSN: dsn })
    if (disposition.kind !== "errors-only") {
      assert.fail("Expected an errors-only disposition")
    }
    assert.equal(disposition.dsn, dsn)
    assert.notEqual(disposition.dsn, new URL(dsn).href)
    assert.equal(recorded.inits[0]?.dsn, dsn)
  })

  it("accepts a legacy secret in the DSN", () => {
    let dsn = "https://public:secret@o1.ingest.sentry.io/456"
    let recorded = recordedSdk()
    let reporter = createProcessErrorReport(recorded.sdk)
    let disposition = reporter.arm({ SENTRY_DSN: dsn })
    if (disposition.kind !== "errors-only") {
      assert.fail("Expected an errors-only disposition")
    }
    assert.equal(disposition.dsn, dsn)
    assert.equal(recorded.inits.length, 1)
    assert.equal(recorded.inits[0]?.tracesSampleRate, 0)
  })

  it("stays silent for a missing, empty, or whitespace DSN", () => {
    let sources: NodeJS.ProcessEnv[] = [{}, { SENTRY_DSN: "" }, { SENTRY_DSN: "   " }]
    for (let source of sources) {
      let recorded = recordedSdk()
      let reporter = createProcessErrorReport(recorded.sdk)
      let first = reporter.arm(source)
      let second = reporter.arm(source)
      assert.equal(first.kind, "silent")
      assert.equal(second, first)
      assert.deepEqual(recorded.inits, [])
    }
  })

  it("rejects a non-DSN without echoing it or initializing", () => {
    let secret = "sentry-secret-token"
    let recorded = recordedSdk()
    let reporter = createProcessErrorReport(recorded.sdk)
    assert.throws(
      () => reporter.arm({ SENTRY_DSN: secret }),
      (cause: unknown) => {
        assert.ok(cause instanceof InvalidSentryDsnError)
        assert.equal(cause.message, "SENTRY_DSN is set and is not a Sentry DSN.")
        assert.equal(cause.message.includes(secret), false)
        assert.equal(String(cause.cause).includes(secret), false)
        assert.equal(cause.cause, "url")
        return true
      },
    )
    assert.deepEqual(recorded.inits, [])

    let cases: InvalidDsnCase[] = [
      { dsn: "ftp://public@host/1", cause: "protocol" },
      { dsn: "https://host/1", cause: "public key" },
      { dsn: `https://public@host/1?token=${secret}`, cause: "query" },
      { dsn: `https://public@host/1#${secret}`, cause: "hash" },
      { dsn: "https://public@host/abc", cause: "project id" },
      { dsn: `https://${secret}@host/456/extra`, cause: "project id" },
    ]
    for (let invalid of cases) {
      let attempt = recordedSdk()
      let next = createProcessErrorReport(attempt.sdk)
      assert.throws(
        () => next.arm({ SENTRY_DSN: invalid.dsn }),
        (cause: unknown) => {
          assert.ok(cause instanceof InvalidSentryDsnError)
          assert.equal(cause.message, "SENTRY_DSN is set and is not a Sentry DSN.")
          assert.equal(cause.message.includes(invalid.dsn), false)
          assert.equal(String(cause.cause).includes(invalid.dsn), false)
          assert.equal(String(cause.cause).includes(secret), false)
          assert.equal(cause.cause, invalid.cause)
          return true
        },
      )
      assert.deepEqual(attempt.inits, [])
    }
  })

  it("keeps the first client when a later arm disagrees", () => {
    let recorded = recordedSdk()
    let reporter = createProcessErrorReport(recorded.sdk)
    let first = reporter.arm({ SENTRY_DSN: sentryDsn })
    assert.throws(
      () => reporter.arm({ SENTRY_DSN: "https://other@o1.ingest.sentry.io/789" }),
      (cause: unknown) => {
        assert.ok(cause instanceof DispositionConflictError)
        return true
      },
    )
    assert.equal(recorded.inits.length, 1)
    let again = reporter.arm({ SENTRY_DSN: sentryDsn })
    assert.equal(again, first)
    assert.equal(recorded.inits.length, 1)

    let silentRecorded = recordedSdk()
    let silent = createProcessErrorReport(silentRecorded.sdk)
    let stored = silent.arm({})
    assert.throws(() => silent.arm({ SENTRY_DSN: sentryDsn }), DispositionConflictError)
    assert.equal(silent.arm({}), stored)
    assert.deepEqual(silentRecorded.inits, [])
  })

  it("stays unarmed when init throws", () => {
    let attempts = 0
    let sdk: ErrorReportSdk = {
      init() {
        attempts += 1
        if (attempts === 1) {
          throw new Error("init failed")
        }
      },
      captureException() {},
      close() {
        return Promise.resolve(true)
      },
    }
    let reporter = createProcessErrorReport(sdk)
    assert.throws(() => reporter.arm({ SENTRY_DSN: sentryDsn }), /init failed/)
    let disposition = reporter.arm({ SENTRY_DSN: sentryDsn })
    assert.equal(disposition.kind, "errors-only")
    reporter.arm({ SENTRY_DSN: sentryDsn })
    assert.equal(attempts, 2)
  })

  it("captures the same Error only after an errors-only arm", () => {
    let before = recordedSdk()
    let unarmed = createProcessErrorReport(before.sdk)
    let failure = new Error("request failed")
    unarmed.report(failure)
    assert.deepEqual(before.captured, [])

    let silent = armedReporter({})
    silent.reporter.report(failure)
    assert.deepEqual(silent.recorded.captured, [])

    let armed = armedReporter({ SENTRY_DSN: sentryDsn })
    armed.reporter.report(failure)
    armed.reporter.report("disk full")
    armed.reporter.report(42)
    assert.equal(armed.recorded.captured[0], failure)
    assert.equal(armed.recorded.captured[1] instanceof Error, true)
    assert.equal(armed.recorded.captured[1]?.message, "disk full")
    assert.equal(armed.recorded.captured[2]?.message, "non-error thrown")
  })

  it("swallows capture failures", () => {
    let sdk: ErrorReportSdk = {
      init() {},
      captureException() {
        throw new Error("capture failed")
      },
      close() {
        return Promise.resolve(true)
      },
    }
    let reporter = createProcessErrorReport(sdk)
    reporter.arm({ SENTRY_DSN: sentryDsn })
    assert.doesNotThrow(() => reporter.report(new Error("request failed")))
  })

  it("closes once after an errors-only arm and ignores other drains", async () => {
    let armed = armedReporter({ SENTRY_DSN: sentryDsn })
    await armed.reporter.drain()
    await armed.reporter.drain()
    assert.deepEqual(armed.recorded.closes, [2000])
    armed.reporter.report(new Error("late"))
    assert.equal(armed.recorded.captured.length, 0)

    let silent = armedReporter({})
    await silent.reporter.drain()
    assert.deepEqual(silent.recorded.closes, [])

    let unarmed = recordedSdk()
    await createProcessErrorReport(unarmed.sdk).drain()
    assert.deepEqual(unarmed.closes, [])
  })

  it("swallows a close failure and does not close again", async () => {
    let closes = 0
    let sdk: ErrorReportSdk = {
      init() {},
      captureException() {},
      close() {
        closes += 1
        return Promise.reject(new Error("close failed"))
      },
    }
    let reporter = createProcessErrorReport(sdk)
    reporter.arm({ SENTRY_DSN: sentryDsn })
    await assert.doesNotReject(reporter.drain())
    await reporter.drain()
    assert.equal(closes, 1)
  })
})
