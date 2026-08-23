import { describe, it } from "node:test"

import * as assert from "remix/assert"

import { listPhotonLocationSuggestions } from "./photon.ts"

describe("Photon location suggestions", () => {
  it("requests broad place layers and maps bounded GeoJSON into the public contract", async () => {
    let requestedUrls: URL[] = []
    let suggestions = await listPhotonLocationSuggestions("det", async (input) => {
      requestedUrls.push(new URL(input.toString()))
      return Response.json({
        type: "FeatureCollection",
        features: [
          {
            type: "Feature",
            properties: {
              type: "city",
              name: "Detroit",
              county: "Wayne",
              state: "Michigan",
              country: "United States",
              street: "Private provider field",
            },
            geometry: { type: "Point", coordinates: [-83.0466, 42.3316] },
          },
          {
            type: "Feature",
            properties: {
              type: "state",
              name: "Michigan",
              country: "United States",
            },
            geometry: { type: "Point", coordinates: [-85.6024, 44.3148] },
          },
        ],
      })
    })

    assert.deepEqual(suggestions, [
      {
        kind: "city",
        label: "Detroit",
        description: "City · Michigan, United States",
        value: "Detroit",
      },
      {
        kind: "region",
        label: "Michigan",
        description: "Region · United States",
        value: "Michigan",
      },
    ])
    let requestedUrl = requestedUrls[0]
    assert.ok(requestedUrl)
    assert.equal(requestedUrl.origin, "https://photon.komoot.io")
    assert.equal(requestedUrl.pathname, "/api/")
    assert.equal(requestedUrl.searchParams.get("q"), "det")
    assert.equal(requestedUrl.searchParams.get("limit"), "8")
    assert.equal(requestedUrl.searchParams.get("lang"), "en")
    assert.deepEqual(requestedUrl.searchParams.getAll("layer"), [
      "city",
      "locality",
      "district",
      "county",
      "state",
    ])
    assert.doesNotMatch(JSON.stringify(suggestions), /Private provider field/)
  })

  it("fails soft when Photon is unavailable or returns an invalid shape", async () => {
    let unavailable = await listPhotonLocationSuggestions("det", () =>
      Promise.resolve(new Response("Unavailable", { status: 503 })),
    )
    let invalid = await listPhotonLocationSuggestions("det", () =>
      Promise.resolve(Response.json({ features: [{ properties: { type: "house" } }] })),
    )

    assert.deepEqual(unavailable, [])
    assert.deepEqual(invalid, [])
  })
})
