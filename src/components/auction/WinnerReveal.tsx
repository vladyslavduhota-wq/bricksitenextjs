"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { motion, useReducedMotion } from "motion/react";
import { Trophy, X } from "@phosphor-icons/react";
import { formatUah } from "@/lib/format";
import { lotTitle } from "@/lib/lot-text";
import { cn } from "@/lib/utils";
import type { LiveState } from "@/lib/types";

/**
 * The moment a lot closes: the winner's full name in big letters, centre screen.
 * On the stream it stays until the next lot; on the site viewers can close it to see the history.
 */
export function WinnerReveal({ lot, winner, screen = false }: { lot: NonNullable<LiveState["lot"]>; winner: LiveState["winner"]; screen?: boolean }) {
  const t = useTranslations("live");
  const locale = useLocale();
  const reduce = useReducedMotion();
  const [closed, setClosed] = useState(false);
  if (closed) return null;

  return (
    <motion.div
      key={lot.id}
      role="dialog"
      aria-modal="true"
      aria-labelledby="winner-name"
      initial={reduce ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      className={cn("fixed inset-0 z-50 grid place-items-center p-6", screen ? "bg-navy-deep" : "bg-primary/85 backdrop-blur-md")}
    >
      <div className="dot-grid-light pointer-events-none absolute inset-0 opacity-60" />
      <div className="orb pointer-events-none absolute left-1/2 top-1/2 h-[60vmin] w-[60vmin] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-30" />
      {!screen && (
        <button onClick={() => setClosed(true)} aria-label={t("closeOverlay")} className="absolute right-5 top-5 grid h-11 w-11 place-items-center rounded-full bg-primary-foreground/10 text-primary-foreground">
          <X weight="light" size={22} />
        </button>
      )}
      <motion.div
        initial={reduce ? false : { scale: 0.85, y: 30, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 120, damping: 14, delay: 0.1 }}
        className="relative max-w-[92vw] text-center text-primary-foreground"
      >
        <span className="mx-auto grid h-[clamp(3.5rem,8vmin,6rem)] w-[clamp(3.5rem,8vmin,6rem)] place-items-center rounded-full bg-accent text-accent-foreground">
          <Trophy weight="fill" className="h-1/2 w-1/2" />
        </span>
        <p className="mt-6 text-[clamp(0.9rem,2vmin,1.5rem)] font-medium uppercase tracking-[0.3em] text-accent">{winner ? t("winner") : t("noWinner")}</p>
        {winner && (
          <>
            <h2 id="winner-name" className="mt-3 text-balance text-[clamp(2.75rem,9vmin,8rem)] font-bold leading-[0.95] tracking-tight">{winner.name}</h2>
            <p className="mt-6 text-[clamp(1.5rem,4.5vmin,3.5rem)] font-bold tabular-nums text-accent">{t("soldFor", { amount: formatUah(winner.amount) })}</p>
          </>
        )}
        <p className="mt-4 text-[clamp(1rem,2.4vmin,1.75rem)] text-primary-foreground/70">{lotTitle(lot, locale)}</p>
      </motion.div>
    </motion.div>
  );
}
