import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { motion } from "motion/react";
import { ArrowLeft, ArrowRight, Eye, Gavel } from "@phosphor-icons/react";
import gavel from "@/assets/gavel-3d.png";
import { FloatingObjects } from "@/components/objects";

export const Route = createFileRoute("/lots/$id")({
  beforeLoad: ({ params }) => {
    if (!["1", "2", "3"].includes(params.id)) throw notFound();
  },
  head: ({ params }) => ({
    meta: [
      { title: `Демонстраційний слот ${params.id} · Благодійний аукціон KSE` },
      { name: "description", content: "Сторінка лота благодійного аукціону речей Тимофія Бріка. Фото, назву й стартову ціну додасть Офіс ректора." },
      { property: "og:title", content: `Лот ${params.id} · Аукціон KSE` },
      { property: "og:description", content: "Сторінка лота з'явиться після погодження Офісом ректора." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Lot,
});

const EASE = [0.32, 0.72, 0, 1] as const;

function Lot() {
  const { id } = Route.useParams();
  const n = Number(id);
  const prev = String(n === 1 ? 3 : n - 1);
  const next = String(n === 3 ? 1 : n + 1);
  const rows = [
    ["Стартова ціна", "з'явиться після підтвердження лота"],
    ["Крок ставки", "встановлюється для конкретного лота"],
    ["Фінал", "14 листопада 2026, час уточнюється"],
    ["Формат", "онлайн-завершення торгів"],
  ];
  return (
    <main className="grain relative min-h-[100dvh] overflow-hidden bg-background">
      <FloatingObjects set="about" />
      <header className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-4 pt-6 md:px-8">
        <Link to="/" className="inline-flex items-center gap-2 rounded-full bg-card px-4 py-2 text-sm font-medium text-primary shadow-soft ring-1 ring-primary/10 transition hover:-translate-x-1">
          <ArrowLeft weight="light" /> До вітрини
        </Link>
        <span className="text-sm text-muted-foreground">Демонстраційний слот {id} із 3</span>
      </header>
      <section className="relative z-10 mx-auto grid max-w-7xl gap-10 px-4 py-12 md:grid-cols-12 md:px-8">
        <motion.div
          key={id}
          initial={{ opacity: 0, rotate: -8, y: 60 }}
          animate={{ opacity: 1, rotate: -2, y: 0 }}
          transition={{ type: "spring", stiffness: 70, damping: 14 }}
          className="md:col-span-6"
        >
          <div className="relative grid aspect-[4/5] place-items-center overflow-hidden rounded-[2.25rem] bg-navy-deep dot-grid-light shadow-soft">
            <div className="orb absolute h-72 w-72 rounded-full opacity-30" />
            <span className="text-outline-light text-[14rem] font-bold leading-none">{id}</span>
            <span className="absolute bottom-8 inline-flex items-center gap-2 rounded-full bg-primary-foreground/10 px-4 py-2 text-sm text-primary-foreground/80">
              <Eye weight="light" /> Фото лота буде додано після погодження
            </span>
            <motion.img src={gavel} alt="" animate={{ rotate: [-10, 10, -10] }} transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }} className="absolute right-6 top-6 w-28" />
          </div>
        </motion.div>
        <div className="md:col-span-6 md:pt-8">
          <motion.h1 initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, ease: EASE }} className="text-5xl font-bold tracking-tight text-primary md:text-6xl">
            Назву лота додасть Офіс ректора
          </motion.h1>
          <p className="mt-6 max-w-[48ch] text-lg text-muted-foreground">
            Це місце для справжньої речі з аукціону, без вигаданих предметів, характеристик чи історій.
          </p>
          <dl className="mt-10 divide-y divide-primary/10 rounded-[2rem] bg-card px-6 shadow-soft ring-1 ring-primary/10">
            {rows.map(([a, b], k) => (
              <motion.div key={a} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 + k * 0.08, duration: 0.7, ease: EASE }} className="flex flex-wrap justify-between gap-2 py-5">
                <dt className="font-medium text-primary">{a}</dt>
                <dd className="text-muted-foreground">{b}</dd>
              </motion.div>
            ))}
          </dl>
          <div className="mt-8 rounded-[2rem] bg-accent-soft p-6 ring-1 ring-primary/10">
            <p className="flex items-center gap-2 font-bold text-primary"><Gavel weight="light" /> Ставки ще не приймаються</p>
            <p className="mt-2 text-sm text-muted-foreground">Ставка має перевищувати поточну щонайменше на крок лота. Захищений сервіс ставок підключать до старту.</p>
          </div>
          <nav className="mt-8 flex gap-3">
            <Link to="/lots/$id" params={{ id: prev }} className="inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-medium text-primary ring-1 ring-primary/15 transition hover:bg-primary/5"><ArrowLeft weight="light" /> Слот {prev}</Link>
            <Link to="/lots/$id" params={{ id: next }} className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-medium text-primary-foreground transition hover:translate-x-1">Слот {next} <ArrowRight weight="light" /></Link>
          </nav>
        </div>
      </section>
    </main>
  );
}
