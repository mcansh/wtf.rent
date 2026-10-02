import { createClient } from "redis"

import { env } from "./env.ts"

export const redis = createClient({
  url: env.REDIS_URL,
})

redis.on("error", (error: NodeJS.ErrnoException) => {
  console.error("Redis client error", { name: error.name, code: error.code })
})

/** Wait for Redis readiness, stopping connection attempts if startup exceeds its deadline. */
export async function connectRedis(
  client: Pick<typeof redis, "connect" | "destroy" | "isOpen"> = redis,
  timeoutMs = 10_000,
) {
  let timeout: ReturnType<typeof setTimeout> | undefined

  try {
    await Promise.race([
      client.connect(),
      new Promise<never>((_, reject) => {
        timeout = setTimeout(() => {
          reject(new Error(`Redis startup timed out after ${timeoutMs}ms`))
        }, timeoutMs)
      }),
    ])
  } catch (error) {
    if (client.isOpen) client.destroy()
    throw error
  } finally {
    clearTimeout(timeout)
  }
}
