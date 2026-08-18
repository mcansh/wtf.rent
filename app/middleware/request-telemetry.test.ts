import { describe, it } from "node:test"

import * as assert from "remix/assert"
import { createRouter } from "remix/router"

import type { RequestTelemetryRecord } from "./request-telemetry.ts"
import { requestTelemetry } from "./request-telemetry.ts"

describe("request telemetry", () => {
  it("preserves the response and emits one allowlisted completion record", async () => {
    let records: RequestTelemetryRecord[] = []
    let ticks = [100, 112.5]
    let router = createRouter({
      middleware: [
        requestTelemetry({
          createRequestId() {
            assert.fail("A valid inbound request id should be preserved")
          },
          now: () => ticks.shift()!,
          sink: (record) => records.push(record),
        }),
      ],
    })

    router.get(
      "/resource",
      () =>
        new Response("preserved body", {
          status: 201,
          statusText: "Created here",
          headers: { "X-Existing": "preserved header" },
        }),
    )

    let response = await router.fetch(
      new Request("http://localhost/resource?q=private-address", {
        headers: { "X-Request-Id": "trace_123-ABC" },
      }),
    )

    assert.equal(response.status, 201)
    assert.equal(response.statusText, "Created here")
    assert.equal(response.headers.get("X-Existing"), "preserved header")
    assert.equal(response.headers.get("X-Request-Id"), "trace_123-ABC")
    assert.equal(await response.text(), "preserved body")
    assert.deepEqual(records, [
      {
        event: "http_request_completed",
        requestId: "trace_123-ABC",
        method: "GET",
        pathname: "/resource",
        statusClass: "2xx",
        durationMs: 12.5,
      },
    ])
    assert.doesNotMatch(JSON.stringify(records), /private-address/)
  })

  it("replaces unsafe inbound ids with bounded generated values", async () => {
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

    let unsafeIds = ["contains spaces", "x".repeat(129)]
    for (let unsafeId of unsafeIds) {
      let response = await router.fetch(
        new Request("http://localhost/resource", {
          headers: { "X-Request-Id": unsafeId },
        }),
      )
      assert.match(response.headers.get("X-Request-Id") ?? "", /^generated-[12]$/)
    }

    assert.deepEqual(
      records.map((record) => record.requestId),
      ["generated-1", "generated-2"],
    )
    assert.doesNotMatch(JSON.stringify(records), /contains spaces/)
    assert.doesNotMatch(JSON.stringify(records), new RegExp("x{129}"))
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
        pathname: "/failure",
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
