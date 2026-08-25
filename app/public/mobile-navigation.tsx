import type { Handle, RemixNode } from "remix/ui"
import { clientEntry, on } from "remix/ui"

export const MobileNavigation = clientEntry(
  import.meta.url,
  function MobileNavigation(handle: Handle<{ children?: RemixNode }>) {
    return () => (
      <details
        className="group relative shrink-0 min-[901px]:hidden"
        mix={on("click", (event) => {
          let target = event.target
          if (!(target instanceof Element) || target.closest("a[href]") == null) return
          event.currentTarget.open = false
        })}
      >
        {handle.props.children}
      </details>
    )
  },
)
