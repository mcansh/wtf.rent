import type { Handle } from "remix/ui"
import { clientEntry, on } from "remix/ui"
import { animateEntrance, animateExit, spring } from "remix/ui/animation"

import { routes } from "../../../routes.ts"
import type { Review } from "./review.tsx"
import { ReviewCard } from "./review.tsx"

const reviews: Review[] = [
  {
    initials: "MK",
    name: "Maya K.",
    location: "Crown Heights, BK",
    time: "2h ago",
    tag: "HEATING",
    title: "Three winters, one working radiator.",
    body: "The super is kind, but management only reacts after a 311 ticket. Keep every email. The heat eventually came on, but the process was exhausting.",
    score: 2,
    replies: 14,
    cheers: 38,
  },
  {
    initials: "JT",
    name: "Jordan T.",
    location: "Pilsen, Chicago",
    time: "5h ago",
    tag: "GOOD NEWS",
    title: "A landlord who actually fixes things.",
    body: "Our sink started leaking at 9am. A plumber was there before lunch, no arguments, no weird fees. Just wanted this to be on the record.",
    score: 5,
    replies: 7,
    cheers: 61,
    saved: true,
  },
  {
    initials: "RS",
    name: "Rosa S.",
    location: "Mission District, SF",
    time: "Yesterday",
    tag: "RENT HIKE",
    title: "The renewal number made no sense.",
    body: "A 19% increase with no improvements to a building that still has package theft and a broken front buzzer. Has anyone negotiated with Far Row Properties?",
    score: 1,
    replies: 26,
    cheers: 43,
  },
]

export const HomePage = clientEntry(
  import.meta.url,
  function HomePage(
    handle: Handle<{
      initialQuery?: string
    }>,
  ) {
    let activeTab = "For you"
    let notice = false
    let filteredReviews = reviews.filter((review) => {
      if (!handle.props.initialQuery) return true
      return `${review.title} ${review.location} ${review.tag}`
        .toLowerCase()
        .includes(handle.props.initialQuery.toLowerCase())
    })

    let eyebrow = `mb-3 text-[10px] font-medium tracking-[1.1px] font-mono`

    return () => (
      <main className="min-h-screen overflow-hidden bg-[#f6f3ea] text-[#172331]">
        <section
          className="min-h-105 border-b-2 border-[#1c2b36] bg-[#b9d9f3] px-5 pt-13 pb-11.5 min-[541px]:min-h-110 min-[541px]:px-[8vw] min-[541px]:pt-14.5 min-[541px]:pb-11.5 min-[901px]:grid min-[901px]:grid-cols-[minmax(0,1.3fr)_minmax(280px,.7fr)] min-[901px]:gap-[6vw] min-[901px]:px-[12.5vw] min-[901px]:pt-18.5 min-[901px]:pb-16"
          id="top"
        >
          <div>
            <p className={eyebrow}>THE RENTAL RECORD, MADE PUBLIC</p>
            <h1
              className={`m-0 font-serif text-[54px] leading-[.86] font-extrabold tracking-[-2.6px] min-[541px]:text-[clamp(58px,7vw,78px)] min-[901px]:text-[clamp(50px,6.1vw,88px)] min-[901px]:tracking-[-4px]`}
            >
              What’s it really
              <br />
              <em className="font-bold">like</em> living there?
            </h1>
            <p className="mt-5 mb-6 max-w-105 text-base leading-[1.35] min-[901px]:mt-5.75 min-[901px]:mb-6.5 min-[901px]:text-[17px]">
              Unfiltered reports from renters. The good, the bad, and the landlord specials.
            </p>
            <div className="flex h-13 max-w-140 items-center border-[1.5px] border-[#1c2b36] bg-[#fffdf7] shadow-[4px_4px_0_#172331] min-[901px]:h-13.5 min-[901px]:shadow-[5px_5px_0_#172331]">
              <span className="grid h-13 place-items-center px-3 text-[27px]">⌕</span>
              <form
                className="flex size-full items-center"
                method="get"
                action={routes.home.href() + "#feed"}
              >
                <input
                  className="min-w-0 flex-1 border-0 bg-transparent text-sm outline-none"
                  name="q"
                  placeholder="Search an address, landlord, or city"
                  aria-label="Search renter reports"
                />
                <button className="bg-acid-100 h-full border-0 border-l-[1.5px] border-[#1c2b36] px-2.75 font-bold min-[901px]:px-4.5">
                  Search
                </button>
              </form>
            </div>
            <div className="mt-5.25 flex flex-wrap items-center gap-2 text-[11px] min-[901px]:gap-3">
              <b className="font-mono text-[9px]">POPULAR:</b>
              {[
                ["Crown Heights", "Crown Heights"],
                ["Chicago", "Chicago"],
                ["Rent hikes", "rent"],
              ].map(([label, search]) => (
                <a
                  key={label}
                  className="border-0 bg-transparent p-0 text-xs hover:underline"
                  href={routes.home.href(undefined, {
                    searchParams: { q: search },
                  })}
                >
                  {label}
                </a>
              ))}
            </div>
          </div>
          <div
            className="after:bg-acid-100 relative hidden aspect-[1/1.12] w-full max-w-67.5 rotate-[4deg] flex-col justify-between self-center border-2 border-[#172331] bg-[#f26855] p-4.5 text-[#172331] shadow-[9px_9px_0_#172331] after:absolute after:-top-7 after:-right-5 after:-z-10 after:h-19.5 after:w-19.5 after:rounded-full after:border-2 after:border-[#172331] min-[901px]:flex"
            aria-label="Tenant-made poster"
          >
            <p
              className={`my-1.25 font-serif text-[50px] leading-[.78] font-extrabold tracking-[-3px]`}
            >
              KEEP
              <br />
              YOUR
              <br />
              <span className="text-[39px] italic">RECEIPTS.</span>
            </p>
            <small className={`font-mono text-[8px] leading-[1.2]`}>
              THIS HAS BEEN A PUBLIC SERVICE ANNOUNCEMENT
              <br />
              FROM YOUR FELLOW TENANTS
            </small>
          </div>
        </section>

        <section className="bg-acid-100 flex h-10.75 items-center gap-3.5 overflow-hidden border-b-2 border-[#1c2b36] font-mono text-[9px] tracking-[.4px] whitespace-nowrap min-[901px]:gap-5.75 min-[901px]:text-[10px]">
          <span className="-ml-7.5">LIVE FROM THE RENTERS’ FEED</span>
          <span>•</span>
          <span>1,284 NEW REPORTS THIS WEEK</span>
          <span>•</span>
          <span>REAL PEOPLE. REAL BUILDINGS.</span>
          <span>•</span>
          <span>LIVE FROM THE RENTERS’ FEED</span>
        </section>

        <section
          className="block px-5 pt-9 pb-14.5 min-[541px]:px-[7vw] min-[541px]:pt-11.25 min-[541px]:pb-20 min-[901px]:grid min-[901px]:grid-cols-[260px_minmax(0,720px)] min-[901px]:justify-center min-[901px]:gap-17.5 min-[901px]:px-[5vw] min-[901px]:pt-15.5"
          id="feed"
        >
          <aside className="hidden min-[901px]:flex min-[901px]:min-h-161.25 min-[901px]:flex-col min-[901px]:justify-between min-[901px]:pt-2">
            <div>
              <p className={eyebrow}>BROWSE THE RECORD</p>
              {[
                ["✣ Latest reports", "24"],
                ["◌ Top rated landlords", ""],
                ["⌂ Buildings near you", ""],
                ["⚑ Tenant victories", ""],
              ].map(([label, count], i) => (
                <a
                  className={`flex justify-between border-t border-[#9ca39e] py-3 text-sm font-semibold ${
                    i === 0 ? "text-[#58721a]" : ""
                  } ${i === 3 ? "border-b" : ""}`}
                  href="#feed"
                  key={label}
                >
                  {label}
                  <span className="font-mono text-[10px]">{count}</span>
                </a>
              ))}
            </div>
            <div className="mt-11.25">
              <p className={eyebrow}>YOUR CITY</p>
              <strong className={`block font-serif text-[19px] font-bold`}>New York, NY</strong>
              <button className="border-0 border-b border-[#172331] bg-transparent px-0 pt-1.25 pb-px text-xs">
                Change city →
              </button>
            </div>
            <div
              className="rotate-[-1.3deg] border-[1.5px] border-[#1c2b36] bg-[#f26855] p-4 shadow-[4px_4px_0_#172331]"
              id="guide"
            >
              <span className="text-2xl">☻</span>
              <h3 className={`my-2 font-serif text-[23px] leading-[.95] font-extrabold`}>
                Not sure what’s legal?
              </h3>
              <p className="text-xs leading-tight">Get the basics before you send that email.</p>
              <a className="text-xs underline" href="#guide">
                Read the field guide →
              </a>
            </div>
          </aside>
          <section className="mx-auto w-full max-w-180">
            <div className="flex items-end justify-between">
              <div>
                <p className={eyebrow}>THE PULSE</p>
                <h2
                  className={`m-0 font-serif text-[37px] leading-[.9] font-extrabold tracking-[-1.7px] min-[901px]:text-[42px]`}
                >
                  Latest reports
                </h2>
              </div>
              <button className="border border-[#172331] bg-transparent px-2.25 py-2 text-xs font-bold min-[901px]:px-2.75">
                ⌘ Filter{" "}
                <span className={`bg-acid-100 ml-1.25 px-1.25 py-0.5 font-mono text-[10px]`}>
                  3
                </span>
              </button>
            </div>
            <div className="mt-7.25 flex gap-5 border-b border-[#a6aaa3]">
              {["For you", "Following", "Near you"].map((tab) => (
                <button
                  key={tab}
                  mix={on("click", () => {
                    activeTab = tab
                    handle.update()
                  })}
                  className={`relative border-0 bg-transparent pb-2.75 text-[13px] font-bold ${
                    activeTab === tab
                      ? "after:absolute after:right-0 after:-bottom-px after:left-0 after:h-0.75 after:bg-[#172331]"
                      : ""
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
            <div className="my-1.75 flex items-center gap-3 border-b border-[#a6aaa3] py-3.5">
              <div
                className={`bg-acid-100 grid h-7.75 w-7.75 place-items-center border border-[#172331] font-mono text-[10px]`}
              >
                YOU
              </div>
              <button
                className="flex-1 border-0 bg-transparent text-left text-sm text-[#68726e]"
                mix={on("click", () => {
                  notice = true
                  handle.update()
                })}
              >
                What happened at your place?
              </button>
              <span>📷</span>
            </div>
            <div>
              {filteredReviews.length ? (
                filteredReviews.map((review) => <ReviewCard key={review.name} review={review} />)
              ) : (
                <div className="py-11.25 text-center font-serif text-xl">
                  No reports found. Try an address, city, or a different issue.
                </div>
              )}
            </div>
            <button
              className="bg-acid-100 mx-auto mt-7.25 block border-[1.5px] border-[#172331] px-4.5 py-3 text-[13px] font-bold shadow-[3px_3px_0_#172331]"
              mix={on("click", () => {
                notice = true
                handle.update()
              })}
            >
              Load more reports <span>↓</span>
            </button>
          </section>
        </section>
        {notice ? (
          <div
            className="border-acid-100 fixed right-4 bottom-4 z-10 max-w-90 border bg-[#172331] py-3.75 pr-10.5 pl-4 text-[13px] text-white shadow-[5px_5px_0_#d9f443] min-[901px]:right-6.25 min-[901px]:bottom-6.25"
            role="status"
            mix={[
              animateEntrance({
                translate: "0 100%",
                opacity: 0,
                scale: 0.8,
                ...spring({ duration: 400, bounce: 0.5 }),
              }),
              animateExit({
                translate: "0 100%",
                opacity: 0,
                scale: 0.8,
                ...spring({ duration: 400, bounce: 0.5 }),
              }),
            ]}
          >
            You’re in! Creating an account is the next step to add your report.
            <button
              className="absolute top-2.25 right-3 border-0 bg-transparent text-xl text-white"
              mix={on("click", () => {
                notice = false
                handle.update()
              })}
              aria-label="Close notice"
            >
              ×
            </button>
          </div>
        ) : null}
      </main>
    )
  },
)
