"use client";

import { useLocale, useTranslations } from "next-intl";
import { motion, useReducedMotion } from "motion/react";
import { ArrowLeft, Trophy, Heart, Camera, PlayCircle, Broadcast } from "@phosphor-icons/react";
import { Link } from "@/i18n/navigation";
import { FloatingObjects } from "@/components/objects";
import { BrandLogo } from "@/components/BrandLogo";
import { isAuctionClosed } from "@/lib/auction";
import { useLiveLots } from "@/components/auction/live";
import { formatUah } from "@/lib/format";
import { lotTitle } from "@/lib/lot-text";
import type { AuctionStats, PublicLot } from "@/lib/types";

const EASE = [0.32, 0.72, 0, 1] as const;

export function FinalPage({ lots: initialLots, stats, leaders }: { lots: PublicLot[]; stats: AuctionStats | null; leaders: Record<string, string | null> }) {
  const tl = useTranslations("lot");
  const locale = useLocale();
  const lots = useLiveLots(initialLots);
  const sum = (ls: PublicLot[]) => ls.reduce((n, l) => n + (l.current_amount ?? 0), 0);
  const raised = (stats?.total_raised ?? 0) - sum(initialLots) + sum(lots);
  const t = useTranslations("finalPage");
  const reduce = useReducedMotion();
  const closed = isAuctionClosed();
  const up = (d = 0) => ({
    initial: reduce ? false : { opacity: 0, y: 40, filter: "blur(8px)" },
    whileInView: { opacity: 1, y: 0, filter: "blur(0px)" },
    viewport: { once: true, amount: 0.1 },
    transition: { duration: 0.9, ease: EASE, delay: d },
  });
  return (
    <main className="grain relative min-h-[100dvh] overflow-hidden bg-background">
      <FloatingObjects set="final" />
      <header className="relative z-10 mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 pt-6 md:px-8">
        <Link href="/"><BrandLogo /></Link>
        <Link href="/" className="inline-flex items-center gap-2 rounded-full bg-card px-4 py-2 text-sm font-medium text-primary shadow-soft ring-1 ring-primary/10 transition hover:-translate-x-1">
          <ArrowLeft weight="light" /> {t("home")}
        </Link>
      </header>

      <section className="relative z-10 mx-auto max-w-7xl px-4 pb-10 pt-12 md:px-8">
        <motion.p {...up()} className="inline-flex items-center gap-2 rounded-full bg-accent px-4 py-1.5 text-xs font-medium uppercase tracking-[0.25em] text-accent-foreground">
          {closed ? t("closed") : t("opensOn")}
        </motion.p>
        <motion.h1 {...up(0.1)} className="mt-6 text-6xl font-bold leading-[0.92] tracking-tight text-primary md:text-8xl">
          {t("title")} <span className="text-outline">14.11</span>
        </motion.h1>
        <motion.div {...up(0.2)} className="mt-10 overflow-hidden rounded-[2.25rem] bg-primary p-8 text-primary-foreground shadow-soft md:p-12">
          <p className="text-sm uppercase tracking-[0.3em] text-primary-foreground/60">{t("totalLabel")}</p>
          <p className="mt-3 text-5xl font-bold text-accent md:text-7xl">{formatUah(raised)}</p>
          <p className="mt-4 max-w-[52ch] text-primary-foreground/65">{t("totalText")}</p>
        </motion.div>
      </section>

      <section className="relative z-10 mx-auto max-w-7xl px-4 py-10 md:px-8">
        <motion.h2 {...up()} className="flex items-center gap-3 text-3xl font-bold text-primary md:text-5xl"><Trophy weight="light" /> {t("winners")}</motion.h2>
        <div className="mt-8 grid gap-4">
          {lots.map((lot, k) => (
            <motion.div key={lot.id} {...up(k * 0.08)} className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4 rounded-[1.75rem] bg-card p-5 shadow-soft ring-1 ring-primary/10 md:p-6">
              <span className="text-outline text-5xl font-bold leading-none">{k + 1}</span>
              <div className="min-w-0">
                <Link href={`/lots/${lot.slug}`} className="font-bold text-primary hover:underline">{lotTitle(lot, locale)}</Link>
                <p className="text-sm text-muted-foreground">
                  {lot.status !== "closed"
                    ? tl("bids", { n: lot.bid_count })
                    : lot.leading_bid_id
                      ? `${tl("winner")}: ${leaders[lot.leading_bid_id] ?? tl("anonymous")}`
                      : tl("noWinner")}
                </p>
              </div>
              <span className="whitespace-nowrap rounded-full bg-accent/40 px-4 py-2 text-sm font-medium tabular-nums text-primary">{formatUah(lot.current_amount ?? lot.start_price)}</span>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="relative z-10 mx-auto grid max-w-7xl gap-6 px-4 py-10 md:grid-cols-2 md:px-8">
        <motion.div {...up()} className="rounded-[2rem] bg-card p-8 shadow-soft ring-1 ring-primary/10">
          <Heart weight="light" size={32} className="text-primary" />
          <h3 className="mt-4 text-3xl font-bold text-primary">{t("thanksTitle")}</h3>
          <p className="mt-3 text-muted-foreground">{t("thanksText")}</p>
        </motion.div>
        <motion.div {...up(0.1)} className="rounded-[2rem] bg-navy-deep p-8 text-primary-foreground shadow-soft">
          <Broadcast weight="light" size={32} className="text-accent" />
          <h3 className="mt-4 text-3xl font-bold">{t("streamTitle")}</h3>
          <p className="mt-3 text-primary-foreground/65">{t("streamText")}</p>
        </motion.div>
      </section>

      <section className="relative z-10 mx-auto max-w-7xl px-4 pb-20 pt-10 md:px-8">
        <motion.h2 {...up()} className="text-3xl font-bold text-primary md:text-5xl">{t("jarTitle")}</motion.h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[Camera, PlayCircle, Camera].map((Icon, k) => (
            <motion.div key={k} {...up(k * 0.08)} className="dot-grid-light grid aspect-[4/3] place-items-center rounded-[1.75rem] bg-primary text-primary-foreground/70 shadow-soft">
              <span className="flex flex-col items-center gap-2 text-sm"><Icon weight="light" size={36} className="text-accent" />{k === 1 ? t("videoPending") : t("photoPending")}</span>
            </motion.div>
          ))}
        </div>
      </section>
    </main>
  );
}
