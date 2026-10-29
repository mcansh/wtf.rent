import * as assert from "remix/assert"
import { describe, it } from "remix/test"

import {
  HOME_GOOGLE_FONTS_STYLESHEET_HREF,
  SHARED_GOOGLE_FONTS_STYLESHEET_HREF,
  googleFontStylesheetHrefs,
} from "./google-fonts.ts"

describe("google font stylesheets", () => {
  it("requests only the used variable ranges and keeps display=swap", () => {
    assert.equal(
      SHARED_GOOGLE_FONTS_STYLESHEET_HREF,
      "https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Karla:wght@400..700&family=Playfair+Display:wght@700..800&display=swap",
    )
    assert.equal(
      HOME_GOOGLE_FONTS_STYLESHEET_HREF,
      "https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Karla:wght@400..700&family=Playfair+Display:ital,wght@0,700..800;1,700..800&display=swap",
    )
    assert.doesNotMatch(SHARED_GOOGLE_FONTS_STYLESHEET_HREF, /ital/)
    assert.doesNotMatch(SHARED_GOOGLE_FONTS_STYLESHEET_HREF, /Karla:ital/)
    assert.doesNotMatch(HOME_GOOGLE_FONTS_STYLESHEET_HREF, /Karla:ital/)
    assert.doesNotMatch(HOME_GOOGLE_FONTS_STYLESHEET_HREF, /[?&]text=/)
  })

  it("loads Playfair italic only when a page opts in", () => {
    assert.deepEqual(googleFontStylesheetHrefs(false), [SHARED_GOOGLE_FONTS_STYLESHEET_HREF])
    assert.deepEqual(googleFontStylesheetHrefs(true), [HOME_GOOGLE_FONTS_STYLESHEET_HREF])
  })
})
