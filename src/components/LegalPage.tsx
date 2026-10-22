import { getTranslations } from "next-intl/server";
import { ArrowLeft } from "@phosphor-icons/react/dist/ssr";
import { Link } from "@/i18n/navigation";
import { BrandLogo } from "@/components/BrandLogo";
import { Bezel, microLabel } from "@/components/ui";

/** Rules and privacy: numbered sections in one bezel card, readable line length. */
export async function LegalPage({ kind }: { kind: "rules" | "privacy" }) {
  const t = await getTranslations("legal");
  const home = await getTranslations("auth");
  const sections = t.raw(`${kind}.sections`) as { h: string; p: string }[];
  return (
    <main className="grain relative min-h-[100dvh] bg-background">
      <header className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 pt-6 md:px-8">
        <Link href="/"><BrandLogo /></Link>
        <Link href="/" className="inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-full bg-card px-4 py-2 text-sm font-medium text-primary shadow-soft ring-1 ring-primary/10 transition hover:-translate-x-1">
          <ArrowLeft weight="light" /> {home("home")}
        </Link>
      </header>
      <article className="mx-auto max-w-3xl px-4 pb-24 pt-12 md:px-8 md:pt-20">
        <p className={microLabel}>{t("updated")}</p>
        <h1 className="mt-3 text-4xl font-bold tracking-tight text-primary md:text-6xl">{t(`${kind}.title`)}</h1>
        <p className="mt-6 inline-flex rounded-full bg-accent px-4 py-1.5 text-xs font-medium text-accent-foreground">{t("draft")}</p>
        <Bezel className="mt-10" core="divide-y divide-primary/10 px-6 sm:px-10">
          {sections.map((s, k) => (
            <section key={s.h} className="grid gap-2 py-7 sm:grid-cols-[3rem_minmax(0,1fr)]">
              <span className="text-outline text-3xl font-bold leading-none">{String(k + 1).padStart(2, "0")}</span>
              <div>
                <h2 className="text-xl font-bold tracking-tight text-primary">{s.h}</h2>
                <p className="mt-2 max-w-[62ch] leading-relaxed text-muted-foreground">{s.p}</p>
              </div>
            </section>
          ))}
        </Bezel>
      </article>
    </main>
  );
}
