"use client";

import Image from "next/image";
import { useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { useLocale, useTranslations } from "next-intl";
import { ArrowUpRight, ImageSquare } from "@phosphor-icons/react";
import { Link } from "@/i18n/navigation";
import { Bezel } from "@/components/ui";
import { photoUrl } from "@/lib/supabase/env";
import { formatUah } from "@/lib/format";
import { lotTitle } from "@/lib/lot-text";
import type { PublicLot } from "@/lib/types";
import { cn } from "@/lib/utils";
import { OnAirDot } from "./LiveView";

/**
 * The site's "price tag" card for the lot on air: real photo, live price, links to the live page.
 * `dense` shrinks it on phones only, so the catalogue fits two to a row there.
 */
export function LotCard({ lot, priority = false, dense = false }: { lot: PublicLot; priority?: boolean; dense?: boolean }) {
  const d = (classes: string) => (dense ? classes : "");
  const t = useTranslations("lot");
  const tl = useTranslations("live");
  const locale = useLocale();
  const title = lotTitle(lot, locale);
  const cover = lot.images[0];
  return (
    <Link href="/live" className="group block outline-none transition-transform duration-700 ease-spring hover:-translate-y-2 focus-visible:-translate-y-2" aria-label={`${title}. ${t("view")}`}>
      <Bezel dark className={d("max-sm:rounded-[1.4rem] max-sm:p-1")} core={cn("relative overflow-hidden bg-navy-deep transition-shadow group-focus-visible:ring-[3px] group-focus-visible:ring-accent", d("max-sm:rounded-[calc(1.4rem-0.25rem)]"))}>
        <div className={cn("absolute left-1/2 top-4 z-10 h-4 w-4 -translate-x-1/2 rounded-full bg-primary ring-4 ring-primary-foreground/10", d("max-sm:top-2.5 max-sm:h-3 max-sm:w-3 max-sm:ring-2"))} />
        <div className={cn("dot-grid-light relative m-3 mt-12 aspect-[4/5] overflow-hidden rounded-[1.6rem] bg-primary/40", d("max-sm:m-2 max-sm:mt-8 max-sm:aspect-square max-sm:rounded-[1rem]"))}>
          {cover ? (
            <Image src={photoUrl(cover.path)} alt={title} fill priority={priority} sizes={dense ? "(min-width: 1024px) 26rem, 45vw" : "(min-width: 1024px) 26rem, (min-width: 640px) 45vw, 92vw"} className="object-cover transition-transform duration-1000 ease-spring group-hover:scale-105" />
          ) : (
            <span className="absolute inset-0 grid place-items-center text-primary-foreground/50"><ImageSquare size={dense ? 32 : 40} weight="light" /></span>
          )}
          <span className={cn("absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium shadow-soft backdrop-blur", lot.status === "active" ? "bg-accent text-accent-foreground" : "bg-background/90 text-primary", d("max-sm:right-2 max-sm:top-2 max-sm:gap-1 max-sm:px-2 max-sm:py-1 max-sm:text-[11px]"))}>
            {lot.status === "active" ? <><OnAirDot className="text-primary" /> {tl("onAir")}</> : t("ended")}
          </span>
        </div>
        <div className={cn("px-6 pb-6 text-primary-foreground", d("max-sm:px-3 max-sm:pb-3"))}>
          <h3 className={cn("line-clamp-2 min-h-[3.5rem] text-xl font-bold leading-tight", d("max-sm:line-clamp-3 max-sm:min-h-[3.5rem] max-sm:text-[15px]"))}>{title}</h3>
          <div className={cn("mt-5 flex items-end justify-between gap-3", d("max-sm:mt-2 max-sm:gap-1"))}>
            <div className="min-w-0">
              <span className={cn("text-[11px] uppercase tracking-[0.16em] text-primary-foreground/50", d("max-sm:hidden"))}>{lot.current_amount != null ? t("current") : t("start")}</span>
              <LivePrice amount={lot.current_amount ?? lot.start_price} className={d("max-sm:text-lg")} />
              <p className={cn("text-xs text-primary-foreground/55", d("max-sm:text-[11px]"))}>{t("bids", { n: lot.bid_count })}</p>
            </div>
            <span className={cn("grid h-12 w-12 shrink-0 place-items-center rounded-full bg-accent text-accent-foreground transition-transform duration-500 ease-spring group-hover:rotate-45", d("max-sm:h-8 max-sm:w-8"))}>
              <ArrowUpRight weight="bold" />
            </span>
          </div>
        </div>
      </Bezel>
    </Link>
  );
}

/** The price, rolling in from above when a new bid changes it (never on first paint). */
function LivePrice({ amount, className = "" }: { amount: number; className?: string }) {
  const reduce = useReducedMotion();
  const [first] = useState(amount);
  const changed = amount !== first;
  return (
    <p className={cn("overflow-hidden text-2xl font-bold tabular-nums text-accent", className)}>
      <motion.span
        key={amount}
        className="inline-block"
        initial={changed && !reduce ? { y: "-100%", opacity: 0 } : false}
        animate={{ y: "0%", opacity: 1 }}
        transition={{ duration: 0.5, ease: [0.32, 0.72, 0, 1] }}
      >
        {formatUah(amount)}
      </motion.span>
    </p>
  );
}
