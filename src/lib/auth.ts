import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "./supabase/server";
import { supabaseConfigured } from "./supabase/env";
import type { Profile } from "./types";

export type Viewer = { id: string; email: string | null; profile: Profile | null };

/** The signed-in user and their profile, or null. Cached per request. */
export const getViewer = cache(async (): Promise<Viewer | null> => {
  if (!supabaseConfigured) return null;
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const id = data?.claims.sub;
  if (!id) return null;
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", id).maybeSingle<Profile>();
  return { id, email: (data.claims.email as string | undefined) ?? null, profile };
});

export const isStaff = (p: Profile | null | undefined) => p?.role === "admin" || p?.role === "moderator";

/** For admin pages: anyone else goes to login (signed out) or the admin home, which explains. */
export async function requireStaff() {
  const viewer = await getViewer();
  if (!viewer) redirect("/login?next=/admin");
  if (!isStaff(viewer.profile)) redirect("/admin");
  return viewer as Viewer & { profile: Profile };
}

export async function requireAdmin() {
  const viewer = await requireStaff();
  if (viewer.profile.role !== "admin") redirect("/admin");
  return viewer;
}

/** Only same-site paths, so a crafted ?next= cannot send people to another site. */
export function safeNext(next: string | null | undefined, fallback = "/") {
  return next && next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/\\") ? next : fallback;
}

/** "/en" for English paths, "" for Ukrainian ones. */
export const localePrefixOf = (path: string) => (path === "/en" || path.startsWith("/en/") ? "/en" : "");
