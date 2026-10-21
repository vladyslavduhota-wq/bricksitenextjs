"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getViewer, safeNext } from "@/lib/auth";

export type ProfileField = "fullName" | "phone" | "displayName" | "adult" | "rules" | "generic";
export type ProfileState = { errors?: Partial<Record<ProfileField, true>>; saved?: number };

// Mirrors the CHECK constraints on public.profiles.
const PHONE = /^\+?[0-9 ()-]{7,20}$/;

function readProfile(form: FormData) {
  const full_name = String(form.get("full_name") ?? "").trim().replace(/\s+/g, " ");
  const phone = String(form.get("phone") ?? "").trim();
  const display_name = String(form.get("display_name") ?? "").trim() || null;
  const errors: ProfileState["errors"] = {};
  if (full_name.length < 2 || full_name.length > 100) errors.fullName = true;
  if (!PHONE.test(phone)) errors.phone = true;
  if (display_name && (display_name.length < 2 || display_name.length > 40)) errors.displayName = true;
  return {
    values: { full_name, phone, display_name, show_anonymously: form.get("show_anonymously") === "on", photo_consent: form.get("photo_consent") === "on" },
    errors,
  };
}

export async function createProfile(next: string, locale: string, _: ProfileState, form: FormData): Promise<ProfileState> {
  const viewer = await getViewer();
  if (!viewer) redirect("/login");
  const { values, errors } = readProfile(form);
  if (form.get("adult") !== "on") errors.adult = true;
  if (form.get("rules") !== "on") errors.rules = true;
  if (Object.keys(errors).length) return { errors };

  const supabase = await createClient();
  const { error } = await supabase.from("profiles").insert({
    id: viewer.id,
    ...values,
    locale: locale === "en" ? "en" : "uk",
    accepted_rules_at: new Date().toISOString(),
  });
  // 23505: the profile already exists (form sent twice), which is fine.
  if (error && error.code !== "23505") return { errors: { generic: true } };
  redirect(safeNext(next));
}

export async function updateProfile(_: ProfileState, form: FormData): Promise<ProfileState> {
  const viewer = await getViewer();
  if (!viewer?.profile) redirect("/login");
  const { values, errors } = readProfile(form);
  if (Object.keys(errors).length) return { errors };

  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update(values).eq("id", viewer.id);
  if (error) return { errors: { generic: true } };
  revalidatePath("/[locale]/account", "page");
  return { saved: Date.now() };
}
