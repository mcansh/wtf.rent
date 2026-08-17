import { run } from "remix/ui"

const app = run({
  async loadModule(moduleUrl, exportName) {
    let mod = await import(moduleUrl)
    let Component = mod[exportName]
    if (!Component) {
      throw new Error(`Unknown component: ${moduleUrl}#${exportName}`)
    }
    return Component
  },

  async resolveFrame(src, options) {
    let response = await fetch(src, { ...options, headers: { Accept: "text/html" } })
    if (!response.ok) {
      return `<pre>Frame error: ${response.status} ${response.statusText}</pre>`
    }
    if (response.body) return response.body
    return response.text()
  },
})

app.ready().catch((error) => {
  console.error("Frame adoption failed:", error)
})
