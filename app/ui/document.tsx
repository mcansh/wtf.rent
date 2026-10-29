import type { Handle, RemixNode } from "remix/ui"

import { getAssetEntry } from "../middleware/assets.ts"
import { googleFontStylesheetHrefs } from "./google-fonts.ts"

export interface DocumentProps {
  children?: RemixNode
  head?: RemixNode
  playfairItalic?: boolean
  title?: RemixNode
}

const DEFAULT_TITLE = readAppDisplayName("wtf.rent")

export function Document(handle: Handle<DocumentProps>) {
  return () => {
    let { children, head, playfairItalic = false, title = DEFAULT_TITLE } = handle.props
    let { scriptSrc, scriptPreloads, stylesheetHref, stylesheetPreloads } = getAssetEntry()

    return (
      <html lang="en">
        <head>
          <meta charSet="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
          <title>{title}</title>
          {head}
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
          {googleFontStylesheetHrefs(playfairItalic).map((href) => (
            <link key={href} href={href} rel="stylesheet" />
          ))}
          {stylesheetPreloads.map((href) => (
            <link key={href} rel="preload" href={href} as="style" />
          ))}
          <link rel="stylesheet" href={stylesheetHref} />
          {scriptPreloads.map((href) => (
            <link key={href} rel="modulepreload" href={href} />
          ))}
          <script type="module" async src={scriptSrc} />
        </head>
        <body>{children}</body>
      </html>
    )
  }
}

function readAppDisplayName(value: string): string {
  return value.startsWith("%%") ? "Remix App" : decodeURIComponent(value)
}
