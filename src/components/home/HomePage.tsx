"use client";

import Image from "next/image";
import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode, type CSSProperties, type PointerEvent } from "react";
import { useTranslations } from "next-intl";
import { AnimatePresence, motion, useMotionValue, useReducedMotion, useScroll, useSpring, useTransform, type MotionValue } from "motion/react";
import { ArrowUpRight, Gavel, HandPointing, Trophy, Asterisk, Plus } from "@phosphor-icons/react";
import { FloatingObjects } from "@/components/objects";
import { Preloader } from "@/components/Preloader";
import { BrandLogo, KSE_PATHS } from "@/components/BrandLogo";
import { Bezel } from "@/components/ui";
import { LocaleSwitch } from "@/components/SiteBar";
import { Countdown } from "@/components/home/Countdown";
import { LotCatalogue } from "@/components/home/LotCatalogue";
import type { PublicLot } from "@/lib/types";
import { cn } from "@/lib/utils";
import { SplitWords, Highlight, OutlineFill, VelocityMarquee, ScrollWords, EASE, VIEW } from "@/components/fx";
import { CONTACT_EMAIL } from "@/lib/auction";

const GAVEL = "/images/gavel-3d.webp";
// Cut-out of the Rector sitting (transparent background); the hero swings its shins.
const RECTOR_SITTING = "/images/rector-sitting.webp";
const i = (n: number) => ({ ["--i" as string]: n }) as CSSProperties;
// Base styles the prototype took from the shadcn Button.
const BTN = "inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium transition-all outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 [&_svg]:pointer-events-none [&_svg]:shrink-0";

export function HomePage({ lots }: { lots: PublicLot[] }) {
  const [ready, setReady] = useState(false);
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
      <main>
        <Hero />
        <Marquee />
        <About />
        <Lots lots={lots} />
        <Steps />
        <Countdown />
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

function PillCta({ children, href, variant = "primary" }: { children: ReactNode; href: string; variant?: "primary" | "accent" }) {
  const cls =
    variant === "primary"
      ? "bg-primary text-primary-foreground"
      : "bg-accent text-accent-foreground";
  const inner = variant === "primary" ? "bg-primary-foreground/15" : "bg-primary/10";
  const body = (
    <>
      <span>{children}</span>
      <span className={`grid h-9 w-9 place-items-center rounded-full ${inner}`}>
        <ArrowUpRight weight="light" size={18} />
      </span>
    </>
  );
  const c = `inline-flex items-center gap-4 rounded-full py-2 pl-7 pr-2 font-medium shadow-soft transition-transform duration-500 ease-spring active:scale-[0.98] ${cls}`;
  return <a href={href} className={c}>{body}</a>;
}

/* ---------- nav ---------- */

const SECTIONS = ["about", "lots", "how", "faq"] as const;
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

function Hero() {
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
            <a href="#how" className={cn(BTN, "hero-howto h-auto rounded-full px-3 py-3 text-primary")}>{t("how")} <ArrowUpRight weight="light" /></a>
          </div>
          <div className="enter hero-details grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-t border-primary/15" style={i(6)}>
            <span className="min-w-0 text-xs text-muted-foreground">{t("format")}</span>
            <span className="text-xs font-medium text-primary">{t("dateLabel")} <b className="ml-1">{t("date")}</b></span>
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
              <span className="text-3xl font-bold leading-none">4</span>
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

function Lots({ lots }: { lots: PublicLot[] }) {
  const t = useTranslations("lots");
  return (
    <section id="lots" className="relative overflow-hidden bg-primary pb-12 pt-12 md:pb-20 md:pt-24 text-primary-foreground">
      <div className="orb pointer-events-none absolute -right-40 top-20 h-[34rem] w-[34rem] rounded-full opacity-30" />
      <span aria-hidden className="text-outline-light pointer-events-none absolute -left-6 top-24 select-none text-[22vw] font-bold leading-none opacity-60">
        {t("watermark")}
      </span>
      <div className="relative mx-auto max-w-7xl px-4 md:px-8">
        <Reveal className="max-w-2xl md:ml-auto md:text-right">
          <h2 className="text-4xl font-bold tracking-tight md:text-7xl">
            <SplitWords text={t("title1")} /> <span className="text-accent"><SplitWords text={t("title2")} delay={0.14} /></span>{" "}
            <SplitWords text={t("title3")} delay={0.21} />
          </h2>
          <p className="mt-6 text-primary-foreground/65 md:ml-auto md:max-w-[44ch]">
            {t("intro")}
          </p>
        </Reveal>
        <LotCatalogue lots={lots} />
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
    <section id="how" className="relative overflow-hidden py-12 md:py-24">
      <FloatingObjects set="how" />
      <div className="relative z-10 mx-auto max-w-7xl px-4 md:px-8">
        <Reveal>
          <h2 className="text-4xl font-bold tracking-tight text-primary md:text-7xl">
            <span className="block"><SplitWords text={t("title1")} /></span>
            <OutlineFill text={t("title2")} />
          </h2>
          <p className="mt-6 max-w-[48ch] text-muted-foreground">{t("intro")}</p>
        </Reveal>
        {/* The grid is what gets watched: a fully clipped bar never reports itself as on screen. */}
        <motion.div className="mt-10 grid items-end gap-4 sm:mt-16 sm:gap-5 lg:grid-cols-3" initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.25 }}>
          {steps.map((s, k) => (
            <LadderStep key={s.key} k={k} wide={wide} reduce={!!reduce}>
              <Bezel core={`flex flex-col justify-between p-5 sm:p-8 ${k === 2 ? "bg-primary text-primary-foreground" : k === 1 ? "bg-accent text-accent-foreground" : "bg-card"} ${s.h}`}>
                <div className="flex items-start justify-between">
                  <s.icon weight="light" className="size-7 sm:size-10" />
                  <span className="text-4xl font-bold leading-none opacity-15 sm:text-7xl">{k + 1}</span>
                </div>
                <div className="mt-4 sm:mt-16">
                  <h3 className="text-2xl font-bold tracking-tight sm:text-3xl">{t(`items.${s.key}.title`)}</h3>
                  <p className="mt-2 opacity-70 sm:mt-3">{t(`items.${s.key}.text`)}</p>
                  <span className="mt-4 inline-block rounded-full bg-current/10 sm:mt-6 px-4 py-1.5 text-xs font-medium ring-1 ring-current/20">{t(`items.${s.key}.status`)}</span>
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

/* ---------- faq ---------- */

function Faq() {
  const t = useTranslations("faq");
  const keys = ["when", "bidding", "bid", "who", "payment", "funds"] as const;
  return (
    <section id="faq" className="relative mx-auto grid max-w-7xl gap-10 px-4 py-12 md:grid-cols-12 md:px-8 md:py-24">
      <div className="md:col-span-5">
        <div className="md:sticky md:top-32">
          <h2 className="text-4xl font-bold tracking-tight text-primary md:text-7xl">
            <span className="block"><SplitWords text={t("title1")} /></span>
            <OutlineFill text={t("title2")} />
          </h2>
          <a href={`mailto:${CONTACT_EMAIL}`} className="mt-6 inline-flex items-center gap-2 py-3 text-sm font-medium text-primary underline decoration-accent decoration-4 underline-offset-8 md:mt-10">
            {t("contact")}
          </a>
        </div>
      </div>
      <div className="space-y-3 md:col-span-7 md:space-y-4">
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
  return (
    <section id="about" className="relative overflow-hidden px-4 pb-12 pt-14 md:px-8 md:pb-24 md:pt-24">
      <FloatingObjects set="about" />
      <div className="relative z-10 mx-auto grid max-w-7xl gap-10 md:grid-cols-12">
        <div className="md:col-span-5">
          <h2 className="text-4xl font-bold tracking-tight text-primary md:text-6xl">
            <span className="block"><SplitWords text={t("title")} /></span> <Highlight delay={0.4}><span className="italic">{t("titleHighlight")}</span></Highlight>
          </h2>
        </div>
        <div className="space-y-5 text-lg leading-relaxed text-muted-foreground md:col-span-7 md:pt-14">
          <p><b className="font-medium text-primary">{t("p1Name")}</b><ScrollWords text={t("p1")} /></p>
        </div>
      </div>
    </section>
  );
}

/* ---------- footer ---------- */

function Footer() {
  const t = useTranslations("footer");
  return (
    <footer className="relative overflow-hidden bg-navy-deep text-primary-foreground">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 pt-12 md:grid-cols-12 md:gap-10 md:px-8 md:pt-24">
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
    <div ref={ref} className="mx-auto mt-8 max-w-7xl px-4 pb-6 md:mt-16 md:px-8">
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
    <div className="px-5 py-4 md:px-7 md:py-6">
      <button onClick={() => setOpen(!open)} aria-expanded={open} className="flex w-full items-center justify-between gap-4 text-left text-lg font-bold tracking-tight text-primary md:text-xl">
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
