import type { User } from "@prisma/client";
import { createCookieSessionStorage, redirect } from "@remix-run/node";

import { getUserById } from "./models/user.server";

if (!process.env.SESSION_SECRET) {
  throw new Error("SESSION_SECRET is not defined");
}

export let sessionStorage = createCookieSessionStorage({
  cookie: {
    name: "_session",
    sameSite: "lax",
    path: "/",
    httpOnly: true,
    secrets: [process.env.SESSION_SECRET],
    secure: process.env.NODE_ENV === "production",
  },
});

export function getSession(request: Request) {
  let cookie = request.headers.get("Cookie");
  return sessionStorage.getSession(cookie);
}

const USER_SESSION_KEY = "userId";

export async function getUserId(
  request: Request
): Promise<User["id"] | undefined> {
  let session = await getSession(request);
  let userId = session.get(USER_SESSION_KEY);
  return userId;
}

export async function getUser(request: Request) {
  let userId = await getUserId(request);
  if (userId === undefined) return null;
  let user = await getUserById(userId);
  if (user) return user;
  throw await logout(request);
}

export async function requireUserId(
  request: Request,
  redirectTo: string = new URL(request.url).pathname
) {
  let userId = await getUserId(request);
  if (!userId) {
    let searchParams = new URLSearchParams();
    searchParams.set("redirectTo", redirectTo);
    throw redirect(`/login?${searchParams.toString()}`);
  }
  return userId;
}

export async function requireUser(request: Request) {
  let user = await getUser(request);
  if (user) return user;
  throw await logout(request);
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
}) {
  let session = await getSession(request);
  session.set(USER_SESSION_KEY, userId);
  // if remember is true, keep them logged in for a week
  // otherwise keep them logged in for their browser session
  let maxAge = remember ? 60 * 60 * 24 * 7 : undefined;
  return redirect(redirectTo, {
    headers: {
      "Set-Cookie": await sessionStorage.commitSession(session, { maxAge }),
    },
  });
}

export async function logout(request: Request, redirectTo?: string) {
  redirectTo = redirectTo || new URL(request.url).pathname;
  let session = await getSession(request);
  return redirect(redirectTo, {
    headers: { "Set-Cookie": await sessionStorage.destroySession(session) },
  });
}
