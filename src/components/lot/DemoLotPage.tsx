"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { motion, useReducedMotion } from "motion/react";
import { ArrowLeft, ArrowRight, Eye, Gavel } from "@phosphor-icons/react";
import { Link } from "@/i18n/navigation";
import { FloatingObjects } from "@/components/objects";

const EASE = [0.32, 0.72, 0, 1] as const;

/** Placeholder lot page until the real catalogue arrives from the Rector's Office. */
export function DemoLotPage({ id }: { id: string }) {
  const t = useTranslations("lotPage");
  const reduce = useReducedMotion();
  const n = Number(id);
  const prev = String(n === 1 ? 3 : n - 1);
  const next = String(n === 3 ? 1 : n + 1);
  const rows = (["start", "step", "final", "format"] as const).map((k) => [t(`rows.${k}.label`), t(`rows.${k}.value`)] as const);
  return (
    <main className="grain relative min-h-[100dvh] overflow-hidden bg-background">
      <FloatingObjects set="about" />
      <header className="relative z-10 mx-auto grid max-w-7xl grid-cols-[auto_minmax(0,1fr)] items-center gap-3 px-4 pt-6 md:px-8">
        <Link href="/#lots" className="inline-flex items-center gap-2 rounded-full bg-card px-4 py-2 text-sm font-medium text-primary shadow-soft ring-1 ring-primary/10 transition hover:-translate-x-1">
          <ArrowLeft weight="light" /> {t("back")}
        </Link>
        <span className="min-w-0 text-right text-xs sm:text-sm text-muted-foreground">{t("slotOf", { id })}</span>
      </header>
      <section className="relative z-10 mx-auto grid max-w-7xl gap-10 px-4 py-12 md:grid-cols-12 md:px-8">
        <motion.div
          key={id}
          initial={reduce ? false : { opacity: 0, rotate: -8, y: 60 }}
          animate={{ opacity: 1, rotate: -2, y: 0 }}
          transition={{ type: "spring", stiffness: 70, damping: 14 }}
          className="md:col-span-6"
        >
          <div className="relative grid aspect-[4/5] place-items-center overflow-hidden rounded-[2.25rem] bg-navy-deep dot-grid-light shadow-soft">
            <div className="orb absolute h-72 w-72 rounded-full opacity-30" />
            <span className="text-outline-light text-[14rem] font-bold leading-none">{id}</span>
            <span className="absolute bottom-6 left-4 right-4 justify-center text-center inline-flex items-center gap-2 rounded-full bg-primary-foreground/10 px-4 py-2 text-sm text-primary-foreground/80">
              <Eye weight="light" /> {t("photoPending")}
            </span>
            <motion.div animate={reduce ? {} : { rotate: [-10, 10, -10] }} transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }} className="absolute right-6 top-6 w-28">
              <Image src="/images/gavel-3d.png" alt="" width={1024} height={1024} sizes="112px" />
            </motion.div>
          </div>
        </motion.div>
        <div className="md:col-span-6 md:pt-8">
          <motion.h1 initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, ease: EASE }} className="text-4xl sm:text-5xl font-bold text-primary md:text-6xl">
            {t("title")}
          </motion.h1>
          <p className="mt-6 max-w-[48ch] text-lg text-muted-foreground">
            {t("text")}
          </p>
          <dl className="mt-10 divide-y divide-primary/10 rounded-[2rem] bg-card px-6 shadow-soft ring-1 ring-primary/10">
            {rows.map(([a, b], k) => (
              <motion.div key={a} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 + k * 0.08, duration: 0.7, ease: EASE }} className="flex flex-wrap justify-between gap-2 py-5">
                <dt className="font-medium text-primary">{a}</dt>
                <dd className="text-muted-foreground">{b}</dd>
              </motion.div>
            ))}
          </dl>
          <div className="mt-8 rounded-[2rem] bg-accent-soft p-6 ring-1 ring-primary/10">
            <p className="flex items-center gap-2 font-bold text-primary"><Gavel weight="light" /> {t("notOpenTitle")}</p>
            <p className="mt-2 text-sm text-muted-foreground">{t("notOpenText")}</p>
          </div>
          <nav className="mt-8 flex gap-3">
            <Link href={`/lots/${prev}`} className="inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-medium text-primary ring-1 ring-primary/15 transition hover:bg-primary/5"><ArrowLeft weight="light" /> {t("slot", { id: prev })}</Link>
            <Link href={`/lots/${next}`} className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-medium text-primary-foreground transition hover:translate-x-1">{t("slot", { id: next })} <ArrowRight weight="light" /></Link>
          </nav>
        </div>
      </section>
    </main>
  );
}
