import * as assert from "remix/assert"
import { describe, it } from "remix/test"
import { render } from "remix/ui/test"

import type { Review } from "./review.tsx"
import { ReviewCard } from "./review.tsx"

const review = {
  initials: "BR",
  name: "Browser Renter",
  location: "Detroit, MI",
  time: "Today",
  tag: "REPAIRS",
  title: "The leak finally stopped.",
  body: "A browser test can verify the controls without starting the whole app.",
  score: 4,
  replies: 2,
  cheers: 7,
} satisfies Review

describe("ReviewCard", () => {
  it("increments the cheer count", async (t) => {
    let result = render(<ReviewCard review={review} />)
    t.after(result.cleanup)

    let cheerButton = result.$('[aria-label="Give a cheer"]')
    assert.ok(cheerButton)
    assert.equal(cheerButton.querySelector("span")?.textContent, "7")

    await result.act(() => cheerButton.click())

    assert.equal(cheerButton.querySelector("span")?.textContent, "8")
  })

  it("toggles the saved state", async (t) => {
    let result = render(<ReviewCard review={review} />)
    t.after(result.cleanup)

    let saveButton = result.$('[aria-label="Save review"]')
    assert.ok(saveButton)
    assert.equal(saveButton.textContent?.trim(), "☆ Save")

    await result.act(() => saveButton.click())

    assert.equal(saveButton.textContent?.trim(), "★ Saved")
  })
})
