import type { PublicReportPage } from "../../data/reports.ts"
import { REPORT_CATEGORY_LABELS } from "../post/report-input.ts"
import type { ClientReportPage } from "./public/page.tsx"

export function serializeReportPage(reportPage: PublicReportPage): ClientReportPage {
  return {
    ...reportPage,
    reports: reportPage.reports.map((report) => ({
      id: report.id,
      title: report.title,
      content: report.content,
      city: report.city,
      region: report.region,
      landlordName: report.landlordName,
      categoryLabel: report.category == null ? null : REPORT_CATEGORY_LABELS[report.category],
      rating: report.rating,
      createdAt: report.createdAt.toISOString(),
      username: report.username,
    })),
  }
}
