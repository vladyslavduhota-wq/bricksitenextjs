"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { motion, useInView, useReducedMotion } from "motion/react";
import { EASE, OutlineFill, RollDigits, SplitWords, VIEW } from "@/components/fx";
import { FloatingObjects } from "@/components/objects";
import { Bezel } from "@/components/ui";
import { AUCTION_AT } from "@/lib/auction";

function useCountdown() {
  const [left, setLeft] = useState<{ d: number; h: number; m: number; s: number } | null>(null);
  useEffect(() => {
    const calc = () => {
      const ms = Math.max(0, AUCTION_AT.getTime() - Date.now());
      setLeft({ d: Math.floor(ms / 864e5), h: Math.floor(ms / 36e5) % 24, m: Math.floor(ms / 6e4) % 60, s: Math.floor(ms / 1e3) % 60 });
    };
    calc();
    const t = setInterval(calc, 1000);
    return () => clearInterval(t);
  }, []);
  return left;
}

export function Countdown() {
  const t = useTranslations("countdown");
  const reduce = useReducedMotion();
  const left = useCountdown();
  const units = ["d", "h", "m", "s"] as const;
  return (
    <section id="countdown" className="relative overflow-hidden bg-primary py-12 text-primary-foreground md:py-24">
      <div className="dot-grid-light absolute inset-0" />
      <FloatingObjects set="countdown" />
      <div className="relative mx-auto grid max-w-7xl items-center gap-10 px-4 md:gap-16 md:grid-cols-12 md:px-8">
        <motion.div
          className="md:col-span-7"
          initial={reduce ? false : { opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={VIEW}
          transition={{ duration: 0.8, ease: EASE }}
        >
          <h2 className="text-4xl font-bold leading-[0.95] tracking-tight md:text-7xl">
            <span className="block"><SplitWords text={t("title")} /></span>
            <OutlineFill text={t("date")} light />
          </h2>
          <p className="mt-4 max-w-[44ch] text-primary-foreground/65">
            {t("text")}
          </p>
          <div className="mt-8 grid max-w-xl grid-cols-4 gap-3">
            {units.map((k) => (
              <div key={k} className="rounded-3xl bg-primary-foreground/5 p-2 sm:p-4 text-center ring-1 ring-primary-foreground/10">
                <div className="text-2xl font-bold tabular-nums lg:text-5xl">{left ? <RollDigits value={String(left[k]).padStart(2, "0")} /> : "--"}</div>
                <div className="mt-1 text-[11px] text-primary-foreground/60 sm:uppercase sm:tracking-[0.2em]">{t(`units.${k}`)}</div>
              </div>
            ))}
          </div>
          <p className="mt-4 text-xs text-primary-foreground/40">{t("timeNote")}</p>
        </motion.div>
        <motion.div
          className="md:col-span-5"
          initial={reduce ? false : { opacity: 0, y: -90, rotate: -8 }}
          whileInView={{ opacity: 1, y: 0, rotate: 0 }}
          viewport={VIEW}
          transition={{ type: "spring", stiffness: 110, damping: 20, mass: 1, delay: 0.15 }}
        >
          {/* tear-off calendar: counts down from the visitor's today to the auction when it comes into view */}
          <div className="relative mx-auto w-full max-w-[12rem] sm:max-w-xs">
            <div className="absolute inset-0 translate-x-4 translate-y-4 rotate-6 rounded-[2rem] bg-accent/30" />
            <div className="absolute inset-0 translate-x-2 translate-y-2 rotate-3 rounded-[2rem] bg-primary-foreground/20" />
            <Bezel className="relative -rotate-3 transition-transform duration-700 ease-spring hover:rotate-0">
              <div className="overflow-hidden rounded-[calc(2.25rem-0.375rem)]">
                <div className="flex justify-center gap-10 bg-accent py-4">
                  <span className="h-4 w-4 rounded-full bg-primary" />
                  <span className="h-4 w-4 rounded-full bg-primary" />
                </div>
                <TearOffCalendar fallback={{ month: t("calendarMonth"), weekday: t("calendarDay") }} />
              </div>
            </Bezel>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function CalendarPage({ month, day, weekday }: { month: string; day: string; weekday: string }) {
  return (
    <div className="bg-card py-6 text-center sm:py-10 text-primary">
      <p className="text-sm font-bold uppercase tracking-[0.2em]">{month}</p>
      <div className="text-[6rem] font-bold leading-none tracking-tighter sm:text-[9rem] tabular-nums">{day}</div>
      <p className="text-sm text-muted-foreground">{weekday}</p>
    </div>
  );
}

const AUCTION_DAY = new Date(AUCTION_AT.getFullYear(), AUCTION_AT.getMonth(), AUCTION_AT.getDate());

/** Calendar days from the visitor's today to the auction, thinned evenly to at most `max` pages. */
function daysToAuction(today: Date, max = 24): Date[] {
  const day = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const all: Date[] = [];
  for (const d = day; d < AUCTION_DAY; d.setDate(d.getDate() + 1)) all.push(new Date(d));
  all.push(AUCTION_DAY);
  if (all.length <= max) return all;
  return Array.from({ length: max }, (_, k) => all[Math.round((k * (all.length - 1)) / (max - 1))]!);
}

/**
 * The calendar opens on the visitor's today and, once it is on screen, tears off one page per day
 * until the auction, fast at first and slowing into the last day. Only two pages are ever mounted:
 * the current one and the one falling off it. The server renders the auction's day, so hydration never reads the clock.
 */
function TearOffCalendar({ fallback }: { fallback: { month: string; weekday: string } }) {
  const locale = useLocale();
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.6 });
  const [days, setDays] = useState<Date[] | null>(null);
  const [at, setAt] = useState(0);

  useEffect(() => {
    // The visitor's own date is only known in the browser.
    if (!reduce) setDays(daysToAuction(new Date())); // eslint-disable-line react-hooks/set-state-in-effect
  }, [reduce]);

  useEffect(() => {
    if (!inView || !days || days.length < 2) return;
    let k = 0;
    let timer: ReturnType<typeof setTimeout>;
    const n = days.length - 1;
    const next = () => {
      k += 1;
      setAt(k);
      // Quick flicks that slow down, so the last few days land one by one.
      if (k < n) timer = setTimeout(next, 55 + 340 * Math.pow(k / n, 3));
    };
    timer = setTimeout(next, 450);
    return () => clearTimeout(timer);
  }, [inView, days]);

  const fmt = (o: Intl.DateTimeFormatOptions) => (d: Date) => new Intl.DateTimeFormat(locale, o).format(d);
  const pageOf = (date: Date | undefined) =>
    date
      ? { month: `${fmt({ month: "long" })(date)} ${date.getFullYear()}`, day: String(date.getDate()), weekday: fmt({ weekday: "long" })(date) }
      : { month: fallback.month, day: String(AUCTION_DAY.getDate()), weekday: fallback.weekday };
  const landed = days != null && at === days.length - 1 && at > 0;

  return (
    <div ref={ref} className="relative" aria-live="off">
      {/* The last day settles with a small knock when it is reached. */}
      <motion.div key={landed ? "landed" : "counting"} initial={landed ? { scale: 1.08 } : false} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 260, damping: 14 }}>
        <CalendarPage {...pageOf(days?.[at])} />
      </motion.div>
      {at > 0 && days && (
        // Re-keyed on every step, so the single falling page restarts with the day just torn off.
        <motion.div
          key={at}
          className="absolute inset-0"
          initial={{ y: "0%", rotate: 0, opacity: 1 }}
          animate={{ y: "115%", rotate: at % 2 ? -14 : 16, opacity: 0 }}
          transition={{ duration: 0.42, ease: [0.55, 0, 0.75, 0.2] }}
          style={{ transformOrigin: at % 2 ? "100% 0%" : "0% 0%" }}
        >
          <CalendarPage {...pageOf(days[at - 1])} />
        </motion.div>
      )}
    </div>
  );
}
