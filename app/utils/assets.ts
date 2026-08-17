import * as path from "node:path"

import { createAssetServer } from "remix/assets"
import { uiHmr } from "remix/ui-hmr/assets"

const rootDir = path.resolve(import.meta.dirname, "../..")
const nodeEnv = process.env.NODE_ENV ?? "development"
const isDevelopment = nodeEnv === "development"
const isProduction = nodeEnv === "production"
const isHmr = Boolean(isDevelopment && process.env.REMIX_NODE_HMR)

async function loadHmr() {
  let hmr = await import("remix/node-hmr/runtime")
  return await hmr.createBrowserHmrChannel()
}

export const assetServer = createAssetServer({
  basePath: "/assets",
  rootDir,
  fileMap: {
    "/app/*path": "app/*path",
    "/node_modules/*path": "node_modules/*path",
  },
  allowFiles: ["app/routes.ts", "app/**/public/**"],
  allowPackages: ["remix"],
  denyFiles: ["app/**/*.test.*"],
  sourceMaps: isDevelopment ? "external" : undefined,
  minify: isProduction,
  watch: isDevelopment,
  hmr: isHmr ? async () => await loadHmr() : undefined,
  scripts: {
    define: {
      NODE_ENV: JSON.stringify(nodeEnv),
    },
    loaders: isHmr ? [uiHmr()] : undefined,
  },
})
