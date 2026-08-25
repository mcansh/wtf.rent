import * as s from "remix/data-schema"
import type { Handle, RemixNode, SerializableObject } from "remix/ui"
import { clientEntry, on, ref } from "remix/ui"

import { routes } from "../../../routes.ts"
import { RADIUS_OPTIONS } from "./report-search-contract.ts"
import type { ReportSuggestion } from "./suggestion-contract.ts"
import {
  reportSuggestionResponseSchema,
  REPORT_SUGGESTION_LIMIT,
  REPORT_SUGGESTION_QUERY_MIN_LENGTH,
} from "./suggestion-contract.ts"

const REPORT_SUGGESTION_DEBOUNCE_MS = 180

interface ReportSearchProps extends SerializableObject {
  query: string
  radius: string
  lat: string
  lng: string
}

type SuggestionStatus = "idle" | "loading" | "ready" | "error"

export const ReportSearch = clientEntry(
  import.meta.url,
  function ReportSearch(handle: Handle<ReportSearchProps>) {
    let activeIndex = -1
    let formElement: HTMLFormElement | null = null
    let inputElement: HTMLInputElement | null = null
    let latInputElement: HTMLInputElement | null = null
    let lngInputElement: HTMLInputElement | null = null
    let selectElement: HTMLSelectElement | null = null
    let isOpen = false
    let status: SuggestionStatus = "idle"
    let suggestions: ReportSuggestion[] = []
    let wantsSuggestions = false
    let listboxId = `${handle.id}-report-suggestions`
    let statusId = `${handle.id}-report-suggestion-status`

    function closeSuggestions() {
      activeIndex = -1
      isOpen = false
      wantsSuggestions = false
      handle.update()
    }

    function selectSuggestion(suggestion: ReportSuggestion) {
      if (inputElement == null || formElement == null) return

      inputElement.value = suggestion.value
      activeIndex = -1
      isOpen = false
      status = "idle"
      wantsSuggestions = false
      handle.update()
      formElement.requestSubmit()
    }

    function clearRadiusAndSubmit() {
      if (selectElement != null) selectElement.value = ""
      if (latInputElement != null) latInputElement.value = ""
      if (lngInputElement != null) lngInputElement.value = ""
      formElement?.requestSubmit()
    }

    function requestGeolocation(onSuccess: (lat: number, lng: number) => void) {
      if (!("geolocation" in navigator)) {
        clearRadiusAndSubmit()
        return
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          onSuccess(position.coords.latitude, position.coords.longitude)
        },
        clearRadiusAndSubmit,
        { timeout: 8_000 },
      )
    }

    return () => {
      let popupVisible = isOpen && status !== "idle"
      let listboxVisible = popupVisible && status === "ready" && suggestions.length > 0
      let activeOptionId =
        listboxVisible && activeIndex >= 0 ? `${listboxId}-${activeIndex}` : undefined

      return (
        <div
          className="relative max-w-140"
          mix={on("focusout", (event) => {
            let container = event.currentTarget
            queueMicrotask(() => {
              if (handle.signal.aborted || container.contains(document.activeElement)) return
              closeSuggestions()
            })
          })}
        >
          <form
            className="border-ink-950 bg-paper-50 shadow-ink-950 flex h-13 w-full items-center border-[1.5px] shadow-[4px_4px_0_var(--color-ink-950)] min-[901px]:h-13.5 min-[901px]:shadow-[5px_5px_0_var(--color-ink-950)]"
            method="get"
            action={`${routes.home.href()}#feed`}
            role="search"
            mix={ref((element) => {
              formElement = element
            })}
          >
            <span
              className="grid h-full shrink-0 place-items-center px-3 text-2xl"
              aria-hidden="true"
            >
              ⌕
            </span>
            <input
              className="placeholder:text-ink-600 focus-visible:outline-ink-950 min-w-0 flex-1 border-0 bg-transparent text-base outline-none focus-visible:outline-2 focus-visible:-outline-offset-1 sm:text-sm"
              name="q"
              type="search"
              defaultValue={handle.props.query}
              maxLength={100}
              autoComplete="off"
              enterKeyHint="search"
              placeholder="Search a landlord, city, region, or experience"
              aria-label="Search renter reports"
              aria-autocomplete="list"
              aria-controls={listboxVisible ? listboxId : undefined}
              aria-describedby={statusId}
              aria-expanded={popupVisible ? "true" : "false"}
              aria-activedescendant={activeOptionId}
              list={undefined}
              role="combobox"
              mix={[
                ref((element) => {
                  inputElement = element
                }),
                on("focus", () => {
                  if (status === "idle") return
                  wantsSuggestions = true
                  isOpen = true
                  handle.update()
                }),
                on("input", async (event, signal) => {
                  let query = event.currentTarget.value.trim().slice(0, 100)
                  activeIndex = -1

                  if (query.length < REPORT_SUGGESTION_QUERY_MIN_LENGTH) {
                    suggestions = []
                    status = "idle"
                    isOpen = false
                    wantsSuggestions = false
                    handle.update()
                    return
                  }

                  suggestions = []
                  status = "loading"
                  isOpen = true
                  wantsSuggestions = true
                  handle.update()

                  if (!(await waitForDebounce(signal))) return

                  try {
                    let href = routes.reportSuggestions.href(undefined, {
                      searchParams: { q: query },
                    })
                    let response = await fetch(href, {
                      headers: { Accept: "application/json" },
                      signal,
                    })
                    if (!response.ok) throw new Error("Suggestion request failed")

                    let parsed = s.parseSafe(reportSuggestionResponseSchema, await response.json())
                    if (!parsed.success) throw new Error("Suggestion response was invalid")
                    if (signal.aborted) return

                    suggestions = parsed.value.suggestions.slice(0, REPORT_SUGGESTION_LIMIT)
                    status = "ready"
                    isOpen = wantsSuggestions
                  } catch {
                    if (signal.aborted) return
                    suggestions = []
                    status = "error"
                    isOpen = wantsSuggestions
                  }

                  handle.update()
                }),
                on("keydown", async (event) => {
                  if (event.key === "Escape" && popupVisible) {
                    event.preventDefault()
                    closeSuggestions()
                    return
                  }

                  if (suggestions.length === 0) return

                  if (event.key === "ArrowDown" || event.key === "ArrowUp") {
                    event.preventDefault()
                    isOpen = true
                    wantsSuggestions = true
                    activeIndex = getNextSuggestionIndex(
                      activeIndex,
                      event.key === "ArrowDown" ? 1 : -1,
                      suggestions.length,
                    )
                    let nextActiveIndex = activeIndex
                    let signal = await handle.update()
                    if (signal.aborted) return

                    inputElement?.ownerDocument
                      .getElementById(`${listboxId}-${nextActiveIndex}`)
                      ?.scrollIntoView({ block: "nearest" })
                    return
                  }

                  if (event.key === "Enter" && popupVisible && activeIndex >= 0) {
                    event.preventDefault()
                    let suggestion = suggestions[activeIndex]
                    if (suggestion != null) selectSuggestion(suggestion)
                  }
                }),
              ]}
            />
            <select
              className="border-ink-950 focus-visible:outline-ink-950 h-full shrink-0 border-0 border-l-[1.5px] bg-transparent px-2 text-sm font-medium focus-visible:outline-2 focus-visible:-outline-offset-3"
              name="radius"
              aria-label="Search radius"
              mix={[
                ref((element) => {
                  selectElement = element
                }),
                on("change", (event) => {
                  let value = event.currentTarget.value
                  if (value === "") {
                    clearRadiusAndSubmit()
                    return
                  }
                  requestGeolocation((lat, lng) => {
                    if (latInputElement != null) latInputElement.value = lat.toFixed(3)
                    if (lngInputElement != null) lngInputElement.value = lng.toFixed(3)
                    formElement?.requestSubmit()
                  })
                }),
              ]}
            >
              <option value="" selected={handle.props.radius === ""}>
                Any distance
              </option>
              {RADIUS_OPTIONS.map((miles) => (
                <option
                  key={String(miles)}
                  value={String(miles)}
                  selected={handle.props.radius === String(miles)}
                >
                  {miles} mi
                </option>
              ))}
            </select>
            <input
              type="hidden"
              name="lat"
              defaultValue={handle.props.lat}
              mix={ref((element) => {
                latInputElement = element
              })}
            />
            <input
              type="hidden"
              name="lng"
              defaultValue={handle.props.lng}
              mix={ref((element) => {
                lngInputElement = element
              })}
            />
            <button
              className="border-ink-950 bg-acid-100 hover:bg-acid-200 focus-visible:outline-ink-950 h-full shrink-0 border-0 border-l-[1.5px] px-3 font-semibold focus-visible:outline-2 focus-visible:-outline-offset-3 min-[901px]:px-5"
              type="submit"
            >
              Search
            </button>
          </form>

          <p id={statusId} className="sr-only" role="status" aria-live="polite">
            {getSuggestionStatusMessage(status, suggestions.length)}
          </p>

          {renderSuggestionPopup({
            activeIndex,
            listboxId,
            onSelect: selectSuggestion,
            status,
            suggestions,
            visible: popupVisible,
          })}
        </div>
      )
    }
  },
)

interface SuggestionPopupProps {
  activeIndex: number
  listboxId: string
  onSelect: (suggestion: ReportSuggestion) => void
  status: SuggestionStatus
  suggestions: ReportSuggestion[]
  visible: boolean
}

function renderSuggestionPopup({
  activeIndex,
  listboxId,
  onSelect,
  status,
  suggestions,
  visible,
}: SuggestionPopupProps): RemixNode {
  if (!visible) return null

  return (
    <div className="bg-paper-50 ring-ink-950/15 absolute top-full left-0 z-20 mt-3 w-full shadow-[5px_5px_0_var(--color-ink-950)] ring-1">
      {status === "loading" ? (
        <p className="px-4 py-3 text-base/7 text-pretty sm:text-sm/6">
          Searching the public record…
        </p>
      ) : status === "error" ? (
        <p className="px-4 py-3 text-base/7 text-pretty sm:text-sm/6">
          Suggestions are unavailable. Press Enter to search all reports.
        </p>
      ) : suggestions.length === 0 ? (
        <p className="px-4 py-3 text-base/7 text-pretty sm:text-sm/6">
          No suggestions yet. Press Enter to search all reports.
        </p>
      ) : (
        <>
          <div
            id={listboxId}
            className="max-h-[min(20rem,50vh)] overflow-y-auto overscroll-contain"
            role="listbox"
            aria-label="Search suggestions"
          >
            {suggestions.map((suggestion, index) => (
              <button
                key={`${suggestion.kind}:${suggestion.value}`}
                id={`${listboxId}-${index}`}
                className="border-ink-950/15 bg-paper-50 focus-visible:outline-ink-950 aria-[selected=true]:bg-acid-100 flex w-full items-start justify-between gap-4 border-0 border-b py-3 pr-3 pl-4 text-left last:border-b-0 hover:bg-blue-100 focus-visible:outline-2 focus-visible:-outline-offset-2 aria-[selected=true]:hover:bg-blue-100"
                type="button"
                role="option"
                tabIndex={-1}
                aria-selected={index === activeIndex ? "true" : "false"}
                mix={[
                  on("pointerdown", (event) => event.preventDefault()),
                  on("click", () => onSelect(suggestion)),
                ]}
              >
                <div className="min-w-0">
                  <p className="truncate text-base font-semibold sm:text-sm">{suggestion.label}</p>
                  <p className="font-mono text-[10px] font-medium tracking-wide uppercase">
                    {suggestion.description}
                  </p>
                </div>
                <p className="shrink-0 font-mono text-[10px] font-medium tracking-wide uppercase">
                  {index === activeIndex ? "Press Enter" : "Search"}{" "}
                  <span aria-hidden="true">→</span>
                </p>
              </button>
            ))}
          </div>
          <p className="border-ink-950/15 border-t px-4 py-2 font-mono text-[9px] tracking-wide uppercase">
            Locations by{" "}
            <a className="underline" href="https://photon.komoot.io/">
              Photon
            </a>{" "}
            · ©{" "}
            <a className="underline" href="https://www.openstreetmap.org/copyright">
              OpenStreetMap contributors
            </a>
          </p>
        </>
      )}
    </div>
  )
}

export function getNextSuggestionIndex(current: number, direction: 1 | -1, length: number): number {
  if (length <= 0) return -1
  if (direction === 1) return current >= length - 1 ? 0 : current + 1
  return current <= 0 ? length - 1 : current - 1
}

function getSuggestionStatusMessage(status: SuggestionStatus, count: number): string {
  if (status === "loading") return "Finding search suggestions."
  if (status === "error") return "Suggestions are unavailable. Press Enter to search all reports."
  if (status === "ready" && count === 0) {
    return "No suggestions found. Press Enter to search all reports."
  }
  if (status === "ready") {
    return `${count} ${count === 1 ? "suggestion" : "suggestions"} available. Use the arrow keys to choose one.`
  }
  return ""
}

function waitForDebounce(signal: AbortSignal): Promise<boolean> {
  return new Promise((resolve) => {
    if (signal.aborted) {
      resolve(false)
      return
    }

    let timeout = setTimeout(() => {
      signal.removeEventListener("abort", abort)
      resolve(true)
    }, REPORT_SUGGESTION_DEBOUNCE_MS)
    let abort = () => {
      clearTimeout(timeout)
      resolve(false)
    }

    signal.addEventListener("abort", abort, { once: true })
  })
}
