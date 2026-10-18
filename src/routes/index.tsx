import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import {
  ArrowDownRight,
  ArrowLeft,
  ArrowRight,
  Gavel,
  HandPointing,
  Trophy,
  ImageSquare,
  X,
  Plus,
  EnvelopeSimple,
} from "@phosphor-icons/react";
import rector from "@/assets/rector.webp.asset.json";
import { Preloader } from "@/components/Preloader";

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

function Index() {
  const [ready, setReady] = useState(false);
  const [modal, setModal] = useState(false);
  useEffect(() => {
    const on = () => setReady(true);
    document.addEventListener("kse:preloader-exit", on, { once: true });
    const fallback = setTimeout(on, 5000);
    return () => {
      document.removeEventListener("kse:preloader-exit", on);
      clearTimeout(fallback);
    };
  }, []);

  return (
    <div className={ready ? "is-ready" : ""}>
      <Preloader />
      <Nav onBid={() => setModal(true)} />
      <main>
        <Hero />
        <Lots onBid={() => setModal(true)} />
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

function Nav({ onBid }: { onBid: () => void }) {
  const links = [
    ["#lots", "Лоти"],
    ["#how", "Як це працює"],
    ["#report", "Звітність"],
    ["#faq", "Питання"],
  ];
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 md:px-8">
        <a href="#top" className="flex items-center gap-2 font-bold text-primary">
          <span className="rounded-full bg-primary px-3 py-1 text-sm tracking-wide text-primary-foreground">KSE</span>
          <span className="hidden text-sm sm:inline">Charity Auction</span>
        </a>
        <nav className="hidden gap-8 text-sm font-medium text-muted-foreground md:flex">
          {links.map(([h, l]) => (
            <a key={h} href={h} className="transition-colors hover:text-primary">
              {l}
            </a>
          ))}
        </nav>
        <button
          onClick={onBid}
          className="rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground transition active:scale-[0.98] hover:bg-primary/90"
        >
          Зробити ставку
        </button>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section id="top" className="mx-auto grid max-w-7xl gap-10 px-4 pb-20 pt-12 md:grid-cols-12 md:px-8 md:pt-20">
      <div className="md:col-span-7 md:pt-8">
        <h1 className="enter text-5xl font-bold leading-[1.02] tracking-tight text-primary md:text-7xl" style={{ ["--i" as string]: 0 }}>
          Речі ректора.
          <br />
          <span className="relative inline-block">
            <span className="absolute inset-x-[-0.15em] bottom-[0.08em] top-[0.38em] -z-10 rounded-full bg-accent" />
            Спільна справа.
          </span>
        </h1>
        <p className="enter mt-8 max-w-[46ch] text-lg leading-relaxed text-muted-foreground" style={{ ["--i" as string]: 1 }}>
          Благодійний онлайн-аукціон особистих речей Тимофія Бріка, ректора Київської школи економіки.
        </p>
        <div className="enter mt-10 flex flex-wrap items-center gap-6" style={{ ["--i" as string]: 2 }}>
          <a
            href="#lots"
            className="inline-flex items-center gap-2 rounded-full bg-primary px-7 py-4 font-medium text-primary-foreground shadow-soft transition active:scale-[0.98] hover:gap-3"
          >
            Оглянути вітрину <ArrowDownRight weight="bold" />
          </a>
          <div className="flex items-center gap-3">
            <strong className="text-5xl font-bold leading-none text-primary">14</strong>
            <div className="text-sm leading-tight">
              <b className="block text-foreground">листопада 2026</b>
              <span className="text-muted-foreground">фінал, час уточнюється</span>
            </div>
          </div>
        </div>
      </div>
      <div className="enter relative md:col-span-5" style={{ ["--i" as string]: 3 }}>
        <div className="absolute -right-6 -top-6 h-40 w-40 rounded-full bg-accent md:h-56 md:w-56" />
        <figure className="relative overflow-hidden rounded-[var(--radius-large)] bg-primary shadow-soft">
          <img src={rector.url} alt="Тимофій Брік, ректор KSE" className="aspect-[4/5] w-full object-cover" />
          <figcaption className="absolute inset-x-4 bottom-4 rounded-full bg-background/90 px-5 py-3 backdrop-blur">
            <b className="text-primary">Тимофій Брік</b>
            <span className="ml-2 text-sm text-muted-foreground">Ректор KSE</span>
          </figcaption>
        </figure>
      </div>
    </section>
  );
}

function Lots({ onBid }: { onBid: () => void }) {
  const [i, setI] = useState(0);
  const n = 3;
  return (
    <section id="lots" className="bg-primary py-24 text-primary-foreground">
      <div className="mx-auto max-w-7xl px-4 md:px-8">
        <h2 className="max-w-3xl text-4xl font-bold tracking-tight md:text-5xl">На столі речі Тимофія.</h2>
        <p className="mt-4 max-w-[60ch] text-primary-foreground/70">
          Кожен слот відкриватиме окремий лот. Фото, назви й описи з'являться після підтвердження Офісом ректора.
        </p>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {Array.from({ length: n }).map((_, k) => (
            <article
              key={k}
              className={`group flex flex-col rounded-[2rem] bg-primary-foreground/[0.06] p-4 ring-1 ring-primary-foreground/10 transition duration-500 hover:-translate-y-1 hover:ring-accent ${
                k !== i ? "hidden md:flex" : "flex"
              }`}
            >
              <div className="grid aspect-[4/3] place-items-center rounded-[1.5rem] border-2 border-dashed border-accent/40 text-accent">
                <div className="text-center text-sm">
                  <ImageSquare size={40} weight="light" className="mx-auto mb-2" />
                  Фото лота буде додано після погодження
                </div>
              </div>
              <h3 className="mt-5 px-2 text-xl font-bold">Назву лота додасть Офіс ректора</h3>
              <p className="mt-2 px-2 text-sm text-primary-foreground/60">
                Місце для справжньої речі з аукціону. Без вигаданих предметів, характеристик чи історій.
              </p>
              <div className="mt-auto flex items-end justify-between gap-4 px-2 pt-6">
                <div>
                  <span className="text-xs text-primary-foreground/50">Стартова ціна</span>
                  <p className="text-sm font-medium">Після підтвердження</p>
                </div>
                <button
                  onClick={onBid}
                  className="rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-accent-foreground transition active:scale-[0.98]"
                >
                  Ставка
                </button>
              </div>
            </article>
          ))}
        </div>
        <div className="mt-6 flex items-center gap-4 md:hidden">
          <button aria-label="Попередній" onClick={() => setI((i + n - 1) % n)} className="rounded-full bg-primary-foreground/10 p-3">
            <ArrowLeft />
          </button>
          <span className="text-sm text-primary-foreground/70">
            Слот {i + 1} із {n}
          </span>
          <button aria-label="Наступний" onClick={() => setI((i + 1) % n)} className="rounded-full bg-primary-foreground/10 p-3">
            <ArrowRight />
          </button>
        </div>
        <p className="mt-8 text-sm text-primary-foreground/50">
          Три демонстраційні слоти показують роботу вітрини, а не фактичну кількість лотів.
        </p>
      </div>
    </section>
  );
}

function Reveal({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.7, delay, ease: [0.23, 1, 0.32, 1] }}
    >
      {children}
    </motion.div>
  );
}

function Steps() {
  const steps = [
    { icon: HandPointing, t: "Оберіть річ", d: "Перегляньте фото, опис і стартову ціну після публікації каталогу.", s: "Каталог готується" },
    { icon: Gavel, t: "Зробіть ставку", d: "Ставка має перевищувати поточну щонайменше на крок лота.", s: "Сервіс ставок ще не підключено" },
    { icon: Trophy, t: "Дізнайтеся результат", d: "Після фіналу тут з'являться підсумок і звіт про використання коштів.", s: "Підсумок після фіналу" },
  ];
  return (
    <section id="how" className="mx-auto max-w-7xl px-4 py-24 md:px-8">
      <h2 className="text-4xl font-bold tracking-tight text-primary md:text-5xl">Від речі до ставки.</h2>
      <p className="mt-4 max-w-[60ch] text-muted-foreground">
        Короткий шлях без зайвих кроків. Точні правила буде підтверджено до старту аукціону.
      </p>
      <div className="mt-14 space-y-4">
        {steps.map((s, k) => (
          <Reveal key={s.t} delay={k * 0.08}>
            <div
              className="flex flex-col gap-4 rounded-full bg-card px-6 py-5 shadow-soft md:flex-row md:items-center md:gap-8 md:px-8 max-md:rounded-[2rem]"
              style={{ marginLeft: `min(${k * 8}%, ${k * 6}rem)` }}
            >
              <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-accent text-accent-foreground">
                <s.icon size={26} weight="bold" />
              </span>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-primary">{s.t}</h3>
                <p className="text-muted-foreground">{s.d}</p>
              </div>
              <span className="rounded-full bg-muted px-4 py-1.5 text-xs font-medium text-muted-foreground">{s.s}</span>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

function Report() {
  const rows = [
    ["Напрям допомоги", "уточнюється"],
    ["Цільова сума", "уточнюється"],
    ["Реквізити", "уточнюються"],
    ["Використання коштів", "після фіналу"],
  ];
  return (
    <section id="report" className="mx-auto max-w-7xl px-4 pb-24 md:px-8">
      <div className="grid gap-8 rounded-[var(--radius-large)] bg-accent-soft p-8 md:grid-cols-2 md:p-14">
        <Reveal>
          <h2 className="text-4xl font-bold tracking-tight text-primary md:text-5xl">Збір має бути прозорим.</h2>
          <p className="mt-5 max-w-[48ch] text-muted-foreground">
            Після фіналу тут буде опубліковано підсумок збору та звіт про використання коштів. Без неперевірених цифр.
          </p>
          <p className="mt-6 text-sm font-medium text-primary">Деталі збирає Офіс ректора KSE</p>
        </Reveal>
        <Reveal delay={0.1}>
          <div className="rounded-[2rem] bg-card p-6 shadow-soft">
            <h3 className="mb-4 font-bold text-primary">Звіт про збір</h3>
            <div className="grid grid-cols-2 gap-3">
              {rows.map(([a, b]) => (
                <div key={a} className="rounded-2xl bg-muted p-4">
                  <p className="text-sm font-medium text-foreground">{a}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{b}</p>
                </div>
              ))}
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function useCountdown() {
  const [days, setDays] = useState<number | null>(null);
  useEffect(() => {
    const calc = () => setDays(Math.max(0, Math.ceil((FINAL.getTime() - Date.now()) / 86400000)));
    calc();
    const t = setInterval(calc, 60000);
    return () => clearInterval(t);
  }, []);
  return days;
}

function Final() {
  const days = useCountdown();
  return (
    <section className="bg-primary py-24 text-primary-foreground">
      <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 md:grid-cols-12 md:px-8">
        <div className="md:col-span-7">
          <h2 className="text-4xl font-bold tracking-tight md:text-6xl">
            14 листопада <span className="text-accent">фінал аукціону.</span>
          </h2>
          <p className="mt-6 max-w-[52ch] text-primary-foreground/70">
            Онлайн-завершення торгів є основним форматом. Можливість зустрічі на кампусі уточнюється.
          </p>
        </div>
        <div className="md:col-span-5">
          <div className="mx-auto w-full max-w-xs overflow-hidden rounded-[2rem] bg-card text-card-foreground shadow-soft">
            <div className="bg-accent py-3 text-center text-sm font-bold text-accent-foreground">листопад 2026</div>
            <div className="py-8 text-center">
              <div className="text-8xl font-bold leading-none text-primary">14</div>
              <p className="mt-3 text-sm text-muted-foreground">Час фіналу уточнюється</p>
            </div>
            <div className="border-t border-border py-4 text-center text-sm font-medium text-primary">
              {days === null ? "\u00a0" : `${days} днів до фіналу`}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Faq() {
  const qs = [
    ["Коли відкриється аукціон?", "Публічний старт орієнтовно запланований на початок листопада. Точну дату підтвердить Офіс ректора."],
    ["Чому тут поки немає фото й цін?", "Оригінальні фото, назви, описи та стартові ціни має передати й погодити Офіс ректора. Ми не підставляємо вигадані речі."],
    ["Як працюватиме ставка?", "Ставка має бути вищою за поточну щонайменше на крок лота. Захищений сервіс ставок підключать до старту."],
    ["Куди підуть кошти?", "Благодійний напрям і рахунок збору ще уточнюються. Їх опублікують після підтвердження разом зі звітом."],
  ];
  return (
    <section id="faq" className="mx-auto grid max-w-7xl gap-10 px-4 py-24 md:grid-cols-12 md:px-8">
      <h2 className="text-4xl font-bold tracking-tight text-primary md:col-span-4 md:text-5xl">Питання, які важливі.</h2>
      <div className="space-y-3 md:col-span-8">
        {qs.map(([q, a]) => (
          <details key={q} className="group rounded-[1.75rem] bg-card px-6 py-5 shadow-soft">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-lg font-bold text-primary">
              {q}
              <Plus className="shrink-0 transition-transform duration-300 group-open:rotate-45" weight="bold" />
            </summary>
            <p className="mt-3 text-muted-foreground">{a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 md:grid-cols-3 md:px-8">
        <p className="text-sm text-muted-foreground md:col-span-2 max-w-[50ch]">
          Благодійний аукціон особистих речей Тимофія Бріка. Матеріали, умови та результати з'являтимуться після
          підтвердження Офісом ректора.
        </p>
        <div className="text-sm">
          <p className="font-bold text-primary">Зв'язок з Офісом ректора</p>
          <a href={`mailto:${EMAIL}`} className="mt-1 block text-muted-foreground hover:text-primary">{EMAIL}</a>
          <p className="text-muted-foreground">Київ, вул. Миколи Шпака, 3</p>
          <a href="https://kse.ua" target="_blank" rel="noreferrer" className="mt-3 inline-block font-medium text-primary underline-offset-4 hover:underline">
            Офіційний сайт KSE
          </a>
        </div>
      </div>
    </footer>
  );
}

function BidModal({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    addEventListener("keydown", k);
    return () => removeEventListener("keydown", k);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-primary/60 p-4 backdrop-blur-sm" onClick={onClose}>
      <motion.div
        role="dialog"
        aria-modal="true"
        initial={{ opacity: 0, y: 20, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 24 }}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md rounded-[2rem] bg-card p-8 shadow-soft"
      >
        <button aria-label="Закрити" onClick={onClose} className="absolute right-5 top-5 rounded-full bg-muted p-2 text-primary">
          <X weight="bold" />
        </button>
        <span className="grid h-14 w-14 place-items-center rounded-full bg-accent text-accent-foreground">
          <Gavel size={26} weight="bold" />
        </span>
        <h3 className="mt-5 text-2xl font-bold text-primary">Ставки ще не приймаються.</h3>
        <p className="mt-3 text-muted-foreground">
          Сайт не збирає персональні дані, не надсилає ставки й не приймає платежі. Лоти та правила буде додано після
          підтвердження.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <a href={`mailto:${EMAIL}`} className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-medium text-primary-foreground">
            <EnvelopeSimple weight="bold" /> Написати Офісу
          </a>
          <button onClick={onClose} className="rounded-full bg-muted px-5 py-3 text-sm font-medium text-primary">
            Зрозуміло
          </button>
        </div>
      </motion.div>
    </div>
  );
}
