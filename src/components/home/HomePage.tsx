"use client";

import Image from "next/image";
import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode, type CSSProperties, type PointerEvent } from "react";
import { useLocale, useTranslations } from "next-intl";
import { AnimatePresence, motion, useInView, useMotionValue, useReducedMotion, useScroll, useSpring, useTransform, type MotionValue } from "motion/react";
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
import { BrandLogo, KSE_PATHS } from "@/components/BrandLogo";
import { ClosedWindow } from "@/components/ClosedWindow";
import { Bezel } from "@/components/ui";
import { AccountLink, LocaleSwitch } from "@/components/SiteBar";
import { LotCard } from "@/components/auction/LotCard";
import { useLiveShow } from "@/components/auction/live";
import { formatUah } from "@/lib/format";
import type { LiveState, PublicLot } from "@/lib/types";
import { cn } from "@/lib/utils";
import { SplitWords, Highlight, OutlineFill, Magnetic, VelocityMarquee, RollDigits, ScrollWords, EASE, VIEW } from "@/components/fx";
import { CONTACT_EMAIL, FINAL_AT } from "@/lib/auction";

const GAVEL = "/images/gavel-3d.webp";
// Cut-out of the Rector sitting (transparent background); the hero swings its shins.
const RECTOR_SITTING = "/images/rector-sitting.webp";
// The prototype's playful tilt, kept for the real cards on wide screens.
const TILT = ["md:-rotate-[3deg] md:translate-y-8", "md:rotate-[2deg] md:-translate-y-3", "md:-rotate-[1deg] md:translate-y-12"];
const i = (n: number) => ({ ["--i" as string]: n }) as CSSProperties;
// Base styles the prototype took from the shadcn Button.
const BTN = "inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium transition-all outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 [&_svg]:pointer-events-none [&_svg]:shrink-0";

export function HomePage({ live }: { live: LiveState }) {
  const [ready, setReady] = useState(false);
  // Follows the presenter: the lot on air and the total raised, both live.
  const { lot, total } = useLiveShow(live);
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
    <div className={`home grain overflow-x-clip ${ready ? "is-ready" : ""}`}>
      <Preloader />
      <Nav />
      <ClosedWindow />
      <main>
        <Hero raised={total} />
        <Marquee />
        <About />
        <Lots lot={lot} />
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
      viewport={VIEW}
      transition={{ duration: 0.8, delay, ease: EASE }}
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

const SECTIONS = ["about", "lots", "how", "report", "faq"] as const;
type Section = (typeof SECTIONS)[number];

/**
 * Which section the visitor is reading, for the header. One IntersectionObserver watches a thin band
 * across the upper middle of the screen, so nothing runs on scroll and state changes only when the
 * section under the band does. The hero and the countdown are not in the menu, so over them the pill
 * goes out; past the last section (the footer) the last one stays lit.
 * A click locks the target until its smooth scroll ends, so the highlight doesn't hop through every
 * section on the way.
 */
function useActiveSection() {
  // `from` is the section lit before this one, so the pill knows whether to slide or to appear.
  const [{ active, from }, setSpot] = useState<{ active: Section | null; from: Section | null }>({ active: null, from: null });
  const setActive = (next: Section | null) => setSpot((s) => (s.active === next ? s : { active: next, from: s.active }));
  const lock = useRef<Section | null>(null);
  useEffect(() => {
    const targets = ["top", ...SECTIONS, "countdown"].map((id) => document.getElementById(id)).filter((e): e is HTMLElement => !!e);
    const crossing = new Set<Element>();
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) (e.isIntersecting ? crossing.add(e.target) : crossing.delete(e.target));
        if (lock.current) return;
        const hit = targets.find((el) => crossing.has(el));
        if (hit) setActive((SECTIONS as readonly string[]).includes(hit.id) ? (hit.id as Section) : null);
      },
      { rootMargin: "-40% 0px -59% 0px" },
    );
    targets.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
  const jumpTo = (id: Section) => {
    lock.current = id;
    setActive(id);
    const release = () => { lock.current = null; };
    window.addEventListener("scrollend", release, { once: true });
    setTimeout(release, 1400); // no scroll happens when the section is already in place
  };
  return { active, from, jumpTo };
}

const PILL = { type: "spring", stiffness: 420, damping: 36, mass: 0.8 } as const;
// On exit, `next` is the section taking over: then the pill simply hands over (no ghost fading behind).
const PILL_STATES = {
  here: { opacity: 1, scale: 1 },
  away: (next: Section | null) => (next ? { opacity: 0, transition: { duration: 0 } } : { opacity: 0, scale: 0.85 }),
};

function Nav() {
  const t = useTranslations();
  const reduce = useReducedMotion();
  const [open, setOpen] = useState(false);
  const { active, from, jumpTo } = useActiveSection();
  const links = SECTIONS.map((k) => [k, `#${k}`, t(`nav.${k}`)] as const);
  const pillMove = reduce ? { duration: 0 } : PILL;
  return (
    <>
      <header className="fixed inset-x-0 top-5 z-40 flex justify-center px-4">
        <div className="grid w-full max-w-6xl grid-cols-[minmax(0,1fr)_auto] items-center justify-between gap-3 lg:flex lg:gap-6 rounded-full bg-background/70 py-2 pl-3 pr-2 shadow-soft ring-1 ring-primary/10 backdrop-blur-xl lg:w-max">
          <a href="#top" className="flex items-center">
            <BrandLogo />
          </a>
          <nav className="hidden items-center gap-1 whitespace-nowrap text-sm text-muted-foreground lg:flex">
            {links.map(([k, h, l]) => (
              <a
                key={h}
                href={h}
                onClick={() => jumpTo(k)}
                aria-current={active === k ? "location" : undefined}
                className={cn("relative isolate rounded-full px-4 py-2 transition-colors duration-300", active === k ? "text-accent-foreground" : "hover:bg-primary/5 hover:text-primary")}
              >
                {/* One cyan pill that slides between links (shared layout, transforms only); it fades only into and out of the hero. */}
                <AnimatePresence custom={active}>
                  {active === k && (
                    <motion.span
                      layoutId="nav-active"
                      className="absolute inset-0 -z-10 rounded-full bg-accent"
                      variants={PILL_STATES}
                      initial={from ? false : "away"}
                      animate="here"
                      exit="away"
                      transition={pillMove}
                    />
                  )}
                </AnimatePresence>
                {l}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <LocaleSwitch />
            <AccountLink />
            <Link href="/live" className={cn(BTN, "hidden h-auto rounded-full bg-primary px-5 py-2.5 text-primary-foreground hover:bg-primary/90 active:scale-[0.98] sm:inline-flex")}>
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
        {links.map(([key, h, l], k) => (
          <a
            key={h}
            href={h}
            onClick={() => { jumpTo(key); setOpen(false); }}
            aria-current={active === key ? "location" : undefined}
            style={{ transitionDelay: open ? `${100 + k * 60}ms` : "0ms" }}
            className={`relative flex items-center gap-4 text-3xl sm:text-5xl font-bold transition-all duration-700 ease-spring ${active === key ? "text-primary" : "text-primary/45"} ${open ? "translate-y-0 opacity-100" : "translate-y-12 opacity-0"}`}
          >
            {/* The current section is marked by a cyan bar that slides to it. */}
            <span className="relative h-[0.7em] w-1.5 shrink-0">
              {active === key && <motion.span layoutId="menu-active" className="absolute inset-0 rounded-full bg-accent" transition={pillMove} />}
            </span>
            {l}
          </a>
        ))}
      </div>
    </>
  );
}

/* ---------- hero ---------- */

function RotatingBadge({ hits }: { hits: number }) {
  const t = useTranslations("hero");
  return (
    <span key={hits} className="badge-burst">
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
    </span>
  );
}

/** Pointer depth for the hero's pieces: each layer drifts by its own share of the cursor offset. */
function usePointerDepth() {
  const mx = useSpring(useMotionValue(0), { stiffness: 60, damping: 18 });
  const my = useSpring(useMotionValue(0), { stiffness: 60, damping: 18 });
  const onPointerMove = (e: PointerEvent<HTMLElement>) => {
    if (e.pointerType !== "mouse" || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const r = e.currentTarget.getBoundingClientRect();
    mx.set((e.clientX - r.left) / r.width - 0.5);
    my.set((e.clientY - r.top) / r.height - 0.5);
  };
  const onPointerLeave = () => { mx.set(0); my.set(0); };
  return { mx, my, handlers: { onPointerMove, onPointerLeave } };
}

/** A pointer share in pixels, plus an optional scroll offset riding on the same wrapper. */
const useDepth = (v: MotionValue<number>, px: number, plus?: MotionValue<number>) =>
  useTransform(plus ? [v, plus] : [v], (xs: number[]) => (xs[0] ?? 0) * px + (xs[1] ?? 0));

function Hero({ raised }: { raised: number }) {
  const t = useTranslations("hero");
  const reduce = useReducedMotion();
  const { scrollY } = useScroll();
  const yImg = useTransform(scrollY, [0, 700], [0, 24]);
  const yGavel = useTransform(scrollY, [0, 700], [0, -35]);
  const { mx, my, handlers } = usePointerDepth();
  // Each strike replays the hammer, the stamp and the badge; the first waits for the title.
  const [hits, setHits] = useState(0);
  const replay = { ["--d" as string]: hits ? "0s" : undefined } as CSSProperties;
  const portrait = { x: useDepth(mx, -10), y: useDepth(my, -8, yImg) };
  const badge = { x: useDepth(mx, 22), y: useDepth(my, 16) };
  const gavel = { x: useDepth(mx, 34), y: useDepth(my, 26, yGavel) };
  const ticket = { x: useDepth(mx, 16), y: useDepth(my, 12) };
  return (
    <section id="top" className="hero-section dot-grid relative" {...handlers}>
      <div className="hero-layout relative mx-auto max-w-7xl px-4 md:px-8">
        <div className="hero-copy relative z-10 min-w-0">
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
            <a href="#how" className={cn(BTN, "hero-howto h-auto rounded-full px-3 py-3 text-primary hover:bg-accent hover:text-accent-foreground")}>{t("howToBid")} <ArrowUpRight weight="light" /></a>
          </div>
          <div className="enter hero-details grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-t border-primary/15" style={i(6)}>
            <span className="min-w-0 text-xs text-muted-foreground">{t("catalogStatus")} <b className="ml-1 text-sm tabular-nums text-primary">{formatUah(raised)}</b></span>
            <span className="text-xs font-medium text-primary">{t("final")} <b className="ml-2">14.11.2026</b></span>
          </div>
        </div>
        <div className="hero-visual relative min-w-0">
          {/* Above the badge, gavel and ticket (z-10): everything around him sits behind him. */}
          <motion.div style={reduce ? {} : portrait} className="relative z-20 pointer-events-none">
            <figure className="enter rector-stage" style={i(2)}>
              <div className="rector-plinth" />
              <div className="rector-figure">
                <Image src={RECTOR_SITTING} alt={t("photoAlt")} width={1010} height={1780} priority sizes="(max-width: 639px) 210px, 320px" className="rector-body" />
                <Image src={RECTOR_SITTING} alt="" aria-hidden width={1010} height={1780} sizes="(max-width: 639px) 210px, 320px" className="rector-shin" />
                <Image src={RECTOR_SITTING} alt="" aria-hidden width={1010} height={1780} sizes="(max-width: 639px) 210px, 320px" className="rector-shin is-right" />
              </div>
              <figcaption className="rector-label">
                <b className="block text-sm sm:text-base">{t("name")}</b>
                <span className="text-xs text-primary-foreground/70">{t("role")}</span>
              </figcaption>
            </figure>
          </motion.div>
          <motion.div style={reduce ? {} : badge} className="hero-badge absolute"><RotatingBadge hits={hits} /></motion.div>
          <motion.div style={reduce ? {} : gavel} className="hero-gavel pointer-events-none absolute">
            <button type="button" aria-label={t("strike")} title={t("strike")} onClick={() => setHits((n) => n + 1)} className="gavel-btn">
              <span className="animate-floaty block">
                <span key={hits} className="gavel-layers block" style={replay}>
                  <Image src={GAVEL} alt="" width={1024} height={1024} sizes="140px" className="gavel-block" />
                  <Image src={GAVEL} alt="" width={1024} height={1024} sizes="140px" className="gavel-hammer" />
                  <span className="gavel-ring" />
                </span>
              </span>
            </button>
          </motion.div>
          <motion.div style={reduce ? {} : ticket} className="absolute left-[-28px] top-8 z-10 max-lg:hidden">
            <div key={hits} className="hero-ticket flex items-center gap-3 bg-accent text-accent-foreground" style={replay}>
              <span className="text-3xl font-bold leading-none">14</span>
              <span className="text-xs leading-snug"><b className="block">{t("ticketDate")}</b>{t("ticketLabel")}</span>
            </div>
          </motion.div>
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

/** Only the lot on air: viewers follow the show, not a catalogue. */
function Lots({ lot }: { lot: PublicLot | null }) {
  const t = useTranslations("lots");
  const reduce = useReducedMotion();
  const top = lot ? [lot] : [];
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
        {top.length ? (
          // Phones: a swipeable row with the next tag peeking in, instead of three screen-tall cards.
          <div className="mx-auto mt-12 w-full max-w-sm max-sm:mt-8">
            {top.map((lot, k) => (
              // A price tag hung by its hole: it drops onto the hook, swings and settles; a nudge on hover.
              // The tilt lives on its own wrapper so the swing never fights it.
              <div key={lot.id} className={TILT[1]}>
                <motion.div
                  style={{ transformOrigin: "50% 1.9rem" }}
                  initial={reduce ? false : { opacity: 0, y: -90, rotate: (k - 1) * 9 + 7 }}
                  whileInView={{ opacity: 1, y: 0, rotate: 0 }}
                  whileHover={reduce ? undefined : { rotate: [0, -2.5, 1.6, -0.8, 0], transition: { duration: 1.1, ease: "easeOut" } }}
                  viewport={VIEW}
                  transition={{
                    opacity: { duration: 0.4, delay: 0.1 + k * 0.14 },
                    y: { duration: 0.7, delay: 0.1 + k * 0.14, ease: EASE },
                    rotate: { type: "spring", stiffness: 70, damping: 6, mass: 0.9, delay: 0.1 + k * 0.14 },
                  }}
                >
                  <LotCard lot={lot} />
                </motion.div>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-12 text-primary-foreground/65">{t("empty")}</p>
        )}
        <div className="mt-14 flex justify-center max-sm:mt-6">
          <PillCta href="/live" variant="accent">{t("all")}</PillCta>
        </div>
      </div>
    </section>
  );
}

/* ---------- steps: rising bid ladder ---------- */

function Steps() {
  const t = useTranslations("steps");
  const reduce = useReducedMotion();
  const wide = useWide();
  const steps = [
    { key: "choose", icon: HandPointing, h: "lg:h-[22rem]" },
    { key: "bid", icon: Gavel, h: "lg:h-[26rem]" },
    { key: "result", icon: Trophy, h: "lg:h-[30rem]" },
  ] as const;
  return (
    <section id="how" className="relative overflow-hidden py-16 md:py-24">
      <FloatingObjects set="how" />
      <div className="relative z-10 mx-auto max-w-7xl px-4 md:px-8">
        <Reveal>
          <h2 className="text-5xl font-bold tracking-tight text-primary md:text-7xl">
            <span className="block"><SplitWords text={t("title1")} /></span>
            <OutlineFill text={t("title2")} />
          </h2>
          <p className="mt-6 max-w-[48ch] text-muted-foreground">{t("intro")}</p>
        </Reveal>
        {/* The grid is what gets watched: a fully clipped bar never reports itself as on screen. */}
        <motion.div className="mt-10 grid items-end gap-4 sm:mt-16 sm:gap-5 lg:grid-cols-3" initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.25 }}>
          {steps.map((s, k) => (
            <LadderStep key={s.key} k={k} wide={wide} reduce={!!reduce}>
              <Bezel core={`flex flex-col justify-between p-6 sm:p-8 ${k === 2 ? "bg-primary text-primary-foreground" : k === 1 ? "bg-accent text-accent-foreground" : "bg-card"} ${s.h}`}>
                <div className="flex items-start justify-between">
                  <s.icon size={40} weight="light" />
                  <span className="text-5xl font-bold leading-none opacity-15 sm:text-7xl">{k + 1}</span>
                </div>
                <div className="mt-8 sm:mt-16">
                  <h3 className="text-2xl font-bold tracking-tight sm:text-3xl">{t(`items.${s.key}.title`)}</h3>
                  <p className="mt-3 opacity-70">{t(`items.${s.key}.text`)}</p>
                  <span className="mt-6 inline-block rounded-full bg-current/10 px-4 py-1.5 text-xs font-medium ring-1 ring-current/20">{t(`items.${s.key}.status`)}</span>
                </div>
              </Bezel>
            </LadderStep>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

/**
 * One rung of the bid ladder. On wide screens the bars grow out of the floor once they are in view,
 * each a beat after the one before, like bids climbing; on phones (stacked) each simply rises in.
 * Played once rather than scrubbed, so a reader who stops scrolling never sees a half-built ladder.
 * The two versions are keyed apart: `wide` is false while hydrating and flips right after, and without
 * a remount the phone version's starting opacity of 0 stuck on the wide one, leaving an empty gap.
 */
function LadderStep({ k, wide, reduce, children }: { k: number; wide: boolean; reduce: boolean; children: ReactNode }) {
  if (wide && !reduce) {
    const at = { duration: 0.95, delay: 0.15 + k * 0.2, ease: EASE };
    return (
      <motion.div
        key="wide"
        variants={{ hidden: { clipPath: "inset(100% 0% 0% 0% round 2.25rem)" }, show: { clipPath: "inset(0% 0% 0% 0% round 2.25rem)", transition: at } }}
      >
        <motion.div variants={{ hidden: { y: 60 }, show: { y: 0, transition: at } }}>{children}</motion.div>
      </motion.div>
    );
  }
  return (
    <motion.div key="narrow" initial={reduce ? false : { opacity: 0, y: 72 }} whileInView={{ opacity: 1, y: 0 }} viewport={VIEW} transition={{ duration: 0.9, ease: EASE }}>
      {children}
    </motion.div>
  );
}

const subscribeWide = (cb: () => void) => {
  const m = window.matchMedia("(min-width: 1024px)");
  m.addEventListener("change", cb);
  return () => m.removeEventListener("change", cb);
};
/** True on screens where the ladder stands in one row (lg and up); false during server render. */
const useWide = () => useSyncExternalStore(subscribeWide, () => window.matchMedia("(min-width: 1024px)").matches, () => false);

/* ---------- report: bento ---------- */

function Report() {
  const t = useTranslations("report");
  const reduce = useReducedMotion();
  const box = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: box, offset: ["start end", "end start"] });
  const drift = useTransform(scrollYProgress, [0, 1], ["18%", "-22%"]);
  return (
    <section ref={box} id="report" className="px-4 pb-16 md:px-8">
      <div className="mx-auto grid max-w-7xl gap-5 md:grid-cols-12 md:grid-rows-2">
        <Reveal className="md:col-span-7 md:row-span-2">
          <Bezel core="relative h-full overflow-hidden bg-accent-soft p-6 sm:p-10 lg:p-14">
            <div className="orb absolute -bottom-24 -right-24 h-80 w-80 rounded-full opacity-60" />
            <motion.span aria-hidden style={reduce ? {} : { x: drift }} className="text-outline pointer-events-none absolute -right-6 bottom-6 select-none text-[9rem] font-bold leading-none opacity-30 md:text-[12rem]">{t("watermark")}</motion.span>
            <motion.img src={GAVEL} alt="" aria-hidden loading="lazy" decoding="async" animate={reduce ? undefined : { rotate: [-14, 8, -14], y: [0, -10, 0] }} transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }} className="pointer-events-none absolute right-8 top-8 hidden w-28 md:block" />
            <h2 className="relative text-4xl font-bold text-primary lg:text-6xl">
              <SplitWords text={t("title")} /> <Highlight delay={0.5}><span className="italic">{t("titleHighlight")}</span></Highlight>
            </h2>
            <p className="relative mt-6 max-w-[42ch] text-muted-foreground">
              {t("text")}
            </p>
            <p className="relative mt-10 text-sm font-medium text-primary sm:mt-16">{t("credit")}</p>
          </Bezel>
        </Reveal>
        {[
          [t("cause"), "bg-primary text-primary-foreground"],
          [t("goal"), "bg-card"],
        ].map(([a, c], k) => (
          <Reveal key={a} delay={0.1 + k * 0.1} className="md:col-span-5">
            <Bezel core={`flex h-full min-h-32 items-end justify-between p-6 sm:min-h-44 sm:p-8 ${c}`}>
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
  const reduce = useReducedMotion();
  const left = useCountdown();
  const units = ["d", "h", "m", "s"] as const;
  return (
    <section id="countdown" className="relative overflow-hidden bg-primary py-16 text-primary-foreground md:py-24">
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
                <div className="mt-1 text-[11px] text-primary-foreground/60 sm:uppercase sm:tracking-[0.2em]">{t(`units.${k}`)}</div>
              </div>
            ))}
          </div>
          <p className="mt-4 text-xs text-primary-foreground/40">{t("timeNote")}</p>
        </Reveal>
        <motion.div
          className="md:col-span-5"
          initial={reduce ? false : { opacity: 0, y: -90, rotate: -8 }}
          whileInView={{ opacity: 1, y: 0, rotate: 0 }}
          viewport={VIEW}
          transition={{ type: "spring", stiffness: 110, damping: 20, mass: 1, delay: 0.15 }}
        >
          {/* tear-off calendar: counts down from the visitor's today to the final when it comes into view */}
          <div className="relative mx-auto w-full max-w-[15rem] sm:max-w-xs">
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
    <div className="bg-card py-10 text-center text-primary">
      <p className="text-sm font-bold uppercase tracking-[0.2em]">{month}</p>
      <div className="text-[9rem] font-bold leading-none tracking-tighter tabular-nums">{day}</div>
      <p className="text-sm text-muted-foreground">{weekday}</p>
    </div>
  );
}

const FINAL_DAY = new Date(FINAL_AT.getFullYear(), FINAL_AT.getMonth(), FINAL_AT.getDate());

/** Calendar days from the visitor's today to the final, thinned evenly to at most `max` pages. */
function daysToFinal(today: Date, max = 24): Date[] {
  const day = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const all: Date[] = [];
  for (const d = day; d < FINAL_DAY; d.setDate(d.getDate() + 1)) all.push(new Date(d));
  all.push(FINAL_DAY);
  if (all.length <= max) return all;
  return Array.from({ length: max }, (_, k) => all[Math.round((k * (all.length - 1)) / (max - 1))]!);
}

/**
 * The calendar opens on the visitor's today and, once it is on screen, tears off one page per day
 * until 14 November, fast at first and slowing into the final day. Only two pages are ever mounted:
 * the current one and the one falling off it. The server renders 14, so hydration never reads the clock.
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
    if (!reduce) setDays(daysToFinal(new Date())); // eslint-disable-line react-hooks/set-state-in-effect
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
      : { month: fallback.month, day: String(FINAL_DAY.getDate()), weekday: fallback.weekday };
  const landed = days != null && at === days.length - 1 && at > 0;

  return (
    <div ref={ref} className="relative" aria-live="off">
      {/* The final day settles with a small knock when it is reached. */}
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
          <a href={`mailto:${CONTACT_EMAIL}`} className="mt-6 inline-flex items-center gap-2 py-3 text-sm font-medium text-primary underline decoration-accent decoration-4 underline-offset-8 md:mt-10">
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
  const reduce = useReducedMotion();
  const facts = ["01", "02", "03", "04"] as const;
  return (
    <section id="about" className="relative overflow-hidden px-4 pb-8 pt-20 md:px-8 md:pt-24">
      <FloatingObjects set="about" />
      <div className="relative z-10 mx-auto grid max-w-7xl gap-10 md:grid-cols-12">
        <div className="md:col-span-5">
          <h2 className="text-4xl font-bold tracking-tight text-primary md:text-6xl">
            <span className="block"><SplitWords text={t("title")} /></span> <Highlight delay={0.4}><span className="italic">{t("titleHighlight")}</span></Highlight>
          </h2>
        </div>
        <div className="space-y-5 text-lg leading-relaxed text-muted-foreground md:col-span-7 md:pt-14">
          <p><b className="font-medium text-primary">{t("p1Name")}</b><ScrollWords text={t("p1")} /></p>
          <p><ScrollWords text={t("p2")} /></p>
        </div>
      </div>
      <div className="relative z-10 mx-auto mt-10 grid max-w-7xl grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {facts.map((n, k) => (
          <motion.div
            key={n}
            initial={reduce ? false : { opacity: 0, y: 70, rotate: (k - 1.5) * 7 }}
            whileInView={{ opacity: 1, y: 0, rotate: 0 }}
            viewport={VIEW}
            transition={{ opacity: { duration: 0.4, delay: k * 0.08 }, default: { type: "spring", stiffness: 90, damping: 14, delay: k * 0.08 } }}
            whileHover={reduce ? undefined : { y: -6, rotate: k % 2 ? 1.2 : -1.2 }}
          >
            <Bezel className="h-full max-sm:rounded-[1.6rem]" core="group h-full bg-card p-4 transition-colors duration-500 hover:bg-accent-soft max-sm:rounded-[calc(1.6rem-0.375rem)] sm:p-6">
              <span className="text-outline text-3xl font-bold leading-none sm:text-4xl">{n}</span>
              <p className="mt-4 text-base font-bold leading-tight tracking-tight text-primary sm:mt-6 sm:text-xl">{t(`facts.${n}.title`)}</p>
              <p className="mt-1.5 text-[13px] leading-snug text-muted-foreground sm:mt-2 sm:text-sm">{t(`facts.${n}.text`)}</p>
            </Bezel>
          </motion.div>
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
      <div className="mx-auto grid max-w-7xl gap-8 px-4 pt-16 md:grid-cols-12 md:gap-10 md:px-8 md:pt-24">
        <div className="md:col-span-6">
          <p className="text-3xl font-bold tracking-tight md:text-4xl">{t("question")}</p>
          <div className="mt-8">
            <PillCta href={`mailto:${CONTACT_EMAIL}`} variant="accent">{t("write")}</PillCta>
          </div>
        </div>
        <div className="space-y-1 text-sm text-primary-foreground/60 md:col-span-3">
          <p className="font-bold text-primary-foreground">{t("contacts")}</p>
          <a href={`mailto:${CONTACT_EMAIL}`} className="block py-2 hover:text-accent">{CONTACT_EMAIL}</a>
          <p>{t("address")}</p>
        </div>
        <div className="space-y-1 text-sm text-primary-foreground/60 md:col-span-3">
          <p className="font-bold text-primary-foreground">KSE</p>
          <a href="https://kse.ua" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 py-2 hover:text-accent">
            {t("site")} <ArrowUpRight weight="light" />
          </a>
          <p className="pt-3 text-xs text-primary-foreground/40">{t("note")}</p>
        </div>
      </div>
      <FooterMark />
    </footer>
  );
}

function FooterMark() {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end end"] });
  const trace = useTransform(scrollYProgress, [0.05, 0.8], [1, 0], { clamp: true });
  const fill = useTransform(scrollYProgress, [0.75, 1], [0, 0.14], { clamp: true });
  const bar = useTransform(scrollYProgress, [0.8, 1], [1, 0], { clamp: true });
  return (
    <div ref={ref} className="mx-auto mt-16 max-w-7xl px-4 pb-6 md:px-8">
    <svg aria-hidden viewBox="0 120 1270 520" className="block w-full">
      {KSE_PATHS.map((d, k) => (
        <motion.path
          key={k}
          d={d}
          pathLength={1}
          strokeDasharray="1 1"
          fill="var(--kse-cyan)"
          stroke="color-mix(in oklab, var(--primary-foreground) 45%, transparent)"
          strokeWidth={4}
          vectorEffect="non-scaling-stroke"
          style={reduce ? { fillOpacity: 0.14, strokeDashoffset: 0 } : { fillOpacity: fill, strokeDashoffset: trace }}
        />
      ))}
      <motion.line x1="20" y1="620" x2="1250" y2="620" pathLength={1} strokeDasharray="1 1" stroke="var(--kse-cyan)" strokeWidth={22} strokeLinecap="round" style={reduce ? {} : { strokeDashoffset: bar }} />
    </svg>
    </div>
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
