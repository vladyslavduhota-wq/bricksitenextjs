"use client";

import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { ArrowUpRight, Clock, ImageSquare } from "@phosphor-icons/react";
import { Link } from "@/i18n/navigation";
import { Bezel } from "@/components/ui";
import { photoUrl } from "@/lib/supabase/env";
import { formatUah } from "@/lib/format";
import { lotTitle } from "@/lib/lot-text";
import type { PublicLot } from "@/lib/types";
import { TimeLeft } from "./TimeLeft";

/** The site's "price tag" card, now with the real photo, live price and countdown. */
export function LotCard({ lot, priority = false }: { lot: PublicLot; priority?: boolean }) {
  const t = useTranslations("lot");
  const locale = useLocale();
  const title = lotTitle(lot, locale);
  const cover = lot.images[0];
  return (
    <Link href={`/lots/${lot.slug}`} className="group block outline-none transition-transform duration-700 ease-spring hover:-translate-y-2 focus-visible:-translate-y-2" aria-label={`${title}. ${t("view")}`}>
      <Bezel dark core="relative overflow-hidden bg-navy-deep transition-shadow group-focus-visible:ring-[3px] group-focus-visible:ring-accent">
        <div className="absolute left-1/2 top-4 z-10 h-4 w-4 -translate-x-1/2 rounded-full bg-primary ring-4 ring-primary-foreground/10" />
        <div className="dot-grid-light relative m-3 mt-12 aspect-[4/5] overflow-hidden rounded-[1.6rem] bg-primary/40">
          {cover ? (
            <Image src={photoUrl(cover.path)} alt={title} fill priority={priority} sizes="(min-width: 1024px) 26rem, (min-width: 640px) 45vw, 92vw" className="object-cover transition-transform duration-1000 ease-spring group-hover:scale-105" />
          ) : (
            <span className="absolute inset-0 grid place-items-center text-primary-foreground/50"><ImageSquare size={40} weight="light" /></span>
          )}
          <span className="absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-background/90 px-3 py-1.5 text-xs font-medium text-primary shadow-soft backdrop-blur">
            <Clock weight="bold" size={14} />
            <TimeLeft endsAt={lot.ends_at} closed={lot.status === "closed"} urgentClassName="text-destructive" />
          </span>
        </div>
        <div className="px-6 pb-6 text-primary-foreground">
          <h3 className="line-clamp-2 min-h-[3.5rem] text-xl font-bold leading-tight">{title}</h3>
          <div className="mt-5 flex items-end justify-between gap-3">
            <div className="min-w-0">
              <span className="text-[10px] uppercase tracking-[0.2em] text-primary-foreground/45">{lot.current_amount != null ? t("current") : t("start")}</span>
              <p className="text-2xl font-bold tabular-nums text-accent">{formatUah(lot.current_amount ?? lot.start_price)}</p>
              <p className="text-xs text-primary-foreground/55">{t("bids", { n: lot.bid_count })}</p>
            </div>
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-accent text-accent-foreground transition-transform duration-500 ease-spring group-hover:rotate-45">
              <ArrowUpRight weight="bold" />
            </span>
          </div>
        </div>
      </Bezel>
    </Link>
  );
}
