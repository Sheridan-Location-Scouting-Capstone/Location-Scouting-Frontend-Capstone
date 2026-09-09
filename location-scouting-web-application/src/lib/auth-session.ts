// Single point of session extraction. No other file may call auth.api.getSession directly.
//
// requireUser() is for pages and layouts only — redirect() throws NEXT_REDIRECT,
// which is meaningless to a non-browser client. When mobile lands, add bearer-token
// support to getSession() (check the Authorization header, fall back to cookie) and
// give route handlers their own guard that returns 401 instead of redirecting.
import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";

export type SessionUser = NonNullable<Awaited<ReturnType<typeof getSession>>>["user"];

export const getSession = cache(async () => {
  return auth.api.getSession({
    headers: await headers(),
  });
});

export async function getCurrentUser() {
  return (await getSession())?.user ?? null;
}

export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/");
  }

  return user;
}
