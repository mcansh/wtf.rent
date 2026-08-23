export interface RightsGuideLink {
  href: string
  label: string
}

export interface RightsGuideStep {
  id: string
  items: readonly string[]
  link?: RightsGuideLink
  number: string
  summary: string
  title: string
}

export interface RightsResource {
  displayDomain: string
  href: string
  organization: string
  purpose: string
  scope: string
  title: string
}

export interface RightsGuide {
  disclaimer: {
    body: string
    title: string
  }
  resources: readonly RightsResource[]
  review: {
    isoDate: string
    label: string
  }
  steps: readonly RightsGuideStep[]
  urgentHelp: {
    body: string
    title: string
  }
}

const RIGHTS_RESOURCES = [
  {
    organization: "USAGov",
    title: "How to file a complaint against a landlord",
    purpose: "Find state tenant-rights agencies, handbooks, and dispute help.",
    scope: "United States",
    displayDomain: "usa.gov",
    href: "https://www.usa.gov/tenant-rights",
  },
  {
    organization: "U.S. Department of Housing and Urban Development",
    title: "HUD: Fair Housing Rights and Obligations",
    purpose: "Understand the federal fair-housing baseline and protected classes.",
    scope: "United States federal",
    displayDomain: "hud.gov",
    href: "https://www.hud.gov/stat/fheo/rights-obligations",
  },
  {
    organization: "U.S. Department of Housing and Urban Development",
    title: "HUD: Report Housing Discrimination",
    purpose: "Reach the current federal housing-discrimination complaint process.",
    scope: "United States federal",
    displayDomain: "hud.gov",
    href: "https://www.hud.gov/reporthousingdiscrimination",
  },
  {
    organization: "U.S. Department of Housing and Urban Development",
    title: "HUD: Housing Counseling",
    purpose: "Find a participating housing counseling agency.",
    scope: "United States",
    displayDomain: "hud.gov",
    href: "https://www.hud.gov/stat/sfh/housing-counseling",
  },
  {
    organization: "Legal Services Corporation",
    title: "I Need Legal Help",
    purpose: "Find an LSC-funded civil legal-aid organization.",
    scope: "United States and territories",
    displayDomain: "lsc.gov",
    href: "https://www.lsc.gov/about-lsc/what-legal-aid/i-need-legal-help",
  },
] as const satisfies readonly RightsResource[]

export const RIGHTS_GUIDE: RightsGuide = {
  review: {
    isoDate: "2026-08-18",
    label: "August 18, 2026",
  },
  urgentHelp: {
    title: "Need help right now?",
    body: "If someone is in immediate danger, contact the appropriate local emergency service. If you have court papers, an eviction notice, a lockout, a utility shutoff, or a deadline approaching, seek qualified local legal help promptly.",
  },
  disclaimer: {
    title: "General information, not legal advice.",
    body: "This guide does not create an attorney-client relationship and cannot decide your rights, deadlines, or best next move. Rental rules and remedies depend on your location, housing program, lease, and facts. Verify current rules with an official local source or qualified legal provider before acting.",
  },
  steps: [
    {
      id: "local-rules",
      number: "01",
      title: "Start with the rules that apply where you live",
      summary:
        "Rental rules can change across cities, states, provinces, territories, and housing programs. Begin by identifying the rulebook that actually covers your home.",
      items: [
        "Note your city or locality, state, province or territory, housing type, and any housing program involved.",
        "Read your current lease alongside official guidance; one does not replace the other.",
        "Use a government housing, consumer-protection, or tenant-rights office as your starting point.",
        "Outside the United States, look for your local housing authority, consumer-protection office, or legal-aid provider.",
      ],
      link: {
        label: "Find U.S. state tenant-rights help through USAGov",
        href: RIGHTS_RESOURCES[0].href,
      },
    },
    {
      id: "clear-record",
      number: "02",
      title: "Build a clear record",
      summary:
        "A dated, organized record can help a qualified adviser understand what happened. It does not prove a claim or replace local notice rules.",
      items: [
        "Keep your lease, notices, dated photos, repair requests, responses, and receipts together.",
        "Write a dated timeline of events while details are still fresh.",
        "When it is safe, communicate material concerns in writing and keep a copy.",
      ],
    },
    {
      id: "qualified-help",
      number: "03",
      title: "Match the problem to qualified help",
      summary:
        "The right starting point depends on the problem. Use local public agencies and qualified advisers instead of relying on a general web guide.",
      items: [
        "For unsafe conditions or unresolved property issues, look for the relevant local housing, health, or building authority.",
        "For possible housing discrimination in the United States, review HUD's federal fair-housing information and current complaint process.",
        "For a rental dispute or housing instability in the United States, look for HUD-participating housing counseling or local civil legal aid.",
      ],
    },
    {
      id: "guide-limits",
      number: "04",
      title: "Know what this guide cannot decide",
      summary:
        "Remedies and deadlines vary by jurisdiction and facts. A general guide cannot tell you whether a particular action is lawful or strategically right for you.",
      items: [
        "Notice methods, filing deadlines, entry rules, and retaliation protections may differ where you live.",
        "Rent escrow, repair-and-deduct, withholding rent, lease termination, and changing locks can carry serious local requirements or consequences.",
        "Do not ignore an entry notice, court paper, or approaching deadline while researching your options.",
      ],
    },
  ],
  resources: RIGHTS_RESOURCES,
}
