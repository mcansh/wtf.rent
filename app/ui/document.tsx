import type { Handle, RemixNode } from "remix/ui"

import { getAssetEntry } from "../middleware/assets.ts"

export interface DocumentProps {
  children?: RemixNode
  head?: RemixNode
  title?: RemixNode
}

const DEFAULT_TITLE = readAppDisplayName("wtf.rent")

export function Document(handle: Handle<DocumentProps>) {
  return () => {
    let { children, head, title = DEFAULT_TITLE } = handle.props
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
          <link rel="preconnect" href="https://fonts.gstatic.com" />
          <link
            href="https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Karla:ital,wght@0,400;0,500;0,600;0,700;1,400&family=Playfair+Display:ital,wght@0,700;0,800;1,700;1,800&display=swap"
            rel="stylesheet"
          />
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
