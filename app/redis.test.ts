import { once } from "node:events"
import type { AddressInfo, Server, Socket } from "node:net"
import { createServer } from "node:net"
import { setTimeout as delay } from "node:timers/promises"

import { createClient } from "redis"
import * as assert from "remix/assert"
import { describe, it } from "remix/test"

import { connectRedis, redis } from "./redis.ts"

async function listen(server: Server) {
  server.listen(0, "127.0.0.1")
  await once(server, "listening")
  // SAFETY: A listening TCP server bound to a numeric port returns AddressInfo.
  let address = server.address() as AddressInfo
  return address.port
}

describe("Redis startup", () => {
  it("waits for readiness and leaves a successful connection open after the deadline", async (t) => {
    let timers = t.useFakeTimers()
    let ready = Promise.withResolvers<void>()
    let client = {
      isOpen: true,
      connect: () => ready.promise.then(() => redis),
      destroy() {
        this.isOpen = false
      },
    }
    let connected = false
    let startup = connectRedis(client, 1000).then(() => {
      connected = true
    })

    await timers.advanceAsync(500)
    assert.equal(connected, false)
    ready.resolve()
    await startup
    await timers.advanceAsync(1000)

    assert.equal(connected, true)
    assert.equal(client.isOpen, true)
  })

  it("preserves a connection failure and closes the client", async () => {
    let failure = new Error("Redis authentication failed")
    let client = {
      isOpen: true,
      connect: () => Promise.reject(failure),
      destroy() {
        this.isOpen = false
      },
    }

    await assert.rejects(connectRedis(client), (error: Error) => error === failure)
    assert.equal(client.isOpen, false)
  })

  it("retries an unavailable Redis socket, then stops connecting at the deadline", async (t) => {
    let server = createServer()
    let port = await listen(server)
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()))
    })
    let client = createClient({
      socket: { host: "127.0.0.1", port, reconnectStrategy: 20 },
    })
    let errors: NodeJS.ErrnoException[] = []
    client.on("error", (error) => errors.push(error))
    t.after(() => {
      if (client.isOpen) client.destroy()
    })

    await assert.rejects(connectRedis(client, 200), /Redis startup timed out after 200ms/)
    assert.ok(errors.length > 1)
    assert.ok(errors.every((error) => error.code === "ECONNREFUSED"))
    assert.equal(client.isOpen, false)
    assert.equal(client.isReady, false)

    let attempts = errors.length
    await delay(60)
    assert.equal(errors.length, attempts)
  })

  it("closes a TCP connection when Redis accepts it but never finishes its handshake", async (t) => {
    let sockets = new Set<Socket>()
    let accepted = 0
    let server = createServer((socket) => {
      accepted++
      sockets.add(socket)
      socket.resume()
      socket.on("close", () => sockets.delete(socket))
    })
    let port = await listen(server)
    let client = createClient({ socket: { host: "127.0.0.1", port } })
    client.on("error", () => {})
    t.after(async () => {
      if (client.isOpen) client.destroy()
      for (let socket of sockets) socket.destroy()
      await new Promise<void>((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()))
      })
    })

    await assert.rejects(connectRedis(client, 200), /Redis startup timed out after 200ms/)
    assert.equal(accepted, 1)
    assert.equal(client.isOpen, false)
    assert.equal(client.isReady, false)
    await delay(60)
    assert.equal(sockets.size, 0)
    assert.equal(accepted, 1)
  })
})
