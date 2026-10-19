import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import { useRef } from "react";

/** Auction props drawn in SVG: price tag, coin, paddle, ticket, magnifier. Each drifts on its own loop and parallaxes with scroll. */
const Tag = () => (
  <svg viewBox="0 0 120 70" className="h-full w-full"><path d="M20 4h92a4 4 0 0 1 4 4v54a4 4 0 0 1-4 4H20L2 35Z" className="fill-accent stroke-primary" strokeWidth="2.5" /><circle cx="20" cy="35" r="5" className="fill-background stroke-primary" strokeWidth="2.5" /><path d="M40 28h56M40 42h36" className="stroke-primary" strokeWidth="5" strokeLinecap="round" /></svg>
);
const Coin = () => (
  <svg viewBox="0 0 80 80" className="h-full w-full"><circle cx="40" cy="40" r="36" className="fill-primary" /><circle cx="40" cy="40" r="27" className="fill-none stroke-accent" strokeWidth="3" strokeDasharray="4 5" /><text x="40" y="49" textAnchor="middle" className="fill-accent" fontSize="26" fontWeight="700">₴</text></svg>
);
const Paddle = () => (
  <svg viewBox="0 0 70 120" className="h-full w-full"><rect x="30" y="58" width="10" height="58" rx="5" className="fill-primary" /><circle cx="35" cy="34" r="31" className="fill-card stroke-primary" strokeWidth="3" /><text x="35" y="45" textAnchor="middle" className="fill-primary" fontSize="28" fontWeight="700">14</text></svg>
);
const Ticket = () => (
  <svg viewBox="0 0 120 60" className="h-full w-full"><path d="M4 4h112v18a8 8 0 0 0 0 16v18H4V38a8 8 0 0 0 0-16Z" className="fill-card stroke-primary" strokeWidth="2.5" /><path d="M84 8v44" className="stroke-primary" strokeWidth="2" strokeDasharray="4 4" /><text x="44" y="38" textAnchor="middle" className="fill-primary" fontSize="16" fontWeight="700">ЛОТ</text></svg>
);
const Spark = () => (
  <svg viewBox="0 0 60 60" className="h-full w-full"><path d="M30 2c3 18 10 25 28 28-18 3-25 10-28 28-3-18-10-25-28-28C20 27 27 20 30 2Z" className="fill-accent stroke-primary" strokeWidth="2" /></svg>
);

const SETS = {
  about: [
    { C: Tag, c: "right-[4%] top-10 w-28 md:w-36", r: -14, d: 7 },
    { C: Coin, c: "left-[46%] top-6 w-12 md:w-16", r: 10, d: 5 },
    { C: Spark, c: "right-[30%] bottom-4 w-8 md:w-10", r: 0, d: 4 },
  ],
  how: [
    { C: Paddle, c: "right-[6%] top-12 w-16 md:w-24", r: 12, d: 6 },
    { C: Ticket, c: "right-[26%] top-28 hidden w-32 md:block", r: -8, d: 8 },
    { C: Coin, c: "left-[40%] top-10 w-10", r: -6, d: 5 },
  ],
  final: [
    { C: Coin, c: "left-[6%] bottom-10 w-14 md:w-20", r: 8, d: 6 },
    { C: Spark, c: "left-[52%] top-10 w-10", r: 0, d: 4 },
    { C: Tag, c: "right-[8%] bottom-6 hidden w-28 md:block", r: 18, d: 7 },
  ],
} as const;

export function FloatingObjects({ set }: { set: keyof typeof SETS }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y1 = useTransform(scrollYProgress, [0, 1], [60, -60]);
  const y2 = useTransform(scrollYProgress, [0, 1], [-30, 90]);
  return (
    <div ref={ref} aria-hidden className="pointer-events-none absolute inset-0 z-0">
      {SETS[set].map(({ C, c, r, d }, k) => (
        <motion.div key={k} style={{ y: k % 2 ? y2 : y1 }} className={`absolute ${c}`}>
          <motion.div
            initial={{ opacity: 0, scale: 0.4, rotate: r - 40 }}
            whileInView={{ opacity: 1, scale: 1, rotate: r }}
            viewport={{ once: true }}
            transition={{ type: "spring", stiffness: 80, damping: 12, delay: 0.2 + k * 0.15 }}
          >
            <motion.div
              animate={reduce ? undefined : { y: [0, -12, 0], rotate: [0, k % 2 ? 6 : -6, 0] }}
              transition={{ duration: d, repeat: Infinity, ease: "easeInOut" }}
              className="drop-shadow-[0_18px_24px_color-mix(in_oklab,var(--primary)_25%,transparent)]"
            >
              <C />
            </motion.div>
          </motion.div>
        </motion.div>
      ))}
    </div>
  );
}
