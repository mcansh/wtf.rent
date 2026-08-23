import { describe, it } from "node:test"

import * as assert from "remix/assert"
import { createRouter } from "remix/router"

import type { RequestTelemetryRecord } from "./request-telemetry.ts"
import { requestTelemetry } from "./request-telemetry.ts"

describe("request telemetry", () => {
  it("preserves the response and emits one redacted completion record", async () => {
    let records: RequestTelemetryRecord[] = []
    let ticks = [100, 112.5]
    let router = createRouter({
      middleware: [
        requestTelemetry({
          createRequestId: () => "generated-completion-id",
          now: () => ticks.shift()!,
          sink: (record) => records.push(record),
        }),
      ],
    })

    router.get(
      "/posts/private-user@example.com",
      () =>
        new Response("preserved body", {
          status: 201,
          statusText: "Created here",
          headers: { "X-Existing": "preserved header" },
        }),
    )

    let response = await router.fetch(
      new Request("http://localhost/posts/private-user@example.com?q=private-address", {
        headers: { "X-Request-Id": "Alice-Home-Address" },
      }),
    )

    assert.equal(response.status, 201)
    assert.equal(response.statusText, "Created here")
    assert.equal(response.headers.get("X-Existing"), "preserved header")
    assert.equal(response.headers.get("X-Request-Id"), "generated-completion-id")
    assert.equal(await response.text(), "preserved body")
    assert.deepEqual(records, [
      {
        event: "http_request_completed",
        requestId: "generated-completion-id",
        method: "GET",
        pathname: "/:segment/:segment",
        statusClass: "2xx",
        durationMs: 12.5,
      },
    ])
    assert.doesNotMatch(
      JSON.stringify(records),
      /Alice-Home-Address|private-address|private-user@example\.com|posts/,
    )
  })

  it("ignores all inbound request ids", async () => {
    let records: RequestTelemetryRecord[] = []
    let generatedIds = ["generated-1", "generated-2"]
    let router = createRouter({
      middleware: [
        requestTelemetry({
          createRequestId: () => generatedIds.shift()!,
          now: () => 10,
          sink: (record) => records.push(record),
        }),
      ],
    })
    router.get("/resource", () => new Response("OK"))

    let inboundIds = ["valid-looking-id", "contains private metadata"]
    for (let inboundId of inboundIds) {
      let response = await router.fetch(
        new Request("http://localhost/resource", {
          headers: { "X-Request-Id": inboundId },
        }),
      )
      assert.match(response.headers.get("X-Request-Id") ?? "", /^generated-[12]$/)
    }

    assert.deepEqual(
      records.map((record) => record.requestId),
      ["generated-1", "generated-2"],
    )
    assert.doesNotMatch(JSON.stringify(records), /valid-looking-id|private metadata/)
  })

  it("emits one correlated failure record and rethrows the original error", async () => {
    let records: RequestTelemetryRecord[] = []
    let error = new Error("private-account-value")
    let ticks = [20, 23]
    let router = createRouter({
      middleware: [
        requestTelemetry({
          createRequestId: () => "generated-error-id",
          now: () => ticks.shift()!,
          sink: (record) => records.push(record),
        }),
      ],
    })
    router.get("/failure", () => {
      throw error
    })

    let caught: unknown
    try {
      await router.fetch("http://localhost/failure?email=private%40example.com")
    } catch (cause: unknown) {
      caught = cause
    }

    assert.equal(caught, error)
    assert.deepEqual(records, [
      {
        event: "http_request_failed",
        requestId: "generated-error-id",
        method: "GET",
        pathname: "/:segment",
        statusClass: "5xx",
        durationMs: 3,
      },
    ])
    assert.doesNotMatch(JSON.stringify(records), /private-account-value|private@example\.com/)
  })

  it("does not let a telemetry sink failure change the application response", async () => {
    let router = createRouter({
      middleware: [
        requestTelemetry({
          createRequestId: () => "generated-id",
          sink() {
            throw new Error("telemetry unavailable")
          },
        }),
      ],
    })
    router.get("/resource", () => new Response("still available", { status: 202 }))

    let response = await router.fetch("http://localhost/resource")

    assert.equal(response.status, 202)
    assert.equal(await response.text(), "still available")
  })
})
