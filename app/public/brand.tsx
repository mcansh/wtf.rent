import type { Handle } from "remix/ui"

export function Brand(handle: Handle<{ footer?: boolean }>) {
  return () => (
    <div
      data-footer={String(handle.props.footer ?? false)}
      class="data-footer:true:text-white text-ink-950 font-mono text-sm leading-[.84] font-medium tracking-[-.8px]"
    >
      <span className="border-ink-950 bg-acid-100 text-ink-950 mr-0.75 inline-grid size-5.5 -rotate-5 place-items-center border-[1.5px] font-serif text-lg min-[901px]:h-6.25 min-[901px]:w-6.25 min-[901px]:text-xl">
        W
      </span>
      WTF.
      <br />
      RENT
    </div>
  )
}
