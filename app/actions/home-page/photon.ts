import * as s from "remix/data-schema"

import type { ReportSuggestion } from "./public/suggestion-contract.ts"

const PHOTON_API_URL = "https://photon.komoot.io/api/"
const PHOTON_LOCATION_TYPES = ["city", "locality", "district", "county", "state"] as const
const PHOTON_RESULT_LIMIT = 8
const PHOTON_TIMEOUT_MS = 2_000

const photonFeatureSchema = s.object({
  geometry: s.object({
    coordinates: s.tuple([s.number(), s.number()]),
  }),
  properties: s.object({
    city: s.optional(s.string()),
    country: s.optional(s.string()),
    county: s.optional(s.string()),
    district: s.optional(s.string()),
    name: s.string(),
    state: s.optional(s.string()),
    type: s.enum_(PHOTON_LOCATION_TYPES),
  }),
})
const photonResponseSchema = s.object({
  features: s
    .array(photonFeatureSchema)
    .refine((features) => features.length <= PHOTON_RESULT_LIMIT, "Too many Photon results"),
})

type PhotonProperties = s.InferOutput<typeof photonFeatureSchema>["properties"]

const PHOTON_TYPE_LABELS = {
  city: "City",
  locality: "Locality",
  district: "District",
  county: "County",
  state: "Region",
} as const satisfies Record<(typeof PHOTON_LOCATION_TYPES)[number], string>

export async function listPhotonLocationSuggestions(
  query: string,
  photonFetch: typeof globalThis.fetch = globalThis.fetch,
): Promise<ReportSuggestion[]> {
  let url = new URL(PHOTON_API_URL)
  url.searchParams.set("q", query)
  url.searchParams.set("lang", "en")
  url.searchParams.set("limit", String(PHOTON_RESULT_LIMIT))
  for (let layer of PHOTON_LOCATION_TYPES) url.searchParams.append("layer", layer)

  try {
    let response = await photonFetch(url, {
      headers: {
        Accept: "application/geo+json, application/json",
        "User-Agent": "wtf.rent search autocomplete",
      },
      signal: AbortSignal.timeout(PHOTON_TIMEOUT_MS),
    })
    if (!response.ok) return []

    let parsed = s.parseSafe(photonResponseSchema, await response.json())
    if (!parsed.success) return []

    let suggestions = new Map<string, ReportSuggestion>()
    for (let feature of parsed.value.features) {
      let suggestion = toReportSuggestion(feature.properties)
      if (suggestion == null) continue

      let key = `${suggestion.kind}:${suggestion.value.toLowerCase()}`
      if (!suggestions.has(key)) suggestions.set(key, suggestion)
    }

    return [...suggestions.values()]
  } catch {
    return []
  }
}

function toReportSuggestion(properties: PhotonProperties): ReportSuggestion | null {
  let label = normalizeText(properties.name, 100)
  if (label == null) return null

  let kind: ReportSuggestion["kind"] =
    properties.type === "county" || properties.type === "state" ? "region" : "city"
  let context = getLocationContext(properties, label)
  let typeLabel = PHOTON_TYPE_LABELS[properties.type]
  let description = context.length === 0 ? typeLabel : `${typeLabel} · ${context.join(", ")}`

  return {
    kind,
    label,
    description: description.slice(0, 160),
    value: label,
  }
}

function getLocationContext(properties: PhotonProperties, label: string): string[] {
  let candidates =
    properties.type === "state"
      ? [properties.country]
      : properties.type === "county"
        ? [properties.state, properties.country]
        : [properties.city, properties.state, properties.country]
  let context: string[] = []

  for (let candidate of candidates) {
    let value = normalizeText(candidate, 100)
    if (value == null || value.toLowerCase() === label.toLowerCase()) continue
    if (!context.some((entry) => entry.toLowerCase() === value.toLowerCase())) context.push(value)
  }

  return context
}

function normalizeText(value: string | undefined, maxLength: number): string | null {
  let normalized = value?.trim().slice(0, maxLength) ?? ""
  return normalized.length === 0 ? null : normalized
}

export interface GeocodedCoordinates {
  latitude: number
  longitude: number
}

export async function geocodeLocation(
  city: string,
  region: string,
  photonFetch: typeof globalThis.fetch = globalThis.fetch,
): Promise<GeocodedCoordinates | null> {
  let query = `${city}, ${region}`.trim()
  if (query.length === 0) return null

  let url = new URL(PHOTON_API_URL)
  url.searchParams.set("q", query)
  url.searchParams.set("lang", "en")
  url.searchParams.set("limit", "1")

  try {
    let response = await photonFetch(url, {
      headers: {
        Accept: "application/geo+json, application/json",
        "User-Agent": "wtf.rent geocoder",
      },
      signal: AbortSignal.timeout(PHOTON_TIMEOUT_MS),
    })
    if (!response.ok) return null

    let parsed = s.parseSafe(photonResponseSchema, await response.json())
    if (!parsed.success) return null

    let feature = parsed.value.features[0]
    if (feature == null) return null

    let [longitude, latitude] = feature.geometry.coordinates
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null

    return { latitude, longitude }
  } catch {
    return null
  }
}
