import { redirect } from "react-router";

import { logout } from "~/session.server";
import type { Route } from "./+types/logout";

export async function action({ request }: Route.ActionArgs) {
  return logout(request);
}

export function loader() {
  return redirect("/");
}
