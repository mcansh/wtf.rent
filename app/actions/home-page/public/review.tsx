import type { Handle } from "remix/ui"
import { clientEntry, on } from "remix/ui"

export type Review = {
  initials: string
  name: string
  location: string
  time: string
  tag: string
  title: string
  body: string
  score: 0 | 1 | 2 | 3 | 4 | 5
  replies: number
  cheers: number
  saved?: boolean
}

const BADGE_TONES = {
  0: "bg-[#ff9988]",
  1: "bg-[#ff9988]",
  2: "bg-[#f8d36d]",
  3: "bg-[#f8d36d]",
  4: "bg-acid-100",
  5: "bg-acid-100",
} as const

export const ReviewCard = clientEntry(
  import.meta.url,
  function ReviewCard(handle: Handle<{ review: Review }>) {
    let cheers = handle.props.review.cheers
    let saved = Boolean(handle.props.review.saved)

    let tagTone = BADGE_TONES[handle.props.review.score]

    return () => (
      <article className="grid grid-cols-[35px_1fr] gap-2.5 border-b border-[#a6aaa3] py-5.5 min-[901px]:grid-cols-[42px_1fr] min-[901px]:gap-3.25">
        <div className="bg-acid-100 grid h-8 w-8 place-items-center border border-[#172331] font-mono text-[10px] min-[901px]:h-9.5 min-[901px]:w-9.5 min-[901px]:text-xs">
          {handle.props.review.initials}
        </div>
        <div>
          <div className="flex flex-wrap gap-1.25 text-[11px] text-[#68726e]">
            <span className="font-bold text-[#172331]">{handle.props.review.name}</span>
            <span>·</span>
            <span>{handle.props.review.location}</span>
            <span>·</span>
            <span>{handle.props.review.time}</span>
          </div>
          <div className="mt-2 flex items-center gap-2.5">
            <span
              className={`border border-[#172331] px-1.25 py-0.75 font-mono text-[9px] tracking-[.4px] ${tagTone}`}
            >
              {handle.props.review.tag}
            </span>
            <Score value={handle.props.review.score} />
          </div>
          <h3
            className={`my-2 font-serif text-[21px] leading-[1.05] font-bold tracking-[-.5px] min-[901px]:text-[23px]`}
          >
            {handle.props.review.title}
          </h3>
          <p className="max-w-147.5 text-[13px] leading-[1.36] min-[901px]:text-sm">
            {handle.props.review.body}
          </p>
          <div className={`mt-3.25 flex gap-3.5 font-mono text-[11px] min-[901px]:gap-5`}>
            <button
              className="hover:text-[#607d18]"
              aria-label="Give a cheer"
              mix={on("click", () => {
                cheers = cheers + 1
                handle.update()
              })}
            >
              ⌃ <span>{cheers}</span>
            </button>
            <button className="hover:text-[#607d18]" aria-label="Reply to review">
              ▢ <span>{handle.props.review.replies}</span>
            </button>
            <button
              className={saved ? "text-[#607d18]" : "hover:text-[#607d18]"}
              mix={on("click", () => {
                saved = !saved
                handle.update()
              })}
              aria-label="Save review"
            >
              {saved ? "★ Saved" : "☆ Save"}
            </button>
          </div>
        </div>
      </article>
    )
  },
)

function Score(handle: Handle<{ value: number }>) {
  let stars = Array.from({ length: 5 }).map((_, index) => index)

  return () => (
    <span
      className="text-xs tracking-[-1px] text-[#a8aca5]"
      aria-label={`${handle.props.value} out of 5 rating`}
    >
      {stars.map((item) => (
        <span key={item} className={item < handle.props.value ? "text-[#172331]" : ""}>
          ★
        </span>
      ))}
    </span>
  )
}
