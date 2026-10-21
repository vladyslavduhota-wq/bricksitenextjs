import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AuthShell } from "@/components/auth/AuthShell";
import { ProfileForm } from "@/components/auth/ProfileForm";
import { createProfile } from "@/lib/actions/profile";
import { getViewer, safeNext } from "@/lib/auth";

// Depends on the session cookie: never prerender.
export const dynamic = "force-dynamic";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<{ next?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const t = await getTranslations({ locale: (await params).locale, namespace: "profile" });
  return { title: t("metaTitle"), robots: { index: false } };
}

/** Onboarding: right after the first sign-in, before anything else. */
export default async function WelcomePage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const prefix = locale === "uk" ? "" : `/${locale}`;
  const next = safeNext((await searchParams).next, prefix || "/");

  const viewer = await getViewer();
  if (!viewer) redirect(`${prefix}/login?next=${encodeURIComponent(next)}`);
  if (viewer.profile) redirect(next);

  const t = await getTranslations("profile");
  return (
    <AuthShell title={t("welcomeTitle")} lead={t("welcomeLead")}>
      <ProfileForm mode="create" action={createProfile.bind(null, next, locale)} />
    </AuthShell>
  );
}
