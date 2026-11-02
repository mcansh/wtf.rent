import { spawnSync } from "node:child_process"
import type { SpawnSyncReturns } from "node:child_process"

import * as assert from "remix/assert"
import { describe, it } from "remix/test"

const sentryShutdownTimeoutMs = 2_000
const rejectionFallbackMs = sentryShutdownTimeoutMs + 500
const spawnWatchdogMs = rejectionFallbackMs + 1_000
const rejectionTestTimeoutMs = spawnWatchdogMs * 2 + 1_000
const sentryDsn = "http://public@127.0.0.1:9/456"
const uppercaseDsn = "HTTPS://Public@o1.ingest.sentry.io/456"
const rejectionEval = `void Promise.reject(new Error("boom")); setTimeout(() => process.exit(0), ${rejectionFallbackMs})`
const dsnEval = `
import * as Sentry from "@sentry/node"
let dsn = Sentry.getClient()?.getDsn()
console.log("INSTRUMENT_DSN " + JSON.stringify({
  protocol: dsn?.protocol ?? null,
  host: dsn?.host ?? null,
  projectId: dsn?.projectId ?? null,
}))
`

function spawnInstrument(source: NodeJS.ProcessEnv, evalSource: string): SpawnSyncReturns<string> {
  let env = { ...process.env, ...source }
  if (!Object.hasOwn(source, "SENTRY_DSN")) {
    delete env.SENTRY_DSN
  }
  return spawnSync(
    process.execPath,
    [
      "--import",
      "remix/node-tsx",
      "--import",
      "./instrument.ts",
      "--input-type=module",
      "-e",
      evalSource,
    ],
    { cwd: import.meta.dirname, encoding: "utf8", env, timeout: spawnWatchdogMs },
  )
}

function assertFatalRejection(result: SpawnSyncReturns<string>) {
  assert.equal(result.error, undefined, result.error?.message ?? result.stderr)
  assert.notEqual(result.status, 0, result.stderr)
}

describe("instrument preload", () => {
  it(
    "exits on unhandled rejection with and without a DSN",
    { timeout: rejectionTestTimeoutMs },
    () => {
      let silent = spawnInstrument({}, rejectionEval)
      assertFatalRejection(silent)
      let armed = spawnInstrument({ SENTRY_DSN: sentryDsn }, rejectionEval)
      assertFatalRejection(armed)
    },
  )

  it("initializes a usable client from an uppercase protocol", () => {
    let result = spawnInstrument({ SENTRY_DSN: uppercaseDsn }, dsnEval)
    assert.equal(result.status, 0, result.stderr)
    assert.equal(
      result.stdout.includes(
        'INSTRUMENT_DSN {"protocol":"https","host":"o1.ingest.sentry.io","projectId":"456"}',
      ),
      true,
      result.stdout,
    )
  })
})
