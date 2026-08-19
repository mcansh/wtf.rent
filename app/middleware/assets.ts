import * as path from "node:path"

import { getContext } from "remix/middleware/async-context"
import type { Middleware } from "remix/router"
import { createContextKey } from "remix/router"

import { assetServer } from "../utils/assets.ts"

interface AssetEntry {
  scriptSrc: string
  scriptPreloads: string[]
  stylesheetHref: string
  stylesheetPreloads: string[]
}

const assetsEntryKey = createContextKey<AssetEntry>()
const defaultScriptEntry = path.resolve(import.meta.dirname, "../public/entry.ts")
const defaultStylesheetEntry = path.resolve(import.meta.dirname, "../public/out.css")

export function loadAssetEntry(
  scriptEntry = defaultScriptEntry,
  stylesheetEntry = defaultStylesheetEntry,
): Middleware<{ key: typeof assetsEntryKey; value: AssetEntry }> {
  return async (context, next) => {
    let [scriptSrc, scriptPreloads, stylesheetHref, stylesheetPreloads] = await Promise.all([
      assetServer.getHref(scriptEntry),
      assetServer.getPreloads(scriptEntry).catch((error) => {
        // Surface asset compilation errors without breaking HTML rendering.
        console.error(error)
        return []
      }),
      assetServer.getHref(stylesheetEntry),
      assetServer.getPreloads(stylesheetEntry).catch((error) => {
        // Surface asset compilation errors without breaking HTML rendering.
        console.error(error)
        return []
      }),
    ])

    context.set(assetsEntryKey, {
      scriptSrc,
      scriptPreloads,
      stylesheetHref,
      stylesheetPreloads,
    })
    return next()
  }
}

export function getAssetEntry(): AssetEntry {
  return getContext().get(assetsEntryKey)
}
