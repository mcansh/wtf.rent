import * as http from "node:http"

import { createRequestListener } from "remix/node-fetch-server"

import { redis } from "./app/redis.ts"
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

await redis.connect()

server.listen(port, "0.0.0.0", () => {
  console.log(`Server listening on http://0.0.0.0:${port}`)
})

let shuttingDown = false

function shutdown() {
  if (shuttingDown) {
    return
  }

  shuttingDown = true
  server.close(() => redis.close().finally(() => process.exit(0)))
  server.closeAllConnections()
}

process.on("SIGINT", shutdown)
process.on("SIGTERM", shutdown)
