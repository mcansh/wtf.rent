import { redirect } from "remix/response/redirect"
import { createController } from "remix/router"

import { requireAuth } from "../../middleware/auth.ts"
import { routes } from "../../routes.ts"
import { notFound } from "../not-found.tsx"

export const post = createController(routes.post, {
  actions: {
    create: {
      middleware: [requireAuth()],
      handler() {
        return redirect(routes.home.href())
      },
    },

    destroy: {
      middleware: [requireAuth()],
      handler() {
        return redirect(routes.home.href())
      },
    },

    edit: {
      middleware: [requireAuth()],
      handler(context) {
        return notFound(context.render)
      },
    },

    new: {
      middleware: [requireAuth()],
      handler(context) {
        return notFound(context.render)
      },
    },

    update: {
      middleware: [requireAuth()],
      handler() {
        return redirect(routes.home.href())
      },
    },

    show(context) {
      return notFound(context.render)
    },
  },
})
