import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AuthShell } from "@/components/auth/AuthShell";
import { LoginForm } from "@/components/auth/LoginForm";
import { getViewer, safeNext } from "@/lib/auth";

// Depends on the session cookie: never prerender.
export const dynamic = "force-dynamic";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<{ next?: string; error?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const t = await getTranslations({ locale: (await params).locale, namespace: "auth" });
  return { title: t("metaTitle"), robots: { index: false } };
}

export default async function LoginPage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const query = await searchParams;
  const prefix = locale === "uk" ? "" : `/${locale}`;
  const next = safeNext(query.next, prefix || "/");

  const viewer = await getViewer();
  if (viewer) redirect(viewer.profile ? next : `${prefix}/welcome?next=${encodeURIComponent(next)}`);

  const t = await getTranslations("auth");
  return (
    <AuthShell title={t("title")} lead={t("lead")}>
      <LoginForm next={next} initialError={query.error === "link" ? "link" : undefined} />
    </AuthShell>
  );
}
