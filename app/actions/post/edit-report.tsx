import type { Issue } from "remix/data-schema"
import type { Handle } from "remix/ui"

import type { Post } from "../../data/schema.ts"
import { routes } from "../../routes.ts"
import { ShellPage } from "../../ui/shell.tsx"
import type { ClientReportFormValues, ReportFormErrors } from "./public/report-form.tsx"
import { ReportForm, REPORT_FORM_FIELD_NAMES } from "./public/report-form.tsx"
import type { ReportFormValues } from "./report-input.ts"
import { REPORT_CATEGORY_LABELS } from "./report-input.ts"

const REPORT_CATEGORY_OPTIONS = Object.entries(REPORT_CATEGORY_LABELS).map(([value, label]) => ({
  value,
  label,
}))

interface EditReportPageProps {
  csrfToken: string
  issues?: ReadonlyArray<Issue>
  report: Post
  values?: ReportFormValues
}

export function EditReportPage(handle: Handle<EditReportPageProps>) {
  return () => {
    let report = handle.props.report
    let values = getClientReportFormValues(handle.props.values ?? getReportFormValues(report))
    let errors = getReportFormErrors(handle.props.issues)

    return (
      <ShellPage title="Edit your report · wtf.rent">
        <main className="min-h-dvh bg-blue-100 py-10 sm:py-14 lg:py-18">
          <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 sm:px-8 lg:gap-10">
            <header className="grid gap-3">
              <a
                className="focus-visible:outline-ink-950 w-fit text-base font-semibold underline decoration-2 underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-4 sm:text-sm"
                href={routes.post.show.href({ id: report.id })}
              >
                <span aria-hidden="true">←</span> Back to report
              </a>
              <p className="font-mono text-sm font-medium tracking-wide uppercase sm:text-xs">
                Correct the rental record
              </p>
              <h1 className="max-w-[24ch] font-serif text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
                Edit your report.
              </h1>
              <p className="max-w-[56ch] text-base/7 text-pretty sm:text-sm/6">
                Update factual details or clarify your firsthand account. The corrected report
                remains public as soon as you save it.
              </p>
            </header>

            <div className="grid gap-6 lg:grid-cols-[7fr_3fr] lg:gap-8">
              <ReportForm
                action={routes.post.update.href({ id: report.id })}
                categoryOptions={REPORT_CATEGORY_OPTIONS}
                csrfToken={handle.props.csrfToken}
                errors={errors}
                mode="edit"
                values={values}
              />
              <EditGuidance />
            </div>
          </div>
        </main>
      </ShellPage>
    )
  }
}

function getReportFormValues(report: Post): ReportFormValues {
  return {
    address: report.address ?? "",
    city: report.city ?? "",
    region: report.region ?? "",
    landlordName: report.landlordName ?? "",
    category: report.category ?? "",
    rating: getReportRating(report.rating),
    title: report.title,
    content: report.content,
    isFirsthand: false,
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

function getReportRating(value: number | null): ReportFormValues["rating"] {
  switch (value) {
    case 1:
      return "1"
    case 2:
      return "2"
    case 3:
      return "3"
    case 4:
      return "4"
    case 5:
      return "5"
    default:
      return ""
  }
}

function EditGuidance() {
  return () => (
    <aside className="grid content-start gap-5" aria-label="Editing guidance">
      <section className="border-ink-950 bg-acid-100 grid gap-3 border-2 p-5 sm:p-6">
        <p className="font-mono text-sm font-medium tracking-wide uppercase sm:text-xs">
          Private location
        </p>
        <h2 className="font-serif text-2xl font-semibold tracking-tight text-balance">
          Your street address stays private
        </h2>
        <p className="text-base/7 text-pretty sm:text-sm/6">
          We use the building address to identify this report. Public pages continue to show only
          city and region.
        </p>
      </section>

      <section className="border-ink-950 bg-coral-100 grid gap-3 border-[1.5px] p-5 sm:p-6">
        <h2 className="font-serif text-2xl font-semibold tracking-tight text-balance">
          Recheck private details
        </h2>
        <p className="text-base/7 text-pretty sm:text-sm/6">
          Confirm again that the report contains no apartment number, private contact information,
          or another tenant’s name before saving.
        </p>
      </section>
    </aside>
  )
}
