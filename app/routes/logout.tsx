import type { DataFunctionArgs } from "@remix-run/node";
import { redirect } from "@remix-run/node";

import { logout } from "~/session.server";

export async function action({ request }: DataFunctionArgs) {
  return logout(request);
}

export function loader() {
  return redirect("/");
}
