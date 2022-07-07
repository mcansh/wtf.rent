import type { ActionFunction, LoaderFunction } from "@remix-run/node";
import { redirect } from "@remix-run/node";
import { sessionStorage } from "~/session.server";

export let action: ActionFunction = async ({ request }) => {
  let session = await sessionStorage.getSession(request.headers.get("Cookie"));
  let url = new URL(request.url);
  let returnTo = url.searchParams.get("returnTo") ?? "/";
  return redirect(returnTo, {
    headers: {
      "Set-Cookie": await sessionStorage.destroySession(session),
    },
  });
};

export let loader: LoaderFunction = () => {
  return redirect("/");
};
