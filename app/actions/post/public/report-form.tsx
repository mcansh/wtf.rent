import type { Handle, SerializableObject } from "remix/ui"
import { clientEntry, on } from "remix/ui"

import { routes } from "../../../routes.ts"

const RATING_OPTIONS = [
  ["1", "Very poor"],
  ["2", "Poor"],
  ["3", "Mixed"],
  ["4", "Good"],
  ["5", "Excellent"],
] as const

export const REPORT_FORM_FIELD_NAMES = [
  "address",
  "city",
  "region",
  "landlordName",
  "category",
  "rating",
  "title",
  "content",
  "isFirsthand",
] as const

const FIELD_CLASS =
  "border-ink-950 bg-paper-50 focus-visible:bg-acid-50 focus-visible:outline-ink-950 aria-[invalid=true]:border-coral-600 aria-[invalid=true]:bg-coral-50 w-full border-[1.5px] px-3 py-3 text-base outline-none focus-visible:-outline-offset-1 focus-visible:outline-2 sm:py-2.5 sm:text-sm"

export type ReportFormFieldName = (typeof REPORT_FORM_FIELD_NAMES)[number]

export interface ClientReportFormValues extends SerializableObject {
  address: string
  category: string
  city: string
  content: string
  isFirsthand: boolean
  landlordName: string
  rating: string
  region: string
  title: string
}

export type ReportFormErrors = SerializableObject & Record<ReportFormFieldName, string[]>

export interface ReportCategoryOption extends SerializableObject {
  label: string
  value: string
}

interface ReportFormProps extends SerializableObject {
  action?: string
  categoryOptions: ReportCategoryOption[]
  csrfToken: string
  errors: ReportFormErrors
  mode?: "create" | "edit"
  values: ClientReportFormValues
}

export const ReportForm = clientEntry(
  import.meta.url,
  function ReportForm(handle: Handle<ReportFormProps>) {
    let submission = createReportSubmissionState()

    return () => {
      let { categoryOptions, csrfToken, errors, values } = handle.props
      let mode = handle.props.mode ?? "create"
      let action = handle.props.action ?? routes.post.create.href()
      let editing = mode === "edit"
      let hasErrors = REPORT_FORM_FIELD_NAMES.some((fieldName) => errors[fieldName].length > 0)

      return (
        <form
          className="border-ink-950 shadow-ink-950 bg-paper-50 grid gap-8 border-2 p-5 shadow-[7px_7px_0_var(--color-ink-950)] sm:p-8 lg:p-10 lg:shadow-[10px_10px_0_var(--color-ink-950)]"
          method="post"
          action={action}
          rmx-document
          mix={on("submit", (event) => {
            if (!submission.begin()) {
              event.preventDefault()
              return
            }

            if (!(event.currentTarget instanceof HTMLFormElement)) return
            let submitButton = event.currentTarget.querySelector('button[type="submit"]')
            if (submitButton instanceof HTMLButtonElement) submitButton.disabled = true
          })}
        >
          {editing ? <input type="hidden" name="_method" value="PUT" /> : null}
          <input type="hidden" name="_csrf" value={csrfToken} />

          {hasErrors ? (
            <div
              className="border-coral-700 bg-coral-50 grid gap-1 border-l-4 px-4 py-3"
              role="alert"
            >
              <p className="font-semibold">
                {editing
                  ? "We couldn’t save these changes yet."
                  : "We couldn’t publish this report yet."}
              </p>
              <p className="text-base/7 text-pretty sm:text-sm/6">
                Review the highlighted fields and try again.
              </p>
            </div>
          ) : null}

          <fieldset className="grid gap-5">
            <legend className="font-serif text-2xl font-semibold tracking-tight text-balance">
              Where did this happen?
            </legend>
            <p className="max-w-[56ch] text-base/7 text-pretty sm:text-sm/6">
              We store the street address to identify the report, but only city and region are shown
              publicly. Leave out apartment, unit, and suite details.
            </p>

            <ReportTextField
              name="address"
              label="Building address"
              helper="Stored privately. Use street number and street name only—no apartment, unit, or suite."
              value={values.address}
              minLength={5}
              maxLength={160}
              autoComplete="off"
              errors={errors.address}
              required
            />

            <div className="grid gap-5 md:grid-cols-[2fr_1fr]">
              <ReportTextField
                name="city"
                label="City"
                value={values.city}
                maxLength={100}
                autoComplete="address-level2"
                errors={errors.city}
                required
              />
              <ReportTextField
                name="region"
                label="State, province, or region"
                value={values.region}
                maxLength={100}
                autoComplete="address-level1"
                errors={errors.region}
                required
              />
            </div>

            <ReportTextField
              name="landlordName"
              label="Landlord or property manager"
              helper="Optional. Use the public business or management name when possible."
              value={values.landlordName}
              minLength={2}
              maxLength={160}
              autoComplete="off"
              errors={errors.landlordName}
            />
          </fieldset>

          <fieldset className="border-ink-950/20 grid gap-5 border-t pt-8">
            <legend className="font-serif text-2xl font-semibold tracking-tight text-balance">
              What was your experience?
            </legend>
            <p className="max-w-[56ch] text-base/7 text-pretty sm:text-sm/6">
              Stick to what you personally experienced and keep private contact details out.
            </p>

            <div className="grid gap-2">
              <label className="text-base font-semibold sm:text-sm" htmlFor="category">
                Category
              </label>
              <p id="category-help" className="text-base/7 text-pretty sm:text-sm/6">
                Choose the subject that best fits your report.
              </p>
              <span className="inline-grid w-full grid-cols-[1fr_--spacing(8)]">
                <select
                  id="category"
                  className={`${FIELD_CLASS} col-span-full row-start-1 appearance-none pr-8`}
                  name="category"
                  aria-describedby={getDescribedBy("category-help", errors.category, "category")}
                  aria-invalid={hasFieldErrors(errors.category) ? "true" : undefined}
                  required
                >
                  <option value="" selected={values.category === ""}>
                    Choose a category
                  </option>
                  {categoryOptions.map((option) => (
                    <option
                      key={option.value}
                      value={option.value}
                      selected={values.category === option.value}
                    >
                      {option.label}
                    </option>
                  ))}
                </select>
                <svg
                  viewBox="0 0 8 5"
                  width={8}
                  height={5}
                  fill="none"
                  className="stroke-ink-950 pointer-events-none col-start-2 row-start-1 place-self-center"
                  aria-hidden="true"
                >
                  <path d="M.5.5 4 4 7.5.5" />
                </svg>
              </span>
              <FieldErrors errors={errors.category} name="category" />
            </div>

            <fieldset className="grid gap-2">
              <legend className="text-base font-semibold sm:text-sm">Overall rating</legend>
              <p id="rating-help" className="text-base/7 text-pretty sm:text-sm/6">
                Rate the rental experience from 1 to 5.
              </p>
              <div className="grid gap-2 min-[400px]:grid-cols-2 sm:grid-cols-5">
                {RATING_OPTIONS.map(([rating, label]) => (
                  <label
                    key={rating}
                    className="border-ink-950 has-checked:bg-acid-100 flex items-center gap-2 border-[1.5px] p-3 text-base sm:p-2 sm:text-sm"
                    htmlFor={`rating-${rating}`}
                  >
                    <span className="flex h-lh items-center text-base sm:text-sm">
                      <span className="group inline-grid size-5 grid-cols-1 sm:size-4">
                        <input
                          id={`rating-${rating}`}
                          className="checked:border-ink-950 checked:bg-ink-950 focus-visible:outline-ink-950 border-ink-400 bg-paper-50 col-start-1 row-start-1 appearance-none rounded-full border focus-visible:outline-2 focus-visible:outline-offset-2 forced-colors:appearance-auto"
                          name="rating"
                          type="radio"
                          value={rating}
                          defaultChecked={values.rating === rating}
                          aria-describedby={getDescribedBy("rating-help", errors.rating, "rating")}
                          aria-invalid={hasFieldErrors(errors.rating) ? "true" : undefined}
                          required
                        />
                        <span className="bg-paper-50 pointer-events-none col-start-1 row-start-1 size-[round(down,40%,1px)] self-center justify-self-center rounded-full group-not-has-checked:opacity-0" />
                      </span>
                    </span>
                    <span>
                      {rating} — {label}
                    </span>
                  </label>
                ))}
              </div>
              <FieldErrors errors={errors.rating} name="rating" />
            </fieldset>

            <ReportTextField
              name="title"
              label="Report title"
              helper="Summarize the experience in a specific, factual headline."
              value={values.title}
              minLength={5}
              maxLength={120}
              autoComplete="off"
              errors={errors.title}
              required
            />

            <div className="grid gap-2">
              <label className="text-base font-semibold sm:text-sm" htmlFor="content">
                What happened?
              </label>
              <p id="content-help" className="text-base/7 text-pretty sm:text-sm/6">
                Describe your firsthand experience. Do not include phone numbers, email addresses,
                unit details, or names of individual tenants.
              </p>
              <textarea
                id="content"
                className={`${FIELD_CLASS} min-h-48 resize-y`}
                name="content"
                defaultValue={values.content}
                minLength={20}
                maxLength={5_000}
                aria-describedby={getDescribedBy("content-help", errors.content, "content")}
                aria-invalid={hasFieldErrors(errors.content) ? "true" : undefined}
                required
              />
              <FieldErrors errors={errors.content} name="content" />
            </div>
          </fieldset>

          <fieldset className="border-ink-950/20 grid gap-5 border-t pt-8">
            <legend className="font-serif text-2xl font-semibold tracking-tight text-balance">
              {editing ? "Before you save" : "Before you publish"}
            </legend>
            <div className="bg-acid-50 border-ink-950 flex items-start gap-3 border-[1.5px] p-4">
              <span className="flex h-lh items-center text-base sm:text-sm">
                <span className="group inline-grid size-5 grid-cols-1 sm:size-4">
                  <input
                    id="isFirsthand"
                    className="checked:border-ink-950 checked:bg-ink-950 focus-visible:outline-ink-950 border-ink-400 bg-paper-50 col-start-1 row-start-1 appearance-none rounded-sm border focus-visible:outline-2 focus-visible:outline-offset-2 forced-colors:appearance-auto"
                    name="isFirsthand"
                    type="checkbox"
                    defaultChecked={values.isFirsthand}
                    aria-describedby={getDescribedBy(
                      "isFirsthand-help",
                      errors.isFirsthand,
                      "isFirsthand",
                    )}
                    aria-invalid={hasFieldErrors(errors.isFirsthand) ? "true" : undefined}
                    required
                  />
                  <svg
                    viewBox="0 0 14 14"
                    fill="none"
                    className="stroke-paper-50 pointer-events-none col-start-1 row-start-1 size-7/8 self-center justify-self-center group-not-has-checked:opacity-0"
                    aria-hidden="true"
                  >
                    <path
                      d="M3 8L6 11L11 3.5"
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
              </span>
              <div className="grid min-w-0 gap-1">
                <label className="text-base font-semibold sm:text-sm" htmlFor="isFirsthand">
                  This is my firsthand rental experience.
                </label>
                <p id="isFirsthand-help" className="text-base/7 text-pretty sm:text-sm/6">
                  I removed apartment or unit details, private contact information, and other
                  tenants’ names.
                </p>
                <FieldErrors errors={errors.isFirsthand} name="isFirsthand" />
              </div>
            </div>
          </fieldset>

          <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="max-w-[56ch] text-base/7 text-pretty sm:text-sm/6">
              {editing
                ? "Your saved changes appear on the public report immediately."
                : "Reports publish immediately after submission."}
            </p>
            <button
              className="border-ink-950 bg-acid-100 hover:bg-acid-200 focus-visible:outline-ink-950 disabled:bg-ink-100 shrink-0 border-[1.5px] px-4 py-2.5 text-base font-semibold shadow-[3px_3px_0_var(--color-ink-950)] focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-wait disabled:shadow-none sm:px-3 sm:py-2 sm:text-sm"
              type="submit"
            >
              {editing ? "Save changes" : "Publish report"}
            </button>
          </div>
        </form>
      )
    }
  },
)

export function createReportSubmissionState() {
  let started = false

  return {
    get started() {
      return started
    },
    begin() {
      if (started) return false
      started = true
      return true
    },
  }
}

interface ReportTextFieldProps {
  autoComplete: string
  errors?: ReadonlyArray<string>
  helper?: string
  label: string
  maxLength: number
  minLength?: number
  name: "address" | "city" | "landlordName" | "region" | "title"
  required?: boolean
  value: string
}

function ReportTextField(handle: Handle<ReportTextFieldProps>) {
  return () => {
    let { autoComplete, errors, helper, label, maxLength, minLength, name, required, value } =
      handle.props
    let helperId = helper ? `${name}-help` : undefined

    return (
      <div className="grid gap-2">
        <label className="text-base font-semibold sm:text-sm" htmlFor={name}>
          {label}
          {!required ? " (optional)" : null}
        </label>
        {helper ? (
          <p id={helperId} className="text-base/7 text-pretty sm:text-sm/6">
            {helper}
          </p>
        ) : null}
        <input
          id={name}
          className={FIELD_CLASS}
          name={name}
          type="text"
          defaultValue={value}
          minLength={minLength}
          maxLength={maxLength}
          autoComplete={autoComplete}
          aria-describedby={getDescribedBy(helperId, errors, name)}
          aria-invalid={hasFieldErrors(errors) ? "true" : undefined}
          required={required}
        />
        <FieldErrors errors={errors} name={name} />
      </div>
    )
  }
}

function hasFieldErrors(errors: ReadonlyArray<string> | undefined): boolean {
  return (errors?.length ?? 0) > 0
}

function getDescribedBy(
  helperId: string | undefined,
  errors: ReadonlyArray<string> | undefined,
  name: ReportFormFieldName,
): string | undefined {
  let ids = [helperId, hasFieldErrors(errors) ? `${name}-error` : undefined].filter(Boolean)
  return ids.length > 0 ? ids.join(" ") : undefined
}

function FieldErrors(
  handle: Handle<{ errors?: ReadonlyArray<string>; name: ReportFormFieldName }>,
) {
  return () => {
    let errors = handle.props.errors ?? []
    if (errors.length === 0) return null

    return (
      <ul
        id={`${handle.props.name}-error`}
        className="text-coral-700 grid gap-1 text-base font-semibold sm:text-sm"
      >
        {errors.map((error, index) => (
          <li key={`${index}:${error}`}>{error}</li>
        ))}
      </ul>
    )
  }
}
