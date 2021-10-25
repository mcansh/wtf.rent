import { Authenticator, LocalStrategy } from "remix-auth";
import { createCookieSessionStorage } from "remix";
import type { User } from "@prisma/client";
import { compare } from "./bcrypt.server";

import prisma from "./db.server";

let sessionStorage = createCookieSessionStorage({
  cookie: {
    name: "_session",
    sameSite: "lax",
    path: "/",
    httpOnly: true,
    secrets: ["s3cr3t"],
    secure: process.env.NODE_ENV === "production",
  },
});

let authenticator = new Authenticator<User>(sessionStorage);

authenticator.use(
  new LocalStrategy({ loginURL: "/login" }, async (username, password) => {
    let user = await prisma.user.findUnique({
      where: { username: username },
    });

    console.log({ user });

    if (!user) {
      throw new Error("Invalid username or password");
    }

    let valid = await compare(password, user.password);

    console.log({ valid });

    if (!valid) {
      throw new Error("Invalid username or password");
    }

    return user;
  }),
  "local"
);

export { sessionStorage, authenticator };
