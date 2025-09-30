import {
    createCookie,
    createCookieSessionStorage,
    redirect,
} from "react-router";
import { createTypedCookie } from "remix-utils/typed-cookie";
import z from "zod";
import type { User } from "~/.server/generated/prisma/client";
import { env } from "./env";
import { getUserById } from "./models/user";

let sessionSchema = z
  .object({
    userId: z.string().nullish(),
  })
  .nullable();

let cookie = createCookie("_session", {
  sameSite: "lax",
  path: "/",
  httpOnly: true,
  secrets: env.SESSION_SECRET,
  secure: import.meta.env.PROD,
});

export let sessionStorage = createCookieSessionStorage({
  cookie: createTypedCookie({ cookie, schema: sessionSchema }),
});

export function getSession(request: Request) {
  let cookie = request.headers.get("Cookie");
  return sessionStorage.getSession(cookie);
}

export async function getUserId(
  request: Request,
): Promise<User["id"] | undefined> {
  let session = await getSession(request);
  let userId = session.get("userId");
  return userId;
}

export async function getUser(request: Request) {
  let userId = await getUserId(request);
  if (userId === undefined) return null;
  let user = await getUserById(userId);
  if (user) return user;
  let url = new URL(request.url).pathname;
  let redirectTo = url.search ? `${url}?${url.search}` : url;
  throw await logout(request, redirectTo);
}

export async function requireUserId(
  request: Request,
  redirectTo: string = new URL(request.url).pathname,
): Promise<User["id"]> {
  let userId = await getUserId(request);
  if (typeof userId === "string") return userId;
  let searchParams = new URLSearchParams();
  searchParams.set("redirectTo", redirectTo);
  throw redirect(`/login?${searchParams.toString()}`);
}

export async function requireUser(request: Request): Promise<User> {
  let user = await getUser(request);
  if (user) return user;
  let url = new URL(request.url);
  let redirectTo = url.search ? `${url.pathname}?${url.search}` : url.pathname;
  throw await logout(request, redirectTo);
}

export async function createUserSession({
  request,
  userId,
  remember,
  redirectTo,
}: {
  request: Request;
  userId: User["id"];
  remember: boolean;
  redirectTo: string;
}): Promise<Response> {
  let session = await getSession(request);
  session.set("userId", userId);
  // if remember is true, keep them logged in for a week
  // otherwise keep them logged in for their browser session
  let maxAge = remember ? 60 * 60 * 24 * 7 : undefined;
  return redirect(redirectTo, {
    headers: {
      "Set-Cookie": await sessionStorage.commitSession(session, { maxAge }),
    },
  });
}

export async function logout(request: Request, redirectTo: string = "/") {
  let session = await getSession(request);
  return redirect(redirectTo, {
    headers: { "Set-Cookie": await sessionStorage.destroySession(session) },
  });
}
