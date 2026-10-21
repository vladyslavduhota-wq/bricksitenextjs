"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { motion, AnimatePresence } from "motion/react";
import { Trophy, X, ArrowUpRight } from "@phosphor-icons/react";
import { Link } from "@/i18n/navigation";
import { isAuctionClosed } from "@/lib/auction";

/** Window shown on the home page once bidding has closed (preview with ?closed=1). */
export function ClosedWindow() {
  const t = useTranslations();
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const force = new URLSearchParams(window.location.search).has("closed");
    const check = () => {
      if ((force || isAuctionClosed()) && !sessionStorage.getItem("kse-closed-seen")) setOpen(true);
    };
    const t = setTimeout(check, (window as unknown as { __ksePreDone?: boolean }).__ksePreDone ? 300 : 4500);
    const iv = setInterval(check, 30000);
    return () => { clearTimeout(t); clearInterval(iv); };
  }, []);
  const close = () => { sessionStorage.setItem("kse-closed-seen", "1"); setOpen(false); };
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-[60] grid place-items-center bg-primary/60 p-4 backdrop-blur-md" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={close}>
          <motion.div
            role="dialog" aria-modal="true" aria-labelledby="closed-title"
            initial={{ y: 60, rotate: -4, opacity: 0 }} animate={{ y: 0, rotate: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }}
            transition={{ type: "spring", stiffness: 90, damping: 14 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-md overflow-hidden rounded-[2rem] bg-primary p-8 text-primary-foreground shadow-soft"
          >
            <div className="dot-grid-light absolute inset-0 opacity-60" />
            <button onClick={close} aria-label={t("common.close")} className="absolute right-4 top-4 grid h-10 w-10 place-items-center rounded-full bg-primary-foreground/10"><X weight="light" /></button>
            <div className="relative">
              <span className="grid h-14 w-14 place-items-center rounded-full bg-accent text-accent-foreground"><Trophy weight="light" size={28} /></span>
              <p className="mt-6 text-xs font-medium uppercase tracking-[0.3em] text-accent">{t("closed.date")}</p>
              <h2 id="closed-title" className="mt-2 text-4xl font-bold leading-tight">{t("closed.title")}</h2>
              <p className="mt-4 text-primary-foreground/70">{t("closed.text")}</p>
              <Link href="/final" onClick={close} className="mt-8 inline-flex items-center gap-2 rounded-full bg-accent px-6 py-3 font-medium text-accent-foreground transition active:scale-[0.98]">
                {t("closed.results")} <ArrowUpRight weight="light" />
              </Link>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
