"use client";

import { useLocale, useTranslations } from "next-intl";
import { BrandLogo } from "@/components/BrandLogo";
import { formatUah } from "@/lib/format";
import { lotTitle } from "@/lib/lot-text";
import type { LiveState } from "@/lib/types";
import { BidRows, OnAirDot, timeFormat } from "./LiveView";
import { LotPhotos } from "./LotPhotos";
import { WinnerReveal } from "./WinnerReveal";
import { useLiveShow } from "./live";

const VISIBLE_BIDS = 6;

/**
 * For the YouTube stream and the screen in the room: no bid form, no navigation, sized in
 * viewport units so it reads the same at any capture size. Follows the presenter live.
 */
export function ScreenView({ initial, site }: { initial: LiveState; site: string }) {
  const t = useTranslations("live");
  const tl = useTranslations("lot");
  const locale = useLocale();
  const { lot, bids, winner, total, phase } = useLiveShow(initial);

  return (
    <main className="dot-grid-light relative flex h-[100dvh] flex-col overflow-hidden bg-navy-deep text-primary-foreground">
      <header className="flex items-center justify-between gap-6 px-[3vw] pt-[2.5vh]">
        <div className="flex items-center gap-[1.5vw]">
          <BrandLogo light />
          <span className="inline-flex items-center gap-2 rounded-full bg-accent px-4 py-1.5 text-[clamp(0.75rem,1.4vmin,1.1rem)] font-bold uppercase tracking-[0.2em] text-accent-foreground">
            <OnAirDot className="text-primary" /> {t("onAir")}
          </span>
        </div>
        <div className="text-right">
          <p className="text-[clamp(0.7rem,1.2vmin,1rem)] uppercase tracking-[0.25em] text-primary-foreground/60">{t("raised")}</p>
          <p className="text-[clamp(1.5rem,3.6vmin,3rem)] font-bold tabular-nums text-accent">{formatUah(total)}</p>
        </div>
      </header>

      {!lot ? (
        <section className="flex flex-1 flex-col items-center justify-center px-[6vw] text-center">
          <h1 className="text-[clamp(2.5rem,8vmin,7rem)] font-bold leading-none tracking-tight">{t("waitingTitle")}</h1>
          {site && <p className="mt-[3vh] text-[clamp(1rem,2.6vmin,2rem)] text-primary-foreground/70">{t("bidAt", { site })}</p>}
        </section>
      ) : (
        <section className="grid min-h-0 flex-1 grid-cols-[minmax(0,5fr)_minmax(0,6fr)] gap-[3vw] px-[3vw] py-[3vh]">
          <LotPhotos images={lot.images} title={lotTitle(lot, locale)} autoplay className="h-full" />

          <div className="flex min-h-0 flex-col">
            <h1 className="line-clamp-2 text-[clamp(2rem,5.2vmin,4.5rem)] font-bold leading-[1.02] tracking-tight">{lotTitle(lot, locale)}</h1>
            <p className="mt-[3vh] text-[clamp(0.8rem,1.5vmin,1.2rem)] uppercase tracking-[0.25em] text-primary-foreground/60">
              {lot.current_amount != null ? tl("current") : tl("start")}
            </p>
            <p key={lot.current_amount} className="text-[clamp(3rem,11vmin,9rem)] font-bold leading-none tracking-tight tabular-nums text-accent">{formatUah(lot.current_amount ?? lot.start_price)}</p>
            <p className="mt-[1.5vh] text-[clamp(1rem,2.2vmin,1.75rem)] text-primary-foreground/70">{tl("bids", { n: lot.bid_count })} · {tl("step")} {formatUah(lot.bid_step)}</p>

            <div className="mt-[3vh] min-h-0 flex-1 overflow-hidden rounded-[1.75rem] bg-primary-foreground/5 ring-1 ring-primary-foreground/10">
              {bids.length ? (
                <BidRows bids={bids.slice(0, VISIBLE_BIDS)} time={timeFormat(locale)} anonymous={t("bidder")} size="lg" />
              ) : (
                <p className="grid h-full place-items-center px-8 text-center text-[clamp(1rem,2.4vmin,1.75rem)] text-primary-foreground/60">{tl("noBids")}</p>
              )}
            </div>
            {site && <p className="mt-[2vh] text-[clamp(0.9rem,1.8vmin,1.4rem)] font-medium text-primary-foreground/70">{t("bidAt", { site })}</p>}
          </div>
        </section>
      )}

      {lot && phase === "winner" && <WinnerReveal key={lot.id} lot={lot} winner={winner} screen />}
    </main>
  );
}
