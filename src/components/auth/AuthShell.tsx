import type { ReactNode } from "react";
import { getTranslations } from "next-intl/server";
import { ArrowLeft } from "@phosphor-icons/react/dist/ssr";
import { Link } from "@/i18n/navigation";
import { BrandLogo } from "@/components/BrandLogo";
import { Bezel } from "@/components/ui";

/** Frame for login, onboarding and account: the site's header, a big headline and one bezel card. */
export async function AuthShell({ title, lead, children }: { title: ReactNode; lead?: ReactNode; children: ReactNode }) {
  const t = await getTranslations("auth");
  return (
    <main className="grain dot-grid relative min-h-[100dvh] overflow-x-clip bg-background">
      <div className="orb pointer-events-none absolute -right-40 -top-40 h-[28rem] w-[28rem] rounded-full opacity-30" />
      <header className="relative mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 pt-6 md:px-8">
        <Link href="/" aria-label={t("home")}><BrandLogo /></Link>
        <Link href="/" className="inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-full bg-card px-4 py-2 text-sm font-medium text-primary shadow-soft ring-1 ring-primary/10 transition hover:-translate-x-1">
          <ArrowLeft weight="light" /> {t("home")}
        </Link>
      </header>
      <section className="relative mx-auto max-w-lg px-4 pb-20 pt-12 md:pt-20">
        <h1 className="text-4xl font-bold tracking-tight text-primary sm:text-5xl">{title}</h1>
        {lead && <p className="mt-4 text-muted-foreground">{lead}</p>}
        <Bezel className="mt-8" core="p-6 sm:p-8">{children}</Bezel>
      </section>
    </main>
  );
}
