"use client";
import { useNonce } from "@mcansh/http-helmet/react";
import { clsx } from "clsx";
import { Links, Meta } from "react-router";
import type { User } from "~/.server/generated/prisma/client";
import { useMatches } from "~/utils/use-matches";
import { Nav } from "./nav";

interface DocumentProps {
  title?: string;
  children: React.ReactNode;
  user?: Pick<User, "email" | "username" | "id"> | null;
}

export function Document({ children, title, user }: DocumentProps) {
  let matches = useMatches();
  let bodyClassName = matches
    .filter((match) => match.handle && match.handle.bodyClassName)
    .map((match) => match.handle.bodyClassName);

  let nonce = useNonce();

  return (
    <html lang="en" className="h-full">
      <head>
        <meta charSet="utf-8" />
        <link rel="icon" href="/favicon.png" type="image/png" />
        {title ? <title>{title}</title> : null}
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links nonce={nonce} />
      </head>
      <body className={clsx("flex h-full flex-col", bodyClassName)}>
        <Nav user={user} />
        <div className="flex-auto">{children}</div>
      </body>
    </html>
  );
}
