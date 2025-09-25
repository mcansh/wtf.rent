import type { RouteConfig } from "@react-router/dev/routes";
import { index, layout, route } from "@react-router/dev/routes";

export default [
  index("routes/_index.tsx"),
  route("health", "routes/health.ts"),
  route("logout", "routes/logout.tsx"),
  route("profile", "routes/profile.tsx"),
  route("post/new", "routes/post.new.tsx"),
  route("post/:id", "routes/post.$id.tsx"),
  route("post/:id/edit", "routes/post.$id.edit.tsx"),
  layout("routes/_auth.tsx", [
    route("join", "routes/_auth.join.tsx"),
    route("login", "routes/_auth.login.tsx"),
  ]),
] satisfies RouteConfig;
