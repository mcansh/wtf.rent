import { form, get, post, resources, route } from "remix/routes"

export const assetPrefix = "/assets"

export const routes = route({
  assets: get(`${assetPrefix}/*path`),
  home: "/",
  login: form("/login"),
  join: form("/join"),
  logout: post("/logout"),
  health: "/health",
  post: resources("/posts", { exclude: ["index"] }),
  reportSuggestions: get("/reports/suggestions"),
  profile: "/profile",

  directory: "/directory",
  rights: "/rights",
  about: "/about",
})
