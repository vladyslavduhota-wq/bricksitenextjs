"use client";

import Image from "next/image";
import { useEffect, useState, type ReactNode, type CSSProperties } from "react";
import { useTranslations } from "next-intl";
import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import {
  ArrowUpRight,
  Gavel,
  HandPointing,
  Trophy,
  Asterisk,
  Plus,
} from "@phosphor-icons/react";
import { Link } from "@/i18n/navigation";
import { FloatingObjects } from "@/components/objects";
import { Preloader } from "@/components/Preloader";
import { BrandLogo } from "@/components/BrandLogo";
import { ClosedWindow } from "@/components/ClosedWindow";
import { Bezel } from "@/components/ui";
import { AccountLink, LocaleSwitch } from "@/components/SiteBar";
import { LotCard } from "@/components/auction/LotCard";
import { useLiveLots } from "@/components/auction/live";
import { formatUah } from "@/lib/format";
import type { AuctionStats, PublicLot } from "@/lib/types";
import { cn } from "@/lib/utils";
import { SplitWords, Highlight, OutlineFill, Magnetic, VelocityMarquee, RollDigits, EASE } from "@/components/fx";
import { CONTACT_EMAIL, FINAL_AT, RECTOR_PHOTO } from "@/lib/auction";

const GAVEL = "/images/gavel-3d.png";
// The prototype's playful tilt, kept for the real cards on wide screens.
const TILT = ["md:-rotate-[3deg] md:translate-y-8", "md:rotate-[2deg] md:-translate-y-3", "md:-rotate-[1deg] md:translate-y-12"];
const i = (n: number) => ({ ["--i" as string]: n }) as CSSProperties;
// Base styles the prototype took from the shadcn Button.
const BTN = "inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium transition-all outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 [&_svg]:pointer-events-none [&_svg]:shrink-0";

export function HomePage({ lots: initialLots, stats }: { lots: PublicLot[]; stats: AuctionStats | null }) {
  const [ready, setReady] = useState(false);
  const lots = useLiveLots(initialLots);
  // The total moves with every bid: start from the server's figure and add what changed since.
  const sum = (ls: PublicLot[]) => ls.reduce((n, l) => n + (l.current_amount ?? 0), 0);
  const raised = (stats?.total_raised ?? 0) - sum(initialLots) + sum(lots);
  useEffect(() => {
    const on = () => setReady(true);
    if ((window as unknown as { __ksePreDone?: boolean }).__ksePreDone) { document.documentElement.style.overflow = ""; on(); return; }
    document.addEventListener("kse:preloader-exit", on, { once: true });
    const fallback = setTimeout(on, 5000);
    return () => {
      document.removeEventListener("kse:preloader-exit", on);
      clearTimeout(fallback);
    };
  }, []);
  return (
    <div className={`grain overflow-x-clip ${ready ? "is-ready" : ""}`}>
      <Preloader />
      <Nav />
      <ClosedWindow />
      <main>
        <Hero raised={raised} />
        <Marquee />
        <About />
        <Lots lots={lots} />
        <Steps />
        <Report />
        <Final />
        <Faq />
      </main>
      <Footer />
    </div>
  );
}

/* ---------- shared ---------- */

function Reveal({ children, delay = 0, className = "" }: { children: ReactNode; delay?: number; className?: string }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0, margin: "0px" }}
      transition={{ duration: 0.95, delay, ease: [0.32, 0.72, 0, 1] }}
    >
      {children}
    </motion.div>
  );
}

function PillCta({ children, onClick, href, variant = "primary" }: { children: ReactNode; onClick?: () => void; href?: string; variant?: "primary" | "accent" }) {
  const cls =
    variant === "primary"
      ? "bg-primary text-primary-foreground"
      : "bg-accent text-accent-foreground";
  const inner = variant === "primary" ? "bg-primary-foreground/15" : "bg-primary/10";
  const body = (
    <>
      <span>{children}</span>
      <span className={`grid h-9 w-9 place-items-center rounded-full ${inner} transition-transform duration-500 ease-spring group-hover:-translate-y-[1px] group-hover:translate-x-1 group-hover:scale-105`}>
        <ArrowUpRight weight="light" size={18} />
      </span>
    </>
  );
  const c = `group inline-flex items-center gap-4 rounded-full py-2 pl-7 pr-2 font-medium shadow-soft transition-transform duration-500 ease-spring active:scale-[0.98] ${cls}`;
  // Site paths go through the locale-aware Link; anchors and mailto stay plain links.
  const link = href?.startsWith("/") ? <Link href={href} className={c}>{body}</Link> : <a href={href} className={c}>{body}</a>;
  return <Magnetic>{href ? link : <button onClick={onClick} className={cn(BTN, c, "h-auto")}>{body}</button>}</Magnetic>;
}

/* ---------- nav ---------- */

function Nav() {
  const t = useTranslations();
  const [open, setOpen] = useState(false);
  const links = (["about", "lots", "how", "report", "faq"] as const).map((k) => [`#${k}`, t(`nav.${k}`)] as const);
  return (
    <>
      <header className="fixed inset-x-0 top-5 z-40 flex justify-center px-4">
        <div className="grid w-full max-w-6xl grid-cols-[minmax(0,1fr)_auto] items-center justify-between gap-3 lg:flex lg:gap-6 rounded-full bg-background/70 py-2 pl-3 pr-2 shadow-soft ring-1 ring-primary/10 backdrop-blur-xl lg:w-max">
          <a href="#top" className="flex items-center">
            <BrandLogo />
          </a>
          <nav className="hidden items-center gap-1 whitespace-nowrap text-sm text-muted-foreground lg:flex">
            {links.map(([h, l]) => (
              <a key={h} href={h} className="rounded-full px-4 py-2 transition-colors duration-300 hover:bg-primary/5 hover:text-primary">
                {l}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <LocaleSwitch />
            <AccountLink />
            <Link href="/lots" className={cn(BTN, "hidden h-auto rounded-full bg-primary px-5 py-2.5 text-primary-foreground hover:bg-primary/90 active:scale-[0.98] sm:inline-flex")}>
              {t("common.placeBid")}
            </Link>
            <button aria-label={t("common.menu")} aria-expanded={open} aria-controls="mobile-menu" onClick={() => setOpen(!open)} className={cn(BTN, "relative h-10 w-10 shrink-0 rounded-full bg-primary/5 lg:hidden")}>
              <span className={`absolute left-3 right-3 h-[1.5px] bg-primary transition-transform duration-500 ease-spring ${open ? "top-1/2 rotate-45" : "top-[15px]"}`} />
              <span className={`absolute left-3 right-3 h-[1.5px] bg-primary transition-transform duration-500 ease-spring ${open ? "top-1/2 -rotate-45" : "top-[23px]"}`} />
            </button>
          </div>
        </div>
      </header>
      <div id="mobile-menu" inert={!open} className={`fixed inset-0 z-30 flex flex-col justify-center gap-2 bg-background/85 px-8 backdrop-blur-3xl transition-opacity duration-500 lg:hidden ${open ? "opacity-100" : "pointer-events-none opacity-0"}`}>
        {links.map(([h, l], k) => (
          <a
            key={h}
            href={h}
            onClick={() => setOpen(false)}
            style={{ transitionDelay: open ? `${100 + k * 60}ms` : "0ms" }}
            className={`text-3xl sm:text-5xl font-bold text-primary transition-all duration-700 ease-spring ${open ? "translate-y-0 opacity-100" : "translate-y-12 opacity-0"}`}
          >
            {l}
          </a>
        ))}
      </div>
    </>
  );
}

/* ---------- hero ---------- */

function RotatingBadge() {
  const t = useTranslations("hero");
  return (
    <div className="relative grid h-32 w-32 place-items-center rounded-full bg-accent text-accent-foreground shadow-soft md:h-36 md:w-36">
      <svg viewBox="0 0 100 100" className="animate-spin-slow absolute inset-0">
        <defs>
          <path id="circ" d="M50,50 m-38,0 a38,38 0 1,1 76,0 a38,38 0 1,1 -76,0" />
        </defs>
        <text className="fill-current text-[8.4px] font-bold tracking-[0.12em]">
          <textPath href="#circ">{t("badge")}</textPath>
        </text>
      </svg>
      <Gavel size={34} weight="light" />
    </div>
  );
}

function Hero({ raised }: { raised: number }) {
  const t = useTranslations("hero");
  const reduce = useReducedMotion();
  const { scrollY } = useScroll();
  const yImg = useTransform(scrollY, [0, 700], [0, 24]);
  const yGavel = useTransform(scrollY, [0, 700], [0, -35]);
  return (
    <section id="top" className="hero-section dot-grid relative">
      <div className="hero-layout relative mx-auto max-w-7xl px-4 md:px-8">
        <div className="hero-copy relative z-10 min-w-0">
          <div className="enter hero-eyebrow inline-flex items-center gap-2 text-xs font-medium text-primary" style={i(0)}>
            <span className="h-2 w-2 shrink-0 rounded-full bg-accent ring-1 ring-primary/20" />
            {t("eyebrow")}
          </div>
          <h1 className="hero-title font-bold text-primary">
            <span className="enter block" style={i(1)}>{t("line1")}</span>
            <span className="enter hero-outline block" style={i(2)}>{t("line2")}</span>
            <span className="enter block" style={i(3)}><span className="hero-highlight">{t("line3")}</span></span>
          </h1>
          <p className="enter hero-description text-muted-foreground" style={i(4)}>
            {t("description")}
          </p>
          <div className="enter hero-actions flex flex-wrap items-center gap-3" style={i(5)}>
            <PillCta href="#lots">{t("viewLots")}</PillCta>
            <a href="#how" className={cn(BTN, "h-auto rounded-full px-3 py-3 text-primary hover:bg-accent hover:text-accent-foreground")}>{t("howToBid")} <ArrowUpRight weight="light" /></a>
          </div>
          <div className="enter hero-details grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-t border-primary/15" style={i(6)}>
            <span className="min-w-0 text-xs text-muted-foreground">{t("catalogStatus")} <b className="ml-1 text-sm tabular-nums text-primary">{formatUah(raised)}</b></span>
            <span className="text-xs font-medium text-primary">{t("final")} <b className="ml-2">14.11.2026</b></span>
          </div>
        </div>
        <div className="hero-visual relative min-w-0">
          <motion.figure style={reduce ? {} : { y: yImg }} className="enter hero-portrait relative" >
            <Image src={RECTOR_PHOTO} alt={t("photoAlt")} fill priority sizes="(max-width: 639px) 390px, 40vw" className="object-cover" />
            <figcaption className="hero-caption absolute bg-primary text-primary-foreground">
              <b className="block">{t("name")}</b>
              <span className="text-xs text-primary-foreground/70">{t("role")}</span>
            </figcaption>
          </motion.figure>
          <div className="hero-badge absolute"><RotatingBadge /></div>
          <motion.div style={reduce ? {} : { y: yGavel }} className="hero-gavel pointer-events-none absolute">
            <Image src={GAVEL} alt="" width={1024} height={1024} sizes="140px" className="animate-floaty w-full" />
          </motion.div>
          <div className="enter hero-ticket absolute bg-accent text-accent-foreground" style={i(6)}>
            <span className="text-3xl font-bold leading-none">14</span>
            <span className="text-xs leading-snug"><b className="block">{t("ticketDate")}</b>{t("ticketLabel")}</span>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------- marquee ---------- */

function Marquee() {
  const t = useTranslations();
  const items = t.raw("marquee") as string[];
  const row = [...items, ...items];
  return (
    <div className="relative z-10 overflow-hidden bg-accent py-3 md:py-4 text-accent-foreground shadow-soft">
      <VelocityMarquee>
        {[0].map((r) => (
          <div key={r} className="flex shrink-0 items-center">
            {row.map((text, k) => (
              <span key={k} className="flex items-center gap-5 px-5 text-xl font-bold md:text-3xl whitespace-nowrap">
                {text}
                <Asterisk weight="bold" />
              </span>
            ))}
          </div>
        ))}
      </VelocityMarquee>
    </div>
  );
}

/* ---------- lots ---------- */

function Lots({ lots }: { lots: PublicLot[] }) {
  const t = useTranslations("lots");
  return (
    <section id="lots" className="relative overflow-hidden bg-primary pb-20 pt-24 text-primary-foreground">
      <div className="orb pointer-events-none absolute -right-40 top-20 h-[34rem] w-[34rem] rounded-full opacity-30" />
      <span aria-hidden className="text-outline-light pointer-events-none absolute -left-6 top-24 select-none text-[22vw] font-bold leading-none opacity-60">
        {t("watermark")}
      </span>
      <div className="relative mx-auto max-w-7xl px-4 md:px-8">
        <Reveal className="max-w-2xl md:ml-auto md:text-right">
          <h2 className="text-5xl font-bold tracking-tight md:text-7xl">
            <SplitWords text={t("title1")} /> <span className="text-accent"><SplitWords text={t("title2")} delay={0.14} /></span>{" "}
            <SplitWords text={t("title3")} delay={0.21} />
          </h2>
          <p className="mt-6 text-primary-foreground/65 md:ml-auto md:max-w-[44ch]">
            {t("intro")}
          </p>
        </Reveal>
        {lots.length ? (
          <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6">
            {lots.slice(0, 6).map((lot, k) => (
              <motion.div
                key={lot.id}
                initial={{ opacity: 0, x: (1 - (k % 3)) * 260, y: 120, rotate: ((k % 3) - 1) * -18, scale: 0.9 }}
                whileInView={{ opacity: 1, x: 0, y: 0, rotate: 0, scale: 1 }}
                viewport={{ once: true, amount: 0, margin: "0px" }}
                transition={{ type: "spring", stiffness: 70, damping: 16, mass: 1.1, delay: 0.15 + (k % 3) * 0.12 }}
                className={TILT[k % 3]}
              >
                <LotCard lot={lot} />
              </motion.div>
            ))}
          </div>
        ) : (
          <p className="mt-12 text-primary-foreground/65">{t("empty")}</p>
        )}
        <div className="mt-14 flex justify-center">
          <PillCta href="/lots" variant="accent">{t("all")}</PillCta>
        </div>
      </div>
    </section>
  );
}

/* ---------- steps: rising bid ladder ---------- */

function Steps() {
  const t = useTranslations("steps");
  const steps = [
    { key: "choose", icon: HandPointing, h: "lg:h-[22rem]" },
    { key: "bid", icon: Gavel, h: "lg:h-[26rem]" },
    { key: "result", icon: Trophy, h: "lg:h-[30rem]" },
  ] as const;
  return (
    <section id="how" className="relative overflow-hidden py-16 md:py-24">
      <FloatingObjects set="how" />
      <div className="mx-auto max-w-7xl px-4 md:px-8">
        <Reveal>
          <h2 className="text-5xl font-bold tracking-tight text-primary md:text-7xl">
            <span className="block"><SplitWords text={t("title1")} /></span>
            <OutlineFill text={t("title2")} />
          </h2>
          <p className="mt-6 max-w-[48ch] text-muted-foreground">{t("intro")}</p>
        </Reveal>
        <div className="mt-16 grid items-end gap-5 lg:grid-cols-3">
          {steps.map((s, k) => (
            <motion.div
              key={s.key}
              className="origin-bottom"
              initial={{ opacity: 0, scaleY: 0.4, y: 80 }}
              whileInView={{ opacity: 1, scaleY: 1, y: 0 }}
              viewport={{ once: true, amount: 0, margin: "0px" }}
              transition={{ duration: 1.1, delay: k * 0.18, ease: EASE }}
            >
              <Bezel core={`flex flex-col justify-between p-8 ${k === 2 ? "bg-primary text-primary-foreground" : k === 1 ? "bg-accent text-accent-foreground" : "bg-card"} ${s.h}`}>
                <div className="flex items-start justify-between">
                  <s.icon size={44} weight="light" />
                  <span className="text-7xl font-bold leading-none opacity-15">{k + 1}</span>
                </div>
                <div className="mt-16">
                  <h3 className="text-3xl font-bold tracking-tight">{t(`items.${s.key}.title`)}</h3>
                  <p className="mt-3 opacity-70">{t(`items.${s.key}.text`)}</p>
                  <span className="mt-6 inline-block rounded-full bg-current/10 px-4 py-1.5 text-xs font-medium ring-1 ring-current/20">{t(`items.${s.key}.status`)}</span>
                </div>
              </Bezel>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------- report: bento ---------- */

function Report() {
  const t = useTranslations("report");
  return (
    <section id="report" className="px-4 pb-16 md:px-8">
      <div className="mx-auto grid max-w-7xl gap-5 md:grid-cols-12 md:grid-rows-2">
        <Reveal className="md:col-span-7 md:row-span-2">
          <Bezel core="relative h-full overflow-hidden bg-accent-soft p-6 sm:p-10 lg:p-14">
            <div className="orb absolute -bottom-24 -right-24 h-80 w-80 rounded-full opacity-60" />
            <span aria-hidden className="text-outline pointer-events-none absolute -right-6 bottom-6 select-none text-[9rem] font-bold leading-none opacity-30 md:text-[12rem]">{t("watermark")}</span>
            <motion.img src={GAVEL} alt="" aria-hidden animate={{ rotate: [-14, 8, -14], y: [0, -10, 0] }} transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }} className="pointer-events-none absolute right-8 top-8 hidden w-28 md:block" />
            <span className="inline-flex rounded-full bg-primary/5 px-3 py-1 text-[10px] font-medium uppercase tracking-[0.2em] text-primary ring-1 ring-primary/10">{t("label")}</span>
            <h2 className="relative mt-8 text-4xl font-bold text-primary lg:text-6xl">
              <SplitWords text={t("title")} /> <Highlight delay={0.5}><span className="italic">{t("titleHighlight")}</span></Highlight>
            </h2>
            <p className="relative mt-6 max-w-[42ch] text-muted-foreground">
              {t("text")}
            </p>
            <p className="relative mt-16 text-sm font-medium text-primary">{t("credit")}</p>
          </Bezel>
        </Reveal>
        {[
          [t("cause"), "bg-primary text-primary-foreground"],
          [t("goal"), "bg-card"],
        ].map(([a, c], k) => (
          <Reveal key={a} delay={0.1 + k * 0.1} className="md:col-span-5">
            <Bezel core={`flex h-full min-h-44 items-end justify-between p-8 ${c}`}>
              <div>
                <p className="text-2xl font-bold tracking-tight">{a}</p>
                <p className="mt-1 text-sm opacity-60">{t("pending")}</p>
              </div>
              <span className="text-outline text-6xl font-bold leading-none opacity-40">?</span>
            </Bezel>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

/* ---------- final ---------- */

function useCountdown() {
  const [left, setLeft] = useState<{ d: number; h: number; m: number; s: number } | null>(null);
  useEffect(() => {
    const calc = () => {
      const ms = Math.max(0, FINAL_AT.getTime() - Date.now());
      setLeft({ d: Math.floor(ms / 864e5), h: Math.floor(ms / 36e5) % 24, m: Math.floor(ms / 6e4) % 60, s: Math.floor(ms / 1e3) % 60 });
    };
    calc();
    const t = setInterval(calc, 1000);
    return () => clearInterval(t);
  }, []);
  return left;
}

function Final() {
  const t = useTranslations("final");
  const left = useCountdown();
  const units = ["d", "h", "m", "s"] as const;
  return (
    <section className="relative overflow-hidden bg-primary py-16 text-primary-foreground md:py-24">
      <div className="dot-grid-light absolute inset-0" />
      <FloatingObjects set="final" />
      <div className="relative mx-auto grid max-w-7xl items-center gap-16 px-4 md:grid-cols-12 md:px-8">
        <Reveal className="md:col-span-7">
          <h2 className="text-6xl font-bold leading-[0.95] tracking-tight md:text-8xl">
            <span className="block"><SplitWords text={t("title")} /></span>
            <OutlineFill text="14.11" light />
          </h2>
          <p className="mt-8 max-w-[44ch] text-primary-foreground/65">
            {t("text")}
          </p>
          <Link href="/final" className="mt-6 inline-flex items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-accent-foreground transition active:scale-[0.98]">
            {t("pageLink")} <ArrowUpRight weight="light" />
          </Link>
          <div className="mt-12 grid max-w-xl grid-cols-4 gap-3">
            {units.map((k) => (
              <div key={k} className="rounded-3xl bg-primary-foreground/5 p-2 sm:p-4 text-center ring-1 ring-primary-foreground/10">
                <div className="text-2xl font-bold tabular-nums lg:text-5xl">{left ? <RollDigits value={String(left[k]).padStart(2, "0")} /> : "--"}</div>
                <div className="mt-1 text-[10px] uppercase tracking-[0.2em] text-primary-foreground/45">{t(`units.${k}`)}</div>
              </div>
            ))}
          </div>
          <p className="mt-4 text-xs text-primary-foreground/40">{t("timeNote")}</p>
        </Reveal>
        <motion.div
          className="md:col-span-5"
          initial={{ opacity: 0, y: -220, rotate: -25 }}
          whileInView={{ opacity: 1, y: 0, rotate: 0 }}
          viewport={{ once: true, amount: 0, margin: "0px" }}
          transition={{ type: "spring", stiffness: 90, damping: 11, mass: 1.2, delay: 0.2 }}
        >
          {/* tear-off calendar stack */}
          <div className="relative mx-auto w-full max-w-xs">
            <div className="absolute inset-0 translate-x-4 translate-y-4 rotate-6 rounded-[2rem] bg-accent/30" />
            <div className="absolute inset-0 translate-x-2 translate-y-2 rotate-3 rounded-[2rem] bg-primary-foreground/20" />
            <Bezel className="relative -rotate-3 transition-transform duration-700 ease-spring hover:rotate-0">
              <div className="overflow-hidden rounded-[calc(2.25rem-0.375rem)]">
                <div className="flex justify-center gap-10 bg-accent py-4">
                  <span className="h-4 w-4 rounded-full bg-primary" />
                  <span className="h-4 w-4 rounded-full bg-primary" />
                </div>
                <div className="py-10 text-center text-primary">
                  <p className="text-sm font-bold uppercase tracking-[0.2em]">{t("calendarMonth")}</p>
                  <div className="text-[9rem] font-bold leading-none tracking-tighter">14</div>
                  <p className="text-sm text-muted-foreground">{t("calendarDay")}</p>
                </div>
              </div>
            </Bezel>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

/* ---------- faq ---------- */

function Faq() {
  const t = useTranslations("faq");
  const keys = ["start", "photos", "bidding", "who", "offline", "delivery", "funds"] as const;
  return (
    <section id="faq" className="relative mx-auto grid max-w-7xl gap-10 px-4 py-16 md:grid-cols-12 md:px-8 md:py-24">
      <div className="md:col-span-5">
        <div className="md:sticky md:top-32">
          <h2 className="text-5xl font-bold tracking-tight text-primary md:text-7xl">
            <span className="block"><SplitWords text={t("title1")} /></span>
            <OutlineFill text={t("title2")} />
          </h2>
          <a href={`mailto:${CONTACT_EMAIL}`} className="mt-10 inline-flex items-center gap-2 text-sm font-medium text-primary underline decoration-accent decoration-4 underline-offset-8">
            {t("contact")}
          </a>
        </div>
      </div>
      <div className="space-y-4 md:col-span-7">
        {keys.map((key, k) => (
          <Reveal key={key} delay={k * 0.06}>
            <Bezel>
              <FaqItem q={t(`items.${key}.q`)} a={t(`items.${key}.a`)} />
            </Bezel>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

/* ---------- about ---------- */

function About() {
  const t = useTranslations("about");
  const facts = ["01", "02", "03", "04"] as const;
  return (
    <section id="about" className="relative overflow-hidden px-4 pb-8 pt-20 md:px-8 md:pt-24">
      <FloatingObjects set="about" />
      <div className="mx-auto grid max-w-7xl gap-10 md:grid-cols-12">
        <div className="md:col-span-5">
          <span className="inline-flex rounded-full bg-primary/5 px-3 py-1 text-[10px] font-medium uppercase tracking-[0.2em] text-primary ring-1 ring-primary/10">{t("label")}</span>
          <h2 className="mt-6 text-4xl font-bold tracking-tight text-primary md:text-6xl">
            <span className="block"><SplitWords text={t("title")} /></span> <Highlight delay={0.4}><span className="italic">{t("titleHighlight")}</span></Highlight>
          </h2>
        </div>
        <div className="space-y-5 text-lg leading-relaxed text-muted-foreground md:col-span-7 md:pt-14">
          <Reveal><p><b className="font-medium text-primary">{t("p1Name")}</b>{t("p1")}</p></Reveal>
          <Reveal delay={0.08}><p>{t("p2")}</p></Reveal>
        </div>
      </div>
      <div className="mx-auto mt-12 grid max-w-7xl gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {facts.map((n, k) => (
          <Reveal key={n} delay={k * 0.07}>
            <Bezel core="group h-full bg-card p-6 transition-colors duration-500 hover:bg-accent-soft">
              <span className="text-outline text-4xl font-bold leading-none">{n}</span>
              <p className="mt-6 text-xl font-bold tracking-tight text-primary">{t(`facts.${n}.title`)}</p>
              <p className="mt-2 text-sm text-muted-foreground">{t(`facts.${n}.text`)}</p>
            </Bezel>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

/* ---------- footer ---------- */

function Footer() {
  const t = useTranslations("footer");
  return (
    <footer className="relative overflow-hidden bg-navy-deep text-primary-foreground">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 pt-24 md:grid-cols-12 md:px-8">
        <div className="md:col-span-6">
          <p className="text-3xl font-bold tracking-tight md:text-4xl">{t("question")}</p>
          <div className="mt-8">
            <PillCta href={`mailto:${CONTACT_EMAIL}`} variant="accent">{t("write")}</PillCta>
          </div>
        </div>
        <div className="space-y-1 text-sm text-primary-foreground/60 md:col-span-3">
          <p className="font-bold text-primary-foreground">{t("contacts")}</p>
          <a href={`mailto:${CONTACT_EMAIL}`} className="block hover:text-accent">{CONTACT_EMAIL}</a>
          <p>{t("address")}</p>
        </div>
        <div className="space-y-1 text-sm text-primary-foreground/60 md:col-span-3">
          <p className="font-bold text-primary-foreground">KSE</p>
          <a href="https://kse.ua" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:text-accent">
            {t("site")} <ArrowUpRight weight="light" />
          </a>
          <p className="pt-3 text-xs text-primary-foreground/40">{t("note")}</p>
        </div>
      </div>
      <div aria-hidden className="text-outline-light mt-16 select-none text-center text-[34vw] font-bold leading-[0.75] tracking-tighter">
        KSE
      </div>
    </footer>
  );
}

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="px-7 py-6">
      <button onClick={() => setOpen(!open)} aria-expanded={open} className="flex w-full items-center justify-between gap-4 text-left text-xl font-bold tracking-tight text-primary">
        {q}
        <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-full transition-all duration-700 ease-spring ${open ? "rotate-[135deg] bg-accent" : "bg-primary/5"}`}>
          <Plus weight="light" size={20} />
        </span>
      </button>
      <div className={`grid transition-[grid-template-rows,opacity] duration-700 ease-spring ${open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
        <div className="overflow-hidden">
          <p className={`max-w-[56ch] pt-4 text-muted-foreground transition-transform duration-700 ease-spring ${open ? "translate-y-0" : "-translate-y-3"}`}>{a}</p>
        </div>
      </div>
    </div>
  );
}
