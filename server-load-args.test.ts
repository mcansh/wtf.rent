import { spawnSync } from "node:child_process"
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

import * as assert from "remix/assert"
import { describe, it } from "remix/test"

import { serverLoadArgs } from "./server-load-args.ts"

interface ServerScripts {
  readonly start: string
  readonly "dev:server": string
}

function readServerScripts(packageJsonText: string): ServerScripts {
  let packageJson = JSON.parse(packageJsonText)
  let start = packageJson.scripts.start
  let devServer = packageJson.scripts["dev:server"]
  if (
    Object.prototype.toString.call(start) !== "[object String]" ||
    Object.prototype.toString.call(devServer) !== "[object String]"
  ) {
    throw new Error("package.json start and dev:server must be strings")
  }
  return { start, "dev:server": devServer }
}

describe("server load args", () => {
  it("keeps the shared preload inside start and dev:server", () => {
    let packageJsonText = readFileSync(join(import.meta.dirname, "package.json"), "utf8")
    let scripts: ServerScripts = readServerScripts(packageJsonText)
    let preload = serverLoadArgs.join(" ")
    assert.equal(scripts.start.includes(preload), true, scripts.start)
    assert.equal(scripts["dev:server"].includes(preload), true, scripts["dev:server"])
  })

  it("lets the preload read an env file that follows the import", () => {
    let directory = mkdtempSync(join(tmpdir(), "server-load-args-"))
    let preloadPath = join(directory, "print-fixture.mjs")
    let envPath = join(directory, "fixture.env")
    let token = "seen-by-preload"
    try {
      writeFileSync(preloadPath, 'console.log(process.env.SERVER_LOAD_FIXTURE ?? "")\n')
      writeFileSync(envPath, `SERVER_LOAD_FIXTURE=${token}\n`)
      let env = { ...process.env }
      delete env.SERVER_LOAD_FIXTURE
      let result = spawnSync(
        process.execPath,
        ["--import", preloadPath, "--env-file-if-exists", envPath, "--eval", "process.exit(0)"],
        { encoding: "utf8", env },
      )
      assert.equal(result.status, 0, result.stderr)
      assert.equal(result.stdout.includes(token), true, result.stdout)
    } finally {
      rmSync(directory, { recursive: true, force: true })
    }
  })
})
