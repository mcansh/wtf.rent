import { createClient } from "redis"

import { env } from "./env.ts"

export const redis = createClient({
  url: env.REDIS_URL,
})
