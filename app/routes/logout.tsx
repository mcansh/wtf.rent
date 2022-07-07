import type { ActionArgs } from "@remix-run/node";
import { redirect } from "@remix-run/node";
import { getSession, sessionStorage } from "~/session.server";

export async function action({ request }: ActionArgs) {
  let session = await getSession(request);
  let url = new URL(request.url);
  let returnTo = url.searchParams.get("returnTo") ?? "/";
  return redirect(returnTo, {
    headers: {
      "Set-Cookie": await sessionStorage.destroySession(session),
    },
  });
}

export function loader() {
  return redirect("/");
}
