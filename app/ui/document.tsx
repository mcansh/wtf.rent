import { getContext } from "remix/middleware/async-context"
import type { Handle, RemixNode } from "remix/ui"

import { getAssetEntry } from "../middleware/assets.ts"
import { DEFAULT_META_DESCRIPTION, getPageSeo, getRequestHostname } from "../utils/seo.ts"

export interface DocumentProps {
  canonicalPath?: string
  children?: RemixNode
  description?: string
  head?: RemixNode
  title?: string
}

const DEFAULT_TITLE = readAppDisplayName("wtf.rent")

export function Document(handle: Handle<DocumentProps>) {
  let context = getContext()

  return () => {
    let {
      canonicalPath,
      children,
      description = DEFAULT_META_DESCRIPTION,
      head,
      title = DEFAULT_TITLE,
    } = handle.props
    let { scriptSrc, scriptPreloads, stylesheetHref, stylesheetPreloads } = getAssetEntry()
    let seo = getPageSeo({
      canonicalPath,
      description,
      hostname: getRequestHostname(context.url, context.headers),
      pathname: context.url.pathname,
      title,
    })

    return (
      <html lang="en">
        <head>
          <meta charSet="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
          <title>{title}</title>
          <link rel="canonical" href={seo.canonicalHref} />
          <meta name="description" content={seo.description} />
          {seo.robots ? <meta name="robots" content={seo.robots} /> : null}
          <meta property="og:site_name" content="wtf.rent" />
          <meta property="og:title" content={seo.title} />
          <meta property="og:description" content={seo.description} />
          <meta property="og:type" content="website" />
          <meta property="og:url" content={seo.canonicalHref} />
          <meta property="og:locale" content="en_US" />
          <meta name="twitter:card" content="summary" />
          <meta name="twitter:title" content={seo.title} />
          <meta name="twitter:description" content={seo.description} />
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
