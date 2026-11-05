import { spawnSync } from "node:child_process"
import { mkdtempSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { describe, it } from "node:test"
import { fileURLToPath } from "node:url"

import * as assert from "remix/assert"

const repoRoot = fileURLToPath(new URL("../..", import.meta.url))
const oxlint = fileURLToPath(new URL("../../node_modules/.bin/oxlint", import.meta.url))

function lint(source: string): string {
  let dir = mkdtempSync(join(tmpdir(), "array-method-let-"))
  let file = join(dir, "fixture.ts")
  writeFileSync(file, source)
  let result = spawnSync(oxlint, ["--format", "unix", file], {
    encoding: "utf8",
    cwd: repoRoot,
  })
  return `${result.stdout}${result.stderr}`
}

describe("array method evidence", () => {
  it("reports filter/map pipelines on unreassigned local let arrays", () => {
    let output = lint(`
function pipeline() {
  let values = [1, 2, 3]
  return values.filter(Boolean).map(String)
}
`)
    assert.match(output, /anti-slop\(no-array-filter-map\)/)
    assert.doesNotMatch(output, /remix-style\(prefer-let-locals\)/)
  })

  it("reports reducer copies through local let seeds and aliases", () => {
    let output = lint(`
function copiedSeed(values: number[]) {
  let initial = [0]
  return values.reduce((acc, value) => acc.concat(value), initial)
}

function copiedAlias(values: number[]) {
  return values.reduce((acc, value) => {
    let alias = acc
    return alias.concat(value)
  }, [0])
}
`)
    assert.equal(output.match(/anti-slop\(no-reduce-accumulator-copy\)/g)?.length, 2)
    assert.doesNotMatch(output, /remix-style\(prefer-let-locals\)/)
  })

  it("does not treat a reassigned let binding as local array evidence", () => {
    let output = lint(`
function reassigned() {
  let values = [1, 2, 3]
  values = [4, 5]
  return values.filter(Boolean).map(String)
}
`)
    assert.doesNotMatch(output, /anti-slop\(no-array-filter-map\)/)
  })
})
