import * as assert from "remix/assert"
import { describe, it } from "remix/test"
import { render } from "remix/ui/test"

import { ReportSearch } from "./report-search.tsx"

describe("ReportSearch", () => {
  it("submits cleared distance state for direct resets and geolocation errors", async (t) => {
    let originalGetCurrentPosition = navigator.geolocation.getCurrentPosition
    navigator.geolocation.getCurrentPosition = (_success, error) => {
      error?.({
        code: 1,
        message: "Location permission denied",
        PERMISSION_DENIED: 1,
        POSITION_UNAVAILABLE: 2,
        TIMEOUT: 3,
      })
    }
    t.after(() => {
      navigator.geolocation.getCurrentPosition = originalGetCurrentPosition
    })

    let result = render(<ReportSearch query="" radius="5" lat="42.3314" lng="-83.0458" />)
    t.after(result.cleanup)
    let form = result.$("form")
    let select = result.$('select[name="radius"]')
    let lat = result.$('input[name="lat"]')
    let lng = result.$('input[name="lng"]')
    assert.ok(form instanceof HTMLFormElement)
    assert.ok(select instanceof HTMLSelectElement)
    assert.ok(lat instanceof HTMLInputElement)
    assert.ok(lng instanceof HTMLInputElement)
    assert.equal(select.value, "5")

    let submissions = 0
    form.addEventListener("submit", (event) => {
      event.preventDefault()
      submissions++
    })

    await result.act(() => {
      select.value = ""
      select.dispatchEvent(new Event("change", { bubbles: true }))
    })
    assert.equal(lat.value, "")
    assert.equal(lng.value, "")
    assert.equal(submissions, 1)

    lat.value = "42.3314"
    lng.value = "-83.0458"
    await result.act(() => {
      select.value = "10"
      select.dispatchEvent(new Event("change", { bubbles: true }))
    })
    assert.equal(select.value, "")
    assert.equal(lat.value, "")
    assert.equal(lng.value, "")
    assert.equal(submissions, 2)
  })

  it("keeps the active keyboard option visible inside a bounded listbox", async (t) => {
    let originalFetch = globalThis.fetch
    globalThis.fetch = () =>
      Promise.resolve(
        Response.json({
          suggestions: Array.from({ length: 8 }, (_, index) => ({
            kind: "city",
            label: `Park City ${index}`,
            description: "City",
            value: `Park City ${index}`,
          })),
        }),
      )
    t.after(() => {
      globalThis.fetch = originalFetch
    })

    let result = render(<ReportSearch query="" radius="" lat="" lng="" />)
    t.after(result.cleanup)
    let input = result.$('input[name="q"]')
    assert.ok(input instanceof HTMLInputElement)

    await result.act(async () => {
      input.value = "park"
      input.dispatchEvent(new InputEvent("input", { bubbles: true }))
      await new Promise((resolve) => setTimeout(resolve, 220))
    })

    let listbox = result.$('[role="listbox"]')
    assert.ok(listbox)
    assert.match(listbox.className, /overflow-y-auto/)
    assert.equal(listbox.querySelectorAll('[role="option"]').length, 8)

    let scrolledIds: string[] = []
    for (let option of listbox.querySelectorAll('[role="option"]')) {
      assert.ok(option instanceof HTMLElement)
      option.scrollIntoView = () => scrolledIds.push(option.id)
    }

    for (let index = 0; index < 8; index++) {
      await result.act(() => {
        input.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "ArrowDown" }))
      })
    }

    let activeId = input.getAttribute("aria-activedescendant")
    assert.ok(activeId)
    assert.equal(scrolledIds.at(-1), activeId)
    assert.equal(result.$(`#${activeId}`)?.getAttribute("aria-selected"), "true")
  })

  it("renders category links with active and location-aware URL state", (t) => {
    let result = render(<ReportSearch query="Safety" radius="25" lat="42.331" lng="-83.046" />)
    t.after(result.cleanup)

    let nav = result.$('nav[aria-label="Browse report categories"]')
    assert.ok(nav instanceof HTMLElement)
    let links = [...nav.querySelectorAll("a")]
    assert.equal(links.length, 7)

    let safetyLink = links.find((link) => link.textContent === "Safety")
    assert.ok(safetyLink instanceof HTMLAnchorElement)
    assert.equal(safetyLink.getAttribute("aria-current"), "page")
    assert.equal(
      safetyLink.getAttribute("href"),
      "/?q=Safety&radius=25&lat=42.331&lng=-83.046#feed",
    )
    assert.ok(links.filter((link) => link.hasAttribute("aria-current")).length === 1)
  })

  it("limits city-desk suggestions to cities and regions", async (t) => {
    let originalFetch = globalThis.fetch
    globalThis.fetch = () =>
      Promise.resolve(
        Response.json({
          suggestions: [
            { kind: "city", label: "Detroit", description: "City · MI", value: "Detroit" },
            { kind: "region", label: "Michigan", description: "Region", value: "Michigan" },
            {
              kind: "landlord",
              label: "Detroit Doorways",
              description: "Landlord or manager",
              value: "Detroit Doorways",
            },
            {
              kind: "category",
              label: "Maintenance",
              description: "Report category",
              value: "Maintenance",
            },
          ],
        }),
      )
    t.after(() => {
      globalThis.fetch = originalFetch
    })

    let result = render(<ReportSearch query="" radius="" lat="" lng="" />)
    t.after(result.cleanup)
    let input = result.$('input[name="q"]')
    assert.ok(input instanceof HTMLInputElement)

    await result.act(async () => {
      input.value = "det"
      input.dispatchEvent(new InputEvent("input", { bubbles: true }))
      await new Promise((resolve) => setTimeout(resolve, 220))
    })

    let options = [...result.$('[role="listbox"]')!.querySelectorAll('[role="option"]')]
    assert.equal(options.length, 2)
    assert.match(options[0]?.textContent ?? "", /Detroit/)
    assert.match(options[1]?.textContent ?? "", /Michigan/)
    assert.doesNotMatch(
      options.map((option) => option.textContent).join(" "),
      /Doorways|Maintenance/,
    )
  })
})
