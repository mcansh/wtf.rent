export const GOOGLE_FONTS_STYLESHEET_ORIGIN = "https://fonts.googleapis.com"
export const GOOGLE_FONTS_FILE_ORIGIN = "https://fonts.gstatic.com"

const SHARED_FAMILIES = "family=DM+Mono:wght@400;500&family=Karla:wght@400..700"

export const SHARED_GOOGLE_FONTS_STYLESHEET_HREF = `https://fonts.googleapis.com/css2?${SHARED_FAMILIES}&family=Playfair+Display:wght@700..800&display=swap`

export const HOME_GOOGLE_FONTS_STYLESHEET_HREF = `https://fonts.googleapis.com/css2?${SHARED_FAMILIES}&family=Playfair+Display:ital,wght@0,700..800;1,700..800&display=swap`

export function googleFontStylesheetHrefs(playfairItalic: boolean): string[] {
  if (playfairItalic) return [HOME_GOOGLE_FONTS_STYLESHEET_HREF]

  return [SHARED_GOOGLE_FONTS_STYLESHEET_HREF]
}
