import type { Metadata } from "next";
import NextLink from "next/link";
import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ShieldCheck, SignOut } from "@phosphor-icons/react/dist/ssr";
import { AuthShell } from "@/components/auth/AuthShell";
import { ProfileForm } from "@/components/auth/ProfileForm";
import { Notice, buttonClass } from "@/components/ui";
import { updateProfile } from "@/lib/actions/profile";
import { getViewer, isStaff } from "@/lib/auth";

// Depends on the session cookie: never prerender.
export const dynamic = "force-dynamic";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const t = await getTranslations({ locale: (await params).locale, namespace: "account" });
  return { title: t("metaTitle"), robots: { index: false } };
}

export default async function AccountPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const prefix = locale === "uk" ? "" : `/${locale}`;

  const viewer = await getViewer();
  if (!viewer) redirect(`${prefix}/login?next=${encodeURIComponent(`${prefix}/account`)}`);
  if (!viewer.profile) redirect(`${prefix}/welcome?next=${encodeURIComponent(`${prefix}/account`)}`);

  const t = await getTranslations("account");
  return (
    <AuthShell title={t("title")} lead={viewer.email ? t("signedInAs", { email: viewer.email }) : undefined}>
      {viewer.profile.is_blocked && <div className="mb-6"><Notice tone="error">{t("blocked")}</Notice></div>}
      <ProfileForm mode="edit" action={updateProfile} profile={viewer.profile} />
      <div className="mt-8 flex flex-wrap gap-3 border-t border-primary/10 pt-6">
        {isStaff(viewer.profile) && (
          <NextLink href="/admin" className={buttonClass("accent")}><ShieldCheck weight="light" size={18} /> {t("admin")}</NextLink>
        )}
        <form action="/auth/signout" method="post">
          <input type="hidden" name="next" value={prefix || "/"} />
          <button className={buttonClass("ghost")}><SignOut weight="light" size={18} /> {t("signOut")}</button>
        </form>
      </div>
    </AuthShell>
  );
}
