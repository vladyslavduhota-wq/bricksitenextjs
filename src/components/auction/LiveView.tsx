"use client";

import { useLocale, useTranslations } from "next-intl";
import { Trophy } from "@phosphor-icons/react";
import { SiteBar } from "@/components/SiteBar";
import { Bezel, microLabel } from "@/components/ui";
import { formatUah } from "@/lib/format";
import { lotDescription, lotTitle } from "@/lib/lot-text";
import { cn } from "@/lib/utils";
import type { LiveState, PublicBid } from "@/lib/types";
import { BidPanel } from "./BidPanel";
import { LotPhotos } from "./LotPhotos";
import { WinnerReveal } from "./WinnerReveal";
import { useLiveShow } from "./live";

export function OnAirDot({ className }: { className?: string }) {
  return (
    <span className={cn("relative flex h-2 w-2", className)}>
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-current opacity-60" />
      <span className="relative h-2 w-2 rounded-full bg-current" />
    </span>
  );
}

export function BidRows({ bids, time, anonymous, size = "md" }: { bids: PublicBid[]; time: Intl.DateTimeFormat; anonymous: string; size?: "md" | "lg" }) {
  return (
    <ol className="divide-y divide-current/10">
      {bids.map((b, k) => (
        <li key={b.id} className={cn("flex items-center justify-between gap-4", size === "lg" ? "px-8 py-4" : "px-5 py-3", k === 0 && "bg-accent-soft text-primary")}>
          <span className="min-w-0">
            <span className={cn("flex items-center gap-2 truncate font-medium", size === "lg" && "text-[clamp(1.1rem,2.2vmin,1.75rem)]")}>
              {k === 0 && <Trophy weight="fill" className="shrink-0" />}
              {b.public_name ?? anonymous}
            </span>
            <span className={cn("block tabular-nums opacity-60", size === "lg" ? "text-[clamp(0.8rem,1.4vmin,1.1rem)]" : "text-xs")}>{time.format(new Date(b.created_at))}</span>
          </span>
          <span className={cn("shrink-0 font-bold tabular-nums", size === "lg" ? "text-[clamp(1.25rem,2.6vmin,2rem)]" : "text-lg")}>{formatUah(b.amount)}</span>
        </li>
      ))}
    </ol>
  );
}

export const timeFormat = (locale: string) =>
  new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "uk-UA", { timeZone: "Europe/Kyiv", hour: "2-digit", minute: "2-digit", second: "2-digit" });

/** The page viewers bid on: only the lot on air, one screen on a laptop, following the presenter live. */
export function LiveView({ initial, maxBid }: { initial: LiveState; maxBid: number | null }) {
  const t = useTranslations("live");
  const tl = useTranslations("lot");
  const locale = useLocale();
  const { lot, bids, winner, total, phase, applyOwnBid } = useLiveShow(initial);

  return (
    <main className="grain relative flex min-h-[100dvh] flex-col overflow-x-clip bg-background lg:h-[100dvh] lg:overflow-hidden">
      <div className="orb pointer-events-none absolute -left-40 top-40 h-[30rem] w-[30rem] rounded-full opacity-20" />
      <SiteBar />

      {!lot ? (
        <section className="relative mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center px-4 py-16 text-center">
          <p className="inline-flex items-center gap-2 rounded-full bg-primary/5 px-4 py-1.5 text-xs font-medium text-primary ring-1 ring-primary/10"><OnAirDot className="text-primary" /> {t("onAir")}</p>
          <h1 className="mt-6 text-5xl font-bold tracking-tight text-primary md:text-7xl">{t("waitingTitle")}</h1>
          <p className="mt-5 max-w-[46ch] text-muted-foreground">{t("waitingText")}</p>
          <p className={cn(microLabel, "mt-12")}>{t("raised")}</p>
          <p className="mt-1 text-4xl font-bold tabular-nums text-primary">{formatUah(total)}</p>
        </section>
      ) : (
        <section className="relative mx-auto grid w-full max-w-7xl flex-1 gap-6 px-4 py-4 md:px-8 lg:min-h-0 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:gap-10 lg:py-6">
          <div className="h-[44vh] lg:h-full lg:min-h-0">
            <LotPhotos images={lot.images} title={lotTitle(lot, locale)} />
          </div>

          <div className="flex flex-col gap-4 lg:min-h-0">
            <div>
              <p className={cn("inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium", phase === "live" ? "bg-accent text-accent-foreground" : "bg-primary text-primary-foreground")}>
                {phase === "live" && <OnAirDot className="text-primary" />}
                {phase === "live" ? t("onAir") : tl("ended")}
              </p>
              <h1 className="mt-3 line-clamp-2 text-3xl font-bold tracking-tight text-primary md:text-4xl">{lotTitle(lot, locale)}</h1>
              {lotDescription(lot, locale) && <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-muted-foreground">{lotDescription(lot, locale)}</p>}
            </div>

            <Bezel core="p-5">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className={microLabel}>{phase === "winner" ? tl("finalPrice") : lot.current_amount != null ? tl("current") : tl("start")}</p>
                  <p key={lot.current_amount} className="text-4xl font-bold tracking-tight tabular-nums text-primary">{formatUah(lot.current_amount ?? lot.start_price)}</p>
                </div>
                <p className="text-sm text-muted-foreground">{tl("bids", { n: lot.bid_count })} · {tl("step")} {formatUah(lot.bid_step)}</p>
              </div>
              <div className="mt-4 border-t border-primary/10 pt-4">
                {phase === "winner" ? (
                  <p className="inline-flex items-center gap-2 text-sm font-medium text-primary">
                    <Trophy size={18} weight="fill" />
                    {winner ? `${tl("winner")}: ${winner.name}` : tl("noWinner")}
                  </p>
                ) : (
                  <BidPanel lot={lot} open={phase === "live"} maxBid={maxBid} onPlaced={applyOwnBid} />
                )}
              </div>
            </Bezel>

            <div className="flex flex-col lg:min-h-0 lg:flex-1">
              <h2 className={cn(microLabel, "mb-2")}>{tl("history")}</h2>
              <Bezel className="lg:min-h-0 lg:flex-1" core="overflow-hidden lg:overflow-y-auto">
                {bids.length ? <BidRows bids={bids} time={timeFormat(locale)} anonymous={t("bidder")} /> : <p className="px-5 py-8 text-center text-sm text-muted-foreground">{tl("noBids")}</p>}
              </Bezel>
            </div>
          </div>
        </section>
      )}

      {lot && phase === "winner" && <WinnerReveal key={lot.id} lot={lot} winner={winner} />}
    </main>
  );
}
