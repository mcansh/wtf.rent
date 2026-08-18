import type { Issue } from "remix/data-schema"
import type { Handle } from "remix/ui"

import { ShellPage } from "../../ui/shell.tsx"
import type { ClientReportFormValues, ReportFormErrors } from "./public/report-form.tsx"
import { ReportForm, REPORT_FORM_FIELD_NAMES } from "./public/report-form.tsx"
import type { ReportFormValues } from "./report-input.ts"
import { REPORT_CATEGORY_LABELS } from "./report-input.ts"

const EMPTY_REPORT_VALUES = {
  address: "",
  city: "",
  region: "",
  landlordName: "",
  category: "",
  rating: "",
  title: "",
  content: "",
  isFirsthand: false,
} as const satisfies ReportFormValues

const REPORT_CATEGORY_OPTIONS = Object.entries(REPORT_CATEGORY_LABELS).map(([value, label]) => ({
  value,
  label,
}))

export interface NewReportPageProps {
  csrfToken: string
  issues?: ReadonlyArray<Issue>
  values?: ReportFormValues
}

export function NewReportPage(handle: Handle<NewReportPageProps>) {
  return () => {
    let values = getClientReportFormValues(handle.props.values ?? EMPTY_REPORT_VALUES)
    let errors = getReportFormErrors(handle.props.issues)

    return (
      <ShellPage title="Share a renter report · wtf.rent">
        <main className="min-h-dvh bg-blue-100 py-10 sm:py-14 lg:py-18">
          <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 sm:px-8 lg:gap-10">
            <header className="grid gap-3">
              <p className="font-mono text-sm font-medium tracking-wide uppercase sm:text-xs">
                Add to the rental record
              </p>
              <h1 className="max-w-[24ch] font-serif text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
                Put your rental experience on the record.
              </h1>
              <p className="max-w-[56ch] text-base/7 text-pretty sm:text-sm/6">
                Share what happened at one building so the next renter has more than a listing to go
                on.
              </p>
            </header>

            <div className="grid gap-6 lg:grid-cols-[7fr_3fr] lg:gap-8">
              <ReportForm
                categoryOptions={REPORT_CATEGORY_OPTIONS}
                csrfToken={handle.props.csrfToken}
                errors={errors}
                values={values}
              />
              <ReportGuidance />
            </div>
          </div>
        </main>
      </ShellPage>
    )
  }
}

function getClientReportFormValues(values: ReportFormValues): ClientReportFormValues {
  return {
    address: values.address,
    city: values.city,
    region: values.region,
    landlordName: values.landlordName,
    category: values.category,
    rating: values.rating,
    title: values.title,
    content: values.content,
    isFirsthand: values.isFirsthand,
  }
}

function getReportFormErrors(issues: ReadonlyArray<Issue> | undefined): ReportFormErrors {
  let errors: ReportFormErrors = {
    address: [],
    city: [],
    region: [],
    landlordName: [],
    category: [],
    rating: [],
    title: [],
    content: [],
    isFirsthand: [],
  }

  for (let fieldName of REPORT_FORM_FIELD_NAMES) {
    errors[fieldName] =
      issues?.filter((issue) => issue.path?.[0] === fieldName).map((issue) => issue.message) ?? []
  }

  return errors
}

function ReportGuidance() {
  return () => (
    <aside className="grid content-start gap-5" aria-label="Publishing guidance">
      <section className="border-ink-950 bg-acid-100 grid gap-3 border-2 p-5 sm:p-6">
        <p className="font-mono text-sm font-medium tracking-wide uppercase sm:text-xs">
          Public record
        </p>
        <h2 className="font-serif text-2xl font-semibold tracking-tight text-balance">
          What becomes public
        </h2>
        <p className="text-base/7 text-pretty sm:text-sm/6">
          Your street address is stored to identify the report, but it is not shown publicly.
        </p>
        <ul className="list-disc space-y-2 pl-5 text-base/7 sm:text-sm/6">
          <li>City and state, province, or region</li>
          <li>Your public username</li>
          <li>Rating, category, title, and report</li>
        </ul>
      </section>

      <section className="border-ink-950 bg-coral-100 grid gap-3 border-[1.5px] p-5 sm:p-6">
        <h2 className="font-serif text-2xl font-semibold tracking-tight text-balance">
          Keep private details out
        </h2>
        <p className="text-base/7 text-pretty sm:text-sm/6">
          Do not include an apartment number, unit, suite, phone number, email address, or another
          tenant’s name in any field.
        </p>
      </section>
    </aside>
  )
}
