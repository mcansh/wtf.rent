import * as http from "node:http"

import { createRequestListener } from "remix/node-fetch-server"

import { connectRedis, redis } from "./app/redis.ts"
import { router } from "./app/router.ts"

const port = process.env.PORT ? Number.parseInt(process.env.PORT, 10) : 44100

const server = http.createServer(
  createRequestListener(
    async (request) => {
      try {
        return await router.fetch(request)
      } catch (error) {
        if (!(request.signal.aborted && error === request.signal.reason)) {
          console.error(error)
        }
        return new Response("Internal Server Error", { status: 500 })
      }
    },
    { trustProxy: true },
  ),
)

try {
  await connectRedis()
} catch {
  console.error("Redis startup failed; exiting without accepting HTTP requests")
  process.exit(1)
}

server.listen(port, "0.0.0.0", () => {
  console.log(`Server listening on http://0.0.0.0:${port}`)
})

let shuttingDown = false

/** Drain Redis after closing HTTP, with a deadline for outages or queued commands. */
function shutdown() {
  if (shuttingDown) {
    return
  }

  shuttingDown = true
  setTimeout(() => {
    console.error("Redis shutdown timed out; forcing exit")
    if (redis.isOpen) redis.destroy()
    process.exit(1)
  }, 5_000).unref()

  server.close(async () => {
    try {
      if (redis.isOpen) await redis.close()
      process.exit(0)
    } catch {
      console.error("Redis shutdown failed; exiting")
      process.exit(1)
    }
  })
  server.closeAllConnections()
}

process.on("SIGINT", shutdown)
process.on("SIGTERM", shutdown)
