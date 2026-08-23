import * as assert from "remix/assert"
import { describe, it } from "remix/test"
import { render } from "remix/ui/test"

import { ReportSearch } from "./report-search.tsx"

describe("ReportSearch", () => {
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
})
