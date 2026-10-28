import { routes } from "../routes.ts"

export const CANONICAL_ORIGIN = "https://wtf.rent"
export const ALTERNATE_INDEXING_HOST = "rent.mcan.sh"
export const HOME_META_DESCRIPTION =
  "Firsthand reports from renters. The good, the bad, and the landlord specials."
export const ABOUT_META_DESCRIPTION =
  "wtf.rent helps renters share firsthand experiences and makes landlord, property-manager, city, region, and housing-category context easier to find."
export const DIRECTORY_META_DESCRIPTION =
  "Find landlords and property managers named in published renter reports, grouped by city and region."
export const RIGHTS_META_DESCRIPTION =
  "Rental rules vary by location and housing program. Use this guide to organize what happened, find the rules that apply, and reach qualified help."
export const DEFAULT_META_DESCRIPTION = HOME_META_DESCRIPTION
export const PUBLIC_SITEMAP_PATHS = [
  routes.home.href(),
  routes.directory.href(),
  routes.rights.href(),
  routes.about.href(),
] as const

export interface PageSeoInput {
  canonicalPath?: string
  description: string
  hostname: string
  pathname: string
  title: string
}

export interface PageSeo {
  canonicalHref: string
  description: string
  robots: "noindex" | null
  title: string
}

export function canonicalHref(pathname: string): string {
  return new URL(pathname, CANONICAL_ORIGIN).href
}

export function getRequestHostname(url: URL, headers: Headers): string {
  let forwarded = headers.get("X-Forwarded-Host")
  if (forwarded) return hostnameFromHostHeader(forwarded)

  let host = headers.get("Host")
  if (host) return hostnameFromHostHeader(host)

  return url.hostname.toLowerCase()
}

export function isAlternateIndexingHost(hostname: string): boolean {
  return hostname === ALTERNATE_INDEXING_HOST
}

export function isIndexablePublicPath(pathname: string): boolean {
  return PUBLIC_SITEMAP_PATHS.some((path) => path === pathname)
}

export function shouldNoindex(pathname: string, hostname: string): boolean {
  return isAlternateIndexingHost(hostname) || !isIndexablePublicPath(pathname)
}

export function getPageSeo(input: PageSeoInput): PageSeo {
  return {
    canonicalHref: canonicalHref(input.canonicalPath ?? input.pathname),
    description: input.description,
    robots: shouldNoindex(input.pathname, input.hostname) ? "noindex" : null,
    title: input.title,
  }
}

export function robotsTxt(): string {
  return [
    "User-agent: *",
    "Allow: /",
    "",
    `Disallow: ${routes.login.index.href()}`,
    `Disallow: ${routes.join.index.href()}`,
    `Disallow: ${routes.profile.href()}`,
    `Disallow: ${routes.post.new.href()}`,
    "Disallow: /posts/*/edit",
    "",
    `Sitemap: ${canonicalHref(routes.sitemap.href())}`,
    "",
  ].join("\n")
}

export function sitemapXml(): string {
  let urls = PUBLIC_SITEMAP_PATHS.map((pathname) => {
    let loc = escapeXml(canonicalHref(pathname))
    return `  <url>\n    <loc>${loc}</loc>\n  </url>`
  }).join("\n")

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`
}

function hostnameFromHostHeader(value: string): string {
  let host = value.split(",")[0]?.trim().split(":")[0]
  return (host ?? "").toLowerCase()
}

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;")
}
