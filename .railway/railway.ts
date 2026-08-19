import {
  defineRailway,
  github,
  postgres,
  preserve,
  project,
  redis,
  service,
  volume,
} from "railway/iac"

const REGION = "us-east4-eqdc4a"

export default defineRailway(() => {
  let cache = redis("redis", { region: REGION })
  let cacheVolume = volume("redis-volume", {
    alerts: { usage: { "100": {}, "80": {}, "95": {} } },
    allowOnlineResize: true,
    region: REGION,
    sizeMB: 5000,
  })

  let db = postgres("postgres", { region: REGION })
  let dbVolume = volume("postgres-volume", {
    alerts: { usage: { "100": {}, "80": {}, "95": {} } },
    allowOnlineResize: true,
    region: REGION,
    sizeMB: 5000,
  })

  let wtfRent = service("wtf.rent", {
    source: github("mcansh/wtf.rent", { branch: "logan/remix-v3", checkSuites: false }),
    replicas: { REGION: 1 },
    deploy: { drainingSeconds: 120, overlapSeconds: 0, sleepApplication: true },
    domains: ["rent.mcan.sh"],
    networking: { privateNetworkEndpoint: "wtf-rent" },
    env: {
      DATABASE_URL: preserve(),
      REDIS_URL: preserve(),
      SESSION_SECRETS: preserve(),
    },
    preDeployCommand: ["pnpm exec remix db migrate"],
  })

  return project("wtf.rent", {
    resources: [wtfRent, cache, cacheVolume, db, dbVolume],
  })
})
