"use client";

import { useLocale, useTranslations } from "next-intl";
import { Clock, Trophy } from "@phosphor-icons/react";
import { SiteBar } from "@/components/SiteBar";
import { Bezel, microLabel } from "@/components/ui";
import { formatUah } from "@/lib/format";
import { lotDescription, lotTitle } from "@/lib/lot-text";
import { cn } from "@/lib/utils";
import type { PublicBid, PublicLot } from "@/lib/types";
import { BidPanel } from "./BidPanel";
import { Gallery } from "./Gallery";
import { TimeLeft } from "./TimeLeft";
import { isOpen, useLiveLot, useServerNow } from "./live";

type Rules = { snipe_window_seconds: number; snipe_extend_seconds: number; max_bid_amount: number } | null;

export function LotView({ initialLot, initialBids, rules }: { initialLot: PublicLot; initialBids: PublicBid[]; rules: Rules }) {
  const t = useTranslations("lot");
  const tc = useTranslations("catalog");
  const locale = useLocale();
  const now = useServerNow();
  const { lot, bids, applyOwnBid } = useLiveLot(initialLot, initialBids);
  const open = isOpen(lot, now);
  const title = lotTitle(lot, locale);
  const description = lotDescription(lot, locale);
  const time = new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "uk-UA", { timeZone: "Europe/Kyiv", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" });

  return (
    <main className="grain relative min-h-[100dvh] overflow-x-clip bg-background">
      <div className="orb pointer-events-none absolute -left-40 top-40 h-[30rem] w-[30rem] rounded-full opacity-20" />
      <SiteBar back={{ href: "/lots", label: t("back") }} />

      <section className="relative mx-auto grid max-w-7xl gap-10 px-4 pb-12 pt-8 md:px-8 lg:grid-cols-12 lg:pt-12">
        <div className="lg:col-span-7">
          <Gallery images={lot.images} title={title} />
        </div>

        <div className="lg:col-span-5 lg:sticky lg:top-8 lg:self-start">
          <p className={cn("inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium", open ? "bg-accent text-accent-foreground" : "bg-primary text-primary-foreground")}>
            {open && <span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60" /><span className="relative h-2 w-2 rounded-full bg-primary" /></span>}
            {open ? `${t("open")} · ${t("live")}` : t("ended")}
          </p>
          <h1 className="mt-4 text-4xl font-bold tracking-tight text-primary md:text-5xl">{title}</h1>
          {description && <p className="mt-4 max-w-[52ch] whitespace-pre-line leading-relaxed text-muted-foreground">{description}</p>}

          <Bezel className="mt-8" core="p-6 sm:p-7">
            {open ? (
              <>
                <div className="flex flex-wrap items-end justify-between gap-4">
                  <div>
                    <p className={microLabel}>{lot.current_amount != null ? t("current") : t("start")}</p>
                    <p key={lot.current_amount} className="mt-1 text-5xl font-bold tracking-tight tabular-nums text-primary motion-safe:animate-[pulse_0.6s_ease-out_1]">{formatUah(lot.current_amount ?? lot.start_price)}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{t("bids", { n: lot.bid_count })} · {t("step")} {formatUah(lot.bid_step)}</p>
                  </div>
                  <div className="sm:text-right">                    <p className={microLabel}>{t("endsIn")}</p>
                    <p className="mt-1 inline-flex items-center gap-1.5 text-2xl font-bold text-primary"><Clock size={22} /> <TimeLeft endsAt={lot.ends_at} urgentClassName="text-destructive" /></p>
                  </div>
                </div>
                <div className="mt-6 border-t border-primary/10 pt-6">
                  <BidPanel lot={lot} maxBid={rules?.max_bid_amount ?? null} onPlaced={applyOwnBid} />
                </div>
                {rules && rules.snipe_window_seconds > 0 && (
                  <p className="mt-4 text-xs text-muted-foreground">{t("snipeNote", { window: Math.round(rules.snipe_window_seconds / 60), extend: Math.round(rules.snipe_extend_seconds / 60) })}</p>
                )}
              </>
            ) : (
              <div>
                <p className={microLabel}>{t("finalPrice")}</p>
                <p className="mt-1 text-5xl font-bold tracking-tight tabular-nums text-primary">{lot.current_amount != null ? formatUah(lot.current_amount) : "—"}</p>
                <p className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-primary">
                  <Trophy size={18} weight="fill" className="text-accent-foreground" />
                  {bids.length ? `${t("winner")}: ${bids[0]!.public_name ?? t("anonymous")}` : t("noWinner")}
                </p>
              </div>
            )}
          </Bezel>
        </div>
      </section>

      <section className="relative mx-auto max-w-7xl px-4 pb-24 md:px-8">
        <h2 className="text-3xl font-bold tracking-tight text-primary md:text-4xl">{t("history")}</h2>
        <Bezel className="mt-6 max-w-3xl" core="overflow-hidden">
          {bids.length ? (
            <ol className="divide-y divide-primary/[0.07]">
              {bids.map((b, k) => (
                <li key={b.id} className={cn("flex items-center justify-between gap-4 px-6 py-4", k === 0 && "bg-accent-soft")}>
                  <span className="min-w-0">
                    <span className="flex items-center gap-2 truncate font-medium text-primary">{k === 0 && <Trophy weight="fill" className="shrink-0" />}{b.public_name ?? t("anonymous")}</span>
                    <span className="block text-xs tabular-nums text-muted-foreground">{time.format(new Date(b.created_at))}</span>
                  </span>
                  <span className="shrink-0 text-lg font-bold tabular-nums text-primary">{formatUah(b.amount)}</span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="px-6 py-10 text-center text-muted-foreground">{open ? t("noBids") : tc("empty")}</p>
          )}
        </Bezel>
      </section>
    </main>
  );
}
