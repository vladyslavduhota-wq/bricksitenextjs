"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { CaretDown } from "@phosphor-icons/react";
import { SiteBar } from "@/components/SiteBar";
import { microLabel } from "@/components/ui";
import { cn } from "@/lib/utils";
import type { PublicLot } from "@/lib/types";
import { LotCard } from "./LotCard";
import { useLiveLots } from "./live";

type Filter = "all" | "withBids" | "noBids";
type Sort = "ending" | "priceAsc" | "priceDesc";
const price = (l: PublicLot) => l.current_amount ?? l.start_price;

/** Spec 5.2: grid with a filter (all / with bids / without) and sorting (price, time left). */
export function Catalogue({ initial }: { initial: PublicLot[] }) {
  const t = useTranslations("catalog");
  const tl = useTranslations("lot");
  const lots = useLiveLots(initial);
  const [filter, setFilter] = useState<Filter>("all");
  const [sort, setSort] = useState<Sort>("ending");

  const shown = useMemo(() => {
    const list = lots.filter((l) => (filter === "withBids" ? l.bid_count > 0 : filter === "noBids" ? l.bid_count === 0 : true));
    const open = (l: PublicLot) => (l.status === "active" ? 0 : 1);
    return [...list].sort((a, b) =>
      sort === "ending" ? open(a) - open(b) || a.ends_at.localeCompare(b.ends_at) : sort === "priceAsc" ? price(a) - price(b) : price(b) - price(a),
    );
  }, [lots, filter, sort]);

  return (
    <main className="grain relative min-h-[100dvh] overflow-x-clip bg-background">
      <div className="orb pointer-events-none absolute -right-40 -top-40 h-[30rem] w-[30rem] rounded-full opacity-25" />
      <SiteBar />
      <section className="relative mx-auto max-w-7xl px-4 pb-24 pt-12 md:px-8 md:pt-16">
        <p className="inline-flex items-center gap-2 text-xs font-medium text-primary">
          <span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-75" /><span className="relative h-2 w-2 rounded-full bg-accent ring-1 ring-primary/20" /></span>
          {t("eyebrow")} · {tl("live")}
        </p>
        <h1 className="mt-4 text-5xl font-bold tracking-tight text-primary md:text-7xl">{t("title")}</h1>
        <p className="mt-4 max-w-[52ch] text-muted-foreground">{t("intro")}</p>

        <div className="mt-10 flex flex-wrap items-center justify-between gap-3">
          <div role="tablist" aria-label={t("title")} className="flex flex-wrap gap-1.5">
            {(["all", "withBids", "noBids"] as const).map((f) => (
              <button
                key={f}
                role="tab"
                aria-selected={filter === f}
                onClick={() => setFilter(f)}
                className={cn("h-10 rounded-full px-4 text-sm font-medium transition", filter === f ? "bg-primary text-primary-foreground" : "text-primary ring-1 ring-primary/15 hover:bg-primary/5")}
              >
                {t(`filters.${f}`)}
              </button>
            ))}
          </div>
          <label className="relative flex items-center gap-2">
            <span className={microLabel}>{t("sort.label")}</span>
            <select value={sort} onChange={(e) => setSort(e.target.value as Sort)} className="h-10 appearance-none rounded-full bg-card py-0 pl-4 pr-10 text-sm font-medium text-primary ring-1 ring-primary/15 outline-none focus:ring-2 focus:ring-accent">
              {(["ending", "priceAsc", "priceDesc"] as const).map((s) => <option key={s} value={s}>{t(`sort.${s}`)}</option>)}
            </select>
            <CaretDown size={14} className="pointer-events-none absolute right-4 text-primary" />
          </label>
        </div>

        {shown.length ? (
          <div className="mt-8 grid gap-8 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6">
            {shown.map((lot, k) => <LotCard key={lot.id} lot={lot} priority={k < 3} />)}
          </div>
        ) : (
          <p className="mt-16 text-center text-muted-foreground">{lots.length ? t("emptyFilter") : t("empty")}</p>
        )}
      </section>
    </main>
  );
}
