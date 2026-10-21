import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { FloatingObjects } from "@/components/objects";
import { useEffect, useState, type ReactNode, type CSSProperties } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import {
  ArrowUpRight,
  Gavel,
  HandPointing,
  Trophy,
  X,
  Plus,
  EnvelopeSimple,
  Eye,
  Sparkle,
  Asterisk,
} from "@phosphor-icons/react";
import rector from "@/assets/rector.webp.asset.json";
import gavel from "@/assets/gavel-3d.png";
import { Preloader } from "@/components/Preloader";
import { BrandLogo } from "@/components/BrandLogo";
import { ClosedWindow } from "@/components/ClosedWindow";
import { SplitWords, Highlight, OutlineFill, Magnetic, VelocityMarquee, RollDigits, EASE } from "@/components/fx";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Речі ректора. Спільна справа. Благодійний аукціон KSE" },
      {
        name: "description",
        content:
          "Благодійний онлайн-аукціон особистих речей Тимофія Бріка, ректора KSE. Фінал 14 листопада 2026 року.",
      },
      { property: "og:title", content: "Речі ректора. Спільна справа." },
      {
        property: "og:description",
        content: "Благодійний онлайн-аукціон особистих речей Тимофія Бріка. Фінал 14.11.2026.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const FINAL = new Date("2026-11-14T12:00:00+02:00");
const EMAIL = "ashmaliuk@kse.org.ua";
const i = (n: number) => ({ ["--i" as string]: n }) as CSSProperties;

function Index() {
  const [ready, setReady] = useState(false);
  const [modal, setModal] = useState(false);
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
  const bid = () => setModal(true);

  return (
    <div className={`grain overflow-x-clip ${ready ? "is-ready" : ""}`}>
      <Preloader />
      <Nav onBid={bid} />
      <ClosedWindow />
      <main>
        <Hero onBid={bid} />
        <Marquee />
        <About />
        <Lots onBid={bid} />
        <Steps />
        <Report />
        <Final />
        <Faq />
      </main>
      <Footer />
      {modal && <BidModal onClose={() => setModal(false)} />}
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

function Bezel({ children, className = "", core = "bg-card", dark = false }: { children: ReactNode; className?: string; core?: string; dark?: boolean }) {
  return (
    <div className={`rounded-[2.25rem] p-1.5 ring-1 ${dark ? "bg-primary-foreground/5 ring-primary-foreground/10" : "bg-primary/[0.04] ring-primary/10"} ${className}`}>
      <div className={`h-full rounded-[calc(2.25rem-0.375rem)] shadow-[inset_0_1px_1px_color-mix(in_oklab,var(--primary-foreground)_40%,transparent)] ${core}`}>
        {children}
      </div>
    </div>
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
  return <Magnetic>{href ? <a href={href} className={c}>{body}</a> : <Button onClick={onClick} className={`${c} h-auto`}>{body}</Button>}</Magnetic>;
}

/* ---------- nav ---------- */

function Nav({ onBid }: { onBid: () => void }) {
  const [open, setOpen] = useState(false);
  const links = [
    ["#about", "Про аукціон"],
    ["#lots", "Лоти"],
    ["#how", "Як це працює"],
    ["#report", "Звітність"],
    ["#faq", "Питання"],
  ];
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
            <Button onClick={onBid} className="hidden h-auto rounded-full px-5 py-2.5 transition active:scale-[0.98] sm:inline-flex">
              Зробити ставку
            </Button>
            <Button variant="ghost" size="icon" aria-label="Меню" aria-expanded={open} aria-controls="mobile-menu" onClick={() => setOpen(!open)} className="relative h-10 w-10 shrink-0 rounded-full bg-primary/5 lg:hidden">
              <span className={`absolute left-3 right-3 h-[1.5px] bg-primary transition-transform duration-500 ease-spring ${open ? "top-1/2 rotate-45" : "top-[15px]"}`} />
              <span className={`absolute left-3 right-3 h-[1.5px] bg-primary transition-transform duration-500 ease-spring ${open ? "top-1/2 -rotate-45" : "top-[23px]"}`} />
            </Button>
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
  const text = "БЛАГОДІЙНИЙ АУКЦІОН KSE • РЕЧІ РЕКТОРА • ";
  return (
    <div className="relative grid h-32 w-32 place-items-center rounded-full bg-accent text-accent-foreground shadow-soft md:h-36 md:w-36">
      <svg viewBox="0 0 100 100" className="animate-spin-slow absolute inset-0">
        <defs>
          <path id="circ" d="M50,50 m-38,0 a38,38 0 1,1 76,0 a38,38 0 1,1 -76,0" />
        </defs>
        <text className="fill-current text-[8.4px] font-bold tracking-[0.12em]">
          <textPath href="#circ">{text}</textPath>
        </text>
      </svg>
      <Gavel size={34} weight="light" />
    </div>
  );
}

function Hero({ onBid }: { onBid: () => void }) {
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
            Благодійний аукціон KSE
          </div>
          <h1 className="hero-title font-bold text-primary">
            <span className="enter block" style={i(1)}>Речі ректора.</span>
            <span className="enter hero-outline block" style={i(2)}>Спільна</span>
            <span className="enter block" style={i(3)}><span className="hero-highlight">справа.</span></span>
          </h1>
          <p className="enter hero-description text-muted-foreground" style={i(4)}>
            Особисті речі Тимофія Бріка, ректора Київської школи економіки. Історії, що стають частиною спільної справи.
          </p>
          <div className="enter hero-actions flex flex-wrap items-center gap-3" style={i(5)}>
            <PillCta href="#lots">Переглянути лоти</PillCta>
            <Button variant="ghost" onClick={onBid} className="h-auto rounded-full px-3 py-3 text-primary">Як зробити ставку <ArrowUpRight weight="light" /></Button>
          </div>
          <div className="enter hero-details grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-t border-primary/15" style={i(6)}>
            <span className="min-w-0 text-xs text-muted-foreground">Каталог готується</span>
            <span className="text-xs font-medium text-primary">Фінал <b className="ml-2">14.11.2026</b></span>
          </div>
        </div>
        <div className="hero-visual relative min-w-0">
          <motion.figure style={reduce ? {} : { y: yImg }} className="enter hero-portrait relative" >
            <img src={rector.url} alt="Тимофій Брік, ректор KSE" fetchPriority="high" className="h-full w-full object-cover" />
            <figcaption className="hero-caption absolute bg-primary text-primary-foreground">
              <b className="block">Тимофій Брік</b>
              <span className="text-xs text-primary-foreground/70">ректор Київської школи економіки</span>
            </figcaption>
          </motion.figure>
          <div className="hero-badge absolute"><RotatingBadge /></div>
          <motion.div style={reduce ? {} : { y: yGavel }} className="hero-gavel pointer-events-none absolute">
            <img src={gavel} alt="" width={1024} height={1024} className="animate-floaty w-full" />
          </motion.div>
          <div className="enter hero-ticket absolute bg-accent text-accent-foreground" style={i(6)}>
            <span className="text-3xl font-bold leading-none">14</span>
            <span className="text-xs leading-snug"><b className="block">листопада 2026</b>фінал аукціону</span>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------- marquee ---------- */

function Marquee() {
  const items = ["Речі ректора", "Спільна справа", "14.11.2026", "Благодійний аукціон KSE", "Прозорий звіт"];
  const row = [...items, ...items];
  return (
    <div className="relative z-10 overflow-hidden bg-accent py-3 md:py-4 text-accent-foreground shadow-soft">
      <VelocityMarquee>
        {[0].map((r) => (
          <div key={r} className="flex shrink-0 items-center">
            {row.map((t, k) => (
              <span key={k} className="flex items-center gap-5 px-5 text-xl font-bold md:text-3xl whitespace-nowrap">
                {t}
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

function LotTag({ k, onBid }: { k: number; onBid: () => void }) {
  const tilt = ["md:-rotate-[5deg] md:translate-y-10", "md:rotate-[2deg] md:-translate-y-4", "md:-rotate-[1deg] md:translate-y-16"][k];
  return (
    <div className={`group transition-transform duration-700 ease-spring hover:z-10 md:hover:-translate-y-6 md:hover:rotate-0 ${tilt}`}>
      <Bezel dark core="relative overflow-hidden bg-navy-deep">
        {/* tag hole */}
        <div className="absolute left-1/2 top-4 z-10 h-4 w-4 -translate-x-1/2 rounded-full bg-primary ring-4 ring-primary-foreground/10" />
        <div className="relative m-3 mt-12 grid aspect-[4/5] place-items-center overflow-hidden rounded-[1.6rem] dot-grid-light">
          <div className="orb absolute h-40 w-40 rounded-full opacity-25 transition-transform duration-1000 ease-spring group-hover:scale-150" />
          {/* "covered lot" cloth */}
          <div className="relative text-center">
            <span className="text-outline-light block text-[9rem] font-bold leading-none">{k + 1}</span>
            <span className="mt-2 inline-flex items-center gap-2 rounded-full bg-primary-foreground/10 px-4 py-2 text-xs text-primary-foreground/80 backdrop-blur">
              <Eye weight="light" /> Фото після погодження
            </span>
          </div>
        </div>
        <div className="px-6 pb-6 text-primary-foreground">
          <h3 className="text-xl font-bold">Назву лота додасть Офіс ректора</h3>
          <p className="mt-2 text-sm text-primary-foreground/55">Без вигаданих предметів, характеристик чи історій.</p>
          <div className="mt-6 flex items-center justify-between">
            <div>
              <span className="text-[10px] uppercase tracking-[0.2em] text-primary-foreground/40">Старт</span>
              <p className="text-sm font-medium">після підтвердження</p>
            </div>
            <button onClick={onBid} aria-label="Зробити ставку" className="grid h-12 w-12 place-items-center rounded-full bg-accent text-accent-foreground transition-transform duration-500 ease-spring group-hover:rotate-45 active:scale-95">
              <Plus weight="bold" />
            </button>
          </div>
        </div>
      </Bezel>
    </div>
  );
}

function Lots({ onBid }: { onBid: () => void }) {
  return (
    <section id="lots" className="relative overflow-hidden bg-primary pb-20 pt-24 text-primary-foreground">
      <div className="orb pointer-events-none absolute -right-40 top-20 h-[34rem] w-[34rem] rounded-full opacity-30" />
      <span aria-hidden className="text-outline-light pointer-events-none absolute -left-6 top-24 select-none text-[22vw] font-bold leading-none opacity-60">
        ЛОТИ
      </span>
      <div className="relative mx-auto max-w-7xl px-4 md:px-8">
        <Reveal className="max-w-2xl md:ml-auto md:text-right">
          <h2 className="text-5xl font-bold tracking-tight md:text-7xl">
            <SplitWords text="На столі" /> <span className="text-accent"><SplitWords text="речі" delay={0.14} /></span>{" "}
            <SplitWords text="Тимофія." delay={0.21} />
          </h2>
          <p className="mt-6 text-primary-foreground/65 md:ml-auto md:max-w-[44ch]">
            Кожен слот відкриватиме окремий лот. Фото, назви й описи з'являться після підтвердження Офісом ректора.
          </p>
        </Reveal>
        <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6">
          {[0, 1, 2].map((k) => (
            <motion.div
              key={k}
              initial={{ opacity: 0, x: (1 - k) * 260, y: 120, rotate: (k - 1) * -18, scale: 0.9 }}
              whileInView={{ opacity: 1, x: 0, y: 0, rotate: 0, scale: 1 }}
              viewport={{ once: true, amount: 0, margin: "0px" }}
              transition={{ type: "spring", stiffness: 70, damping: 16, mass: 1.1, delay: 0.15 + k * 0.12 }}
            >
              <LotTag k={k} onBid={onBid} />
              <Link to="/lots/$id" params={{ id: String(k + 1) }} className="mt-4 flex items-center justify-between rounded-full px-5 py-3 text-sm text-primary-foreground/70 ring-1 ring-primary-foreground/15 transition hover:bg-primary-foreground/10 hover:text-accent">Демонстраційний слот {k + 1} із 3 <ArrowUpRight weight="light" /></Link>
            </motion.div>
          ))}
        </div>
        <p className="mt-12 flex items-center gap-2 text-sm text-primary-foreground/45">
          <Sparkle weight="light" /> Три демонстраційні слоти показують роботу вітрини, а не фактичну кількість лотів.
        </p>
      </div>
    </section>
  );
}

/* ---------- steps: rising bid ladder ---------- */

function Steps() {
  const steps = [
    { icon: HandPointing, t: "Оберіть річ", d: "Фото, опис і стартова ціна з'являться у підтвердженому каталозі.", s: "Каталог готується", h: "lg:h-[22rem]" },
    { icon: Gavel, t: "Зробіть ставку", d: "Ставка має перевищувати поточну щонайменше на крок лота.", s: "Сервіс ще не підключено", h: "lg:h-[26rem]" },
    { icon: Trophy, t: "Дізнайтеся результат", d: "Після фіналу тут з'являться підсумок і звіт про кошти.", s: "Після фіналу", h: "lg:h-[30rem]" },
  ];
  return (
    <section id="how" className="relative overflow-hidden py-16 md:py-24">
      <FloatingObjects set="how" />
      <div className="mx-auto max-w-7xl px-4 md:px-8">
        <Reveal>
          <h2 className="text-5xl font-bold tracking-tight text-primary md:text-7xl">
            <span className="block"><SplitWords text="Від речі" /></span>
            <OutlineFill text="до ставки." />
          </h2>
          <p className="mt-6 max-w-[48ch] text-muted-foreground">Кожен крок вище за попередній, як і ставки. Точні правила підтвердять до старту.</p>
        </Reveal>
        <div className="mt-16 grid items-end gap-5 lg:grid-cols-3">
          {steps.map((s, k) => (
            <motion.div
              key={s.t}
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
                  <h3 className="text-3xl font-bold tracking-tight">{s.t}</h3>
                  <p className="mt-3 opacity-70">{s.d}</p>
                  <span className="mt-6 inline-block rounded-full bg-current/10 px-4 py-1.5 text-xs font-medium ring-1 ring-current/20">{s.s}</span>
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
  return (
    <section id="report" className="px-4 pb-16 md:px-8">
      <div className="mx-auto grid max-w-7xl gap-5 md:grid-cols-12 md:grid-rows-2">
        <Reveal className="md:col-span-7 md:row-span-2">
          <Bezel core="relative h-full overflow-hidden bg-accent-soft p-6 sm:p-10 lg:p-14">
            <div className="orb absolute -bottom-24 -right-24 h-80 w-80 rounded-full opacity-60" />
            <span aria-hidden className="text-outline pointer-events-none absolute -right-6 bottom-6 select-none text-[9rem] font-bold leading-none opacity-30 md:text-[12rem]">ЗБІР</span>
            <motion.img src={gavel} alt="" aria-hidden animate={{ rotate: [-14, 8, -14], y: [0, -10, 0] }} transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }} className="pointer-events-none absolute right-8 top-8 hidden w-28 md:block" />
            <span className="inline-flex rounded-full bg-primary/5 px-3 py-1 text-[10px] font-medium uppercase tracking-[0.2em] text-primary ring-1 ring-primary/10">Звітність</span>
            <h2 className="relative mt-8 text-4xl font-bold text-primary lg:text-6xl">
              <SplitWords text="Збір має бути" /> <Highlight delay={0.5}><span className="italic">прозорим.</span></Highlight>
            </h2>
            <p className="relative mt-6 max-w-[42ch] text-muted-foreground">
              Після фіналу тут з'являться підсумок збору та звіт про використання коштів. Без неперевірених цифр.
            </p>
            <p className="relative mt-16 text-sm font-medium text-primary">Деталі збирає Офіс ректора KSE</p>
          </Bezel>
        </Reveal>
        {[
          ["Напрям допомоги", "уточнюється", "bg-primary text-primary-foreground"],
          ["Цільова сума", "уточнюється", "bg-card"],
        ].map(([a, b, c], k) => (
          <Reveal key={a} delay={0.1 + k * 0.1} className="md:col-span-5">
            <Bezel core={`flex h-full min-h-44 items-end justify-between p-8 ${c}`}>
              <div>
                <p className="text-2xl font-bold tracking-tight">{a}</p>
                <p className="mt-1 text-sm opacity-60">{b}</p>
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
      const ms = Math.max(0, FINAL.getTime() - Date.now());
      setLeft({ d: Math.floor(ms / 864e5), h: Math.floor(ms / 36e5) % 24, m: Math.floor(ms / 6e4) % 60, s: Math.floor(ms / 1e3) % 60 });
    };
    calc();
    const t = setInterval(calc, 1000);
    return () => clearInterval(t);
  }, []);
  return left;
}

function Final() {
  const left = useCountdown();
  const units: [keyof NonNullable<typeof left>, string][] = [["d", "днів"], ["h", "годин"], ["m", "хвилин"], ["s", "секунд"]];
  return (
    <section className="relative overflow-hidden bg-primary py-16 text-primary-foreground md:py-24">
      <div className="dot-grid-light absolute inset-0" />
      <FloatingObjects set="final" />
      <div className="relative mx-auto grid max-w-7xl items-center gap-16 px-4 md:grid-cols-12 md:px-8">
        <Reveal className="md:col-span-7">
          <h2 className="text-6xl font-bold leading-[0.95] tracking-tight md:text-8xl">
            <span className="block"><SplitWords text="Фінал" /></span>
            <OutlineFill text="14.11" light />
          </h2>
          <p className="mt-8 max-w-[44ch] text-primary-foreground/65">
            Онлайн-завершення торгів є основним форматом. Можливість зустрічі на кампусі уточнюється.
          </p>
          <div className="mt-12 grid max-w-xl grid-cols-4 gap-3">
            {units.map(([k, l]) => (
              <div key=
                {k} className="rounded-3xl bg-primary-foreground/5 p-2 sm:p-4 text-center ring-1 ring-primary-foreground/10">
                <div className="text-2xl font-bold tabular-nums lg:text-5xl">{left ? <RollDigits value={String(left[k]).padStart(2, "0")} /> : "--"}</div>
                <div className="mt-1 text-[10px] uppercase tracking-[0.2em] text-primary-foreground/45">{l}</div>
              </div>
            ))}
          </div>
          <p className="mt-4 text-xs text-primary-foreground/40">Точний час фіналу уточнюється.</p>
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
                  <p className="text-sm font-bold uppercase tracking-[0.2em]">листопад 2026</p>
                  <div className="text-[9rem] font-bold leading-none tracking-tighter">14</div>
                  <p className="text-sm text-muted-foreground">субота</p>
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
  const qs = [
    ["Коли відкриється аукціон?", "Публічний старт орієнтовно запланований на початок листопада. Точну дату підтвердить Офіс ректора."],
    ["Чому тут поки немає фото й цін?", "Оригінальні фото, назви, описи та стартові ціни має передати й погодити Офіс ректора. Ми не підставляємо вигадані речі."],
    ["Як працюватиме ставка?", "Ставка має бути вищою за поточну щонайменше на крок лота. Захищений сервіс ставок підключать до старту."],
    ["Хто може взяти участь?", "Аукціон відкритий для всіх охочих: студентів, випускників, партнерів і друзів KSE. Умови реєстрації оголосять до старту."],
    ["Чи буде офлайн-подія?", "Основний формат - онлайн-завершення торгів. Можливість зустрічі на кампусі KSE уточнюється."],
    ["Як отримати виграний лот?", "Порядок оплати й передачі речі переможцю погодить Офіс ректора і опублікує разом із правилами."],
    ["Куди підуть кошти?", "Благодійний напрям і рахунок збору ще уточнюються. Їх опублікують після підтвердження разом зі звітом."],
  ];
  return (
    <section id="faq" className="relative mx-auto grid max-w-7xl gap-10 px-4 py-16 md:grid-cols-12 md:px-8 md:py-24">
      <div className="md:col-span-5">
        <div className="md:sticky md:top-32">
          <h2 className="text-5xl font-bold tracking-tight text-primary md:text-7xl">
            <span className="block"><SplitWords text="Питання," /></span>
            <OutlineFill text="які важливі." />
          </h2>
          <a href={`mailto:${EMAIL}`} className="mt-10 inline-flex items-center gap-2 text-sm font-medium text-primary underline decoration-accent decoration-4 underline-offset-8">
            Не знайшли відповідь? Напишіть нам
          </a>
        </div>
      </div>
      <div className="space-y-4 md:col-span-7">
        {qs.map(([q, a], k) => (
          <Reveal key={q} delay={k * 0.06}>
            <Bezel>
              <FaqItem q={q ?? ""} a={a ?? ""} />
            </Bezel>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

/* ---------- about ---------- */

function About() {
  const facts = [
    ["01", "Особисті речі", "Кожен лот - річ, що має історію поруч із ректором KSE."],
    ["02", "Онлайн-торги", "Ставки з будь-якої точки світу, без зайвих кроків."],
    ["03", "Відкритий звіт", "Підсумок збору й використання коштів - публічно."],
    ["04", "Фінал 14.11", "Завершення торгів 14 листопада 2026 року."],
  ];
  return (
    <section id="about" className="relative overflow-hidden px-4 pb-8 pt-20 md:px-8 md:pt-24">
      <FloatingObjects set="about" />
      <div className="mx-auto grid max-w-7xl gap-10 md:grid-cols-12">
        <div className="md:col-span-5">
          <span className="inline-flex rounded-full bg-primary/5 px-3 py-1 text-[10px] font-medium uppercase tracking-[0.2em] text-primary ring-1 ring-primary/10">Про аукціон</span>
          <h2 className="mt-6 text-4xl font-bold tracking-tight text-primary md:text-6xl">
            <span className="block"><SplitWords text="Речі з історією" /></span> <Highlight delay={0.4}><span className="italic">для доброї справи.</span></Highlight>
          </h2>
        </div>
        <div className="space-y-5 text-lg leading-relaxed text-muted-foreground md:col-span-7 md:pt-14">
          <Reveal><p><b className="font-medium text-primary">Тимофій Брік</b>, ректор Київської школи економіки, передає на благодійний аукціон свої особисті речі. Кожна з них стане окремим лотом, а всі кошти від торгів підуть на спільну справу.</p></Reveal>
          <Reveal delay={0.08}><p>Ми хочемо, щоб участь була простою, а результат - прозорим: фото, описи й стартові ціни публікуються лише після погодження Офісом ректора, а після фіналу тут з'явиться звіт про збір.</p></Reveal>
        </div>
      </div>
      <div className="mx-auto mt-12 grid max-w-7xl gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {facts.map(([n, t, d], k) => (
          <Reveal key={n} delay={k * 0.07}>
            <Bezel core="group h-full bg-card p-6 transition-colors duration-500 hover:bg-accent-soft">
              <span className="text-outline text-4xl font-bold leading-none">{n}</span>
              <p className="mt-6 text-xl font-bold tracking-tight text-primary">{t}</p>
              <p className="mt-2 text-sm text-muted-foreground">{d}</p>
            </Bezel>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

/* ---------- footer ---------- */

function Footer() {
  return (
    <footer className="relative overflow-hidden bg-navy-deep text-primary-foreground">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 pt-24 md:grid-cols-12 md:px-8">
        <div className="md:col-span-6">
          <p className="text-3xl font-bold tracking-tight md:text-4xl">Маєте питання щодо аукціону?</p>
          <div className="mt-8">
            <PillCta href={`mailto:${EMAIL}`} variant="accent">Написати Офісу ректора</PillCta>
          </div>
        </div>
        <div className="space-y-1 text-sm text-primary-foreground/60 md:col-span-3">
          <p className="font-bold text-primary-foreground">Контакти</p>
          <a href={`mailto:${EMAIL}`} className="block hover:text-accent">{EMAIL}</a>
          <p>Київ, вул. Миколи Шпака, 3</p>
        </div>
        <div className="space-y-1 text-sm text-primary-foreground/60 md:col-span-3">
          <p className="font-bold text-primary-foreground">KSE</p>
          <a href="https://kse.ua" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:text-accent">
            Офіційний сайт <ArrowUpRight weight="light" />
          </a>
          <p className="pt-3 text-xs text-primary-foreground/40">Матеріали та результати з'являтимуться після підтвердження Офісом ректора.</p>
        </div>
      </div>
      <div aria-hidden className="text-outline-light mt-16 select-none text-center text-[34vw] font-bold leading-[0.75] tracking-tighter">
        KSE
      </div>
    </footer>
  );
}

/* ---------- modal ---------- */

function BidModal({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    addEventListener("keydown", k);
    return () => removeEventListener("keydown", k);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-primary/60 p-4 backdrop-blur-md" onClick={onClose}>
      <motion.div
        role="dialog"
        aria-modal="true"
        initial={{ opacity: 0, y: 40, scale: 0.94, rotate: -2 }}
        animate={{ opacity: 1, y: 0, scale: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 220, damping: 22 }}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md"
      >
        <Bezel core="relative overflow-hidden bg-card p-8">
          <div className="orb absolute -right-16 -top-16 h-48 w-48 rounded-full opacity-50" />
          <button aria-label="Закрити" onClick={onClose} className="absolute right-5 top-5 grid h-10 w-10 place-items-center rounded-full bg-primary/5 text-primary">
            <X weight="light" />
          </button>
          <img src={gavel} alt="" width={1024} height={1024} className="relative -ml-2 w-28" />
          <h3 className="relative mt-2 text-3xl font-bold tracking-tight text-primary">Ставки ще не приймаються.</h3>
          <p className="relative mt-3 text-muted-foreground">
            Сайт не збирає персональні дані, не надсилає ставки й не приймає платежі. Лоти та правила буде додано після підтвердження.
          </p>
          <div className="relative mt-8 flex flex-wrap items-center gap-3">
            <PillCta href={`mailto:${EMAIL}`}>
              <span className="inline-flex items-center gap-2"><EnvelopeSimple weight="light" /> Написати</span>
            </PillCta>
            <button onClick={onClose} className="rounded-full px-5 py-3 text-sm font-medium text-primary ring-1 ring-primary/15">
              Зрозуміло
            </button>
          </div>
        </Bezel>
      </motion.div>
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
