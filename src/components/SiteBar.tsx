"use client";

import { useLocale, useTranslations } from "next-intl";
import { ArrowLeft, UserCircle } from "@phosphor-icons/react";
import { Link, usePathname } from "@/i18n/navigation";
import { BrandLogo } from "@/components/BrandLogo";

export function LocaleSwitch() {
  const t = useTranslations("common");
  const locale = useLocale();
  const pathname = usePathname();
  return (
    <Link href={pathname} locale={locale === "uk" ? "en" : "uk"} aria-label={t("otherLocaleLabel")} className="grid h-10 min-w-10 place-items-center rounded-full bg-primary/5 px-3 text-xs font-bold tracking-[0.12em] text-primary transition-colors hover:bg-primary/10">
      {t("otherLocale")}
    </Link>
  );
}

export function AccountLink() {
  const t = useTranslations("common");
  return (
    <Link href="/account" aria-label={t("account")} title={t("account")} className="grid h-10 w-10 place-items-center rounded-full bg-primary/5 text-primary transition-colors hover:bg-primary/10">
      <UserCircle size={22} weight="light" />
    </Link>
  );
}

/** Header for inner public pages: logo, an optional back link, language and account. */
export function SiteBar({ back }: { back?: { href: string; label: string } }) {
  return (
    <header className="relative z-20 mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 pt-6 md:px-8">
      <div className="flex min-w-0 items-center gap-3">
        <Link href="/" className="shrink-0"><BrandLogo /></Link>
        {back && (
          <Link href={back.href} className="hidden items-center gap-2 whitespace-nowrap rounded-full bg-card px-4 py-2 text-sm font-medium text-primary shadow-soft ring-1 ring-primary/10 transition hover:-translate-x-1 sm:inline-flex">
            <ArrowLeft weight="light" /> {back.label}
          </Link>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <LocaleSwitch />
        <AccountLink />
      </div>
    </header>
  );
}
