import * as http from "node:http"

import { createFetchProxy } from "remix/fetch-proxy"
import { createRequestListener } from "remix/node-fetch-server"
import { createHmrReadyFetch, run } from "remix/node-hmr"

import { env } from "./app/env.ts"

const hmrRunner = run("server.ts", {
  env: {
    ...process.env,
    PORT: String(env.APP_PORT),
    HMR_PROXY_PORT: String(env.HMR_PROXY_PORT),
  },
  nodeArgs: ["--import", "remix/node-tsx", "--import", "remix/ui-hmr/node"],
  browserHmrChannel: { port: env.HMR_PORT },
})

const server = http.createServer(
  createRequestListener(
    createHmrReadyFetch(
      hmrRunner,
      createFetchProxy(`http://127.0.0.1:${env.APP_PORT}`, {
        xForwardedHeaders: true,
      }),
    ),
  ),
)

server.listen(env.HMR_PROXY_PORT, "127.0.0.1")

let shuttingDown = false

function shutdown() {
  if (shuttingDown) return
  shuttingDown = true
  server.close(() => hmrRunner.close().finally(() => process.exit(0)))
  server.closeAllConnections()
}

process.on("SIGINT", shutdown)
process.on("SIGTERM", shutdown)
