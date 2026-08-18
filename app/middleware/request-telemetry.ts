import type { Middleware } from "remix/router"

const SAFE_REQUEST_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/

export interface RequestTelemetryRecord {
  event: "http_request_completed" | "http_request_failed"
  requestId: string
  method: string
  pathname: string
  statusClass: string
  durationMs: number
}

export interface RequestTelemetryOptions {
  createRequestId?: () => string
  now?: () => number
  sink?: (record: RequestTelemetryRecord) => void
}

export function requestTelemetry(options: RequestTelemetryOptions = {}): Middleware {
  let createRequestId = options.createRequestId ?? (() => crypto.randomUUID())
  let now = options.now ?? (() => performance.now())
  let sink = options.sink ?? defaultSink()

  return async (context, next) => {
    let startedAt = now()
    let requestId = resolveRequestId(context.headers.get("X-Request-Id"), createRequestId)
    let baseRecord = {
      requestId,
      method: context.method,
      pathname: context.url.pathname,
    }

    try {
      let response = await next()
      let headers = new Headers(response.headers)
      headers.set("X-Request-Id", requestId)

      emit(sink, {
        event: "http_request_completed",
        ...baseRecord,
        statusClass: getStatusClass(response.status),
        durationMs: getDuration(startedAt, now()),
      })

      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers,
      })
    } catch (error: unknown) {
      emit(sink, {
        event: "http_request_failed",
        ...baseRecord,
        statusClass: "5xx",
        durationMs: getDuration(startedAt, now()),
      })
      throw error
    }
  }
}

function resolveRequestId(value: string | null, createRequestId: () => string): string {
  if (value != null && SAFE_REQUEST_ID.test(value)) return value

  let generated = createRequestId()
  return SAFE_REQUEST_ID.test(generated) ? generated : crypto.randomUUID()
}

function getStatusClass(status: number): string {
  return `${Math.floor(status / 100)}xx`
}

function getDuration(startedAt: number, endedAt: number): number {
  return Math.max(0, Math.round((endedAt - startedAt) * 1_000) / 1_000)
}

function defaultSink(): (record: RequestTelemetryRecord) => void {
  if (process.env.NODE_ENV === "test") return () => {}

  return (record) => {
    let line = `${JSON.stringify(record)}\n`
    if (record.event === "http_request_failed") {
      process.stderr.write(line)
    } else {
      process.stdout.write(line)
    }
  }
}

function emit(
  sink: (record: RequestTelemetryRecord) => void,
  record: RequestTelemetryRecord,
): void {
  try {
    sink(record)
  } catch {
    // Telemetry failure must never change the application response.
  }
}
