"use client";

import { useRef, type ReactNode } from "react";
import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
  useMotionValue,
  useSpring,
  useAnimationFrame,
  AnimatePresence,
} from "motion/react";

export const EASE = [0.32, 0.72, 0, 1] as const;

/** Headline: each word rises out of its own mask, staggered. Story: reading rhythm. */
export function SplitWords({ text, className = "", delay = 0 }: { text: string; className?: string; delay?: number }) {
  const reduce = useReducedMotion();
  const words = text.split(" ");

  return (
    <motion.span
      className={`inline-block ${className}`}
      aria-label={text}
      initial={reduce ? false : "hidden"}
      whileInView="show"
      animate={reduce ? "show" : false}
      viewport={{ once: true, amount: 0, margin: "0px" }}
    >
      {words.map((w, k) => (
        <span key={k} aria-hidden className="inline-block overflow-hidden pb-[0.12em] align-bottom">
          <motion.span
            className="inline-block"
            variants={{ hidden: { y: "110%", rotate: 6 }, show: { y: "0%", rotate: 0 } }}
            transition={{ duration: 1.1, delay: delay + k * 0.07, ease: EASE }}
          >
            {w}
            {k < words.length - 1 ? "\u00a0" : ""}
          </motion.span>
        </span>
      ))}
    </motion.span>
  );
}

/** Cyan marker sweeps under a phrase once it enters view. Story: emphasis. */
export function Highlight({ children, delay = 0.4, tone = "bg-accent" }: { children: ReactNode; delay?: number; tone?: string }) {
  const reduce = useReducedMotion();
  return (
    <motion.span
      className="relative isolate inline-block"
      initial={reduce ? false : "hidden"}
      whileInView="show"
      animate={reduce ? "show" : false}
      viewport={{ once: true, amount: 0, margin: "0px" }}
    >
      <motion.span
        aria-hidden
        className={`absolute -inset-x-2 bottom-[0.08em] top-[0.42em] -z-10 origin-left -rotate-1 rounded-full ${tone}`}
        variants={{ hidden: { scaleX: 0 }, show: { scaleX: 1 } }}
        transition={{ duration: 0.9, delay, ease: EASE }}
      />
      {children}
    </motion.span>
  );
}

/** Outlined text that fills with ink as you scroll past it. Story: progress. */
export function OutlineFill({ text, className = "", light = false }: { text: string; className?: string; light?: boolean }) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLSpanElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 90%", "start 35%"] });
  const clip = useTransform(scrollYProgress, [0, 1], ["inset(0 100% 0 0)", "inset(0 0% 0 0)"]);
  return (
    <span ref={ref} className={`relative inline-block ${className}`}>
      <span className={light ? "text-outline-light" : "text-outline"}>{text}</span>
      <motion.span aria-hidden style={reduce ? {} : { clipPath: clip }} className={`absolute inset-0 ${light ? "text-accent" : "text-primary"}`}>
        {text}
      </motion.span>
    </span>
  );
}

/** Button drifts toward the cursor. Story: feedback / invitation. */
export function Magnetic({ children, strength = 0.3 }: { children: ReactNode; strength?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const x = useSpring(useMotionValue(0), { stiffness: 180, damping: 15 });
  const y = useSpring(useMotionValue(0), { stiffness: 180, damping: 15 });
  return (
    <motion.div
      ref={ref}
      style={{ x, y }}
      className="inline-block"
      onPointerMove={(e) => {
        if (!ref.current || window.matchMedia("(pointer: coarse), (prefers-reduced-motion: reduce)").matches) return;
        const r = ref.current.getBoundingClientRect();
        x.set((e.clientX - r.left - r.width / 2) * strength);
        y.set((e.clientY - r.top - r.height / 2) * strength);
      }}
      onPointerLeave={() => {
        x.set(0);
        y.set(0);
      }}
    >
      {children}
    </motion.div>
  );
}

/** Calm continuous travel, independent of scroll velocity. */
export function VelocityMarquee({ children, base = 18 }: { children: ReactNode; base?: number }) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  useAnimationFrame((_, dt) => {
    if (reduce || !ref.current) return;
    const half = ref.current.scrollWidth / 2;
    if (!half) return;
    x.set(-((Math.abs(x.get()) + Math.abs(base) * Math.min(dt, 40) / 1000) % half));
  });
  return (
    <motion.div ref={ref} style={{ x: reduce ? 0 : x }} className="flex w-max">
      <div className="shrink-0">{children}</div>
      <div aria-hidden className="shrink-0">{children}</div>
    </motion.div>
  );
}

/** Digit that rolls when it changes. */
export function RollDigits({ value }: { value: string }) {
  const reduce = useReducedMotion();
  if (reduce) return <span>{value}</span>;
  return (
    <span className="inline-flex overflow-hidden">
      {value.split("").map((d, k) => (
        <span key={k} className="relative inline-block w-[0.62em] text-center">
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span
              key={d}
              className="inline-block"
              initial={{ y: "-100%", opacity: 0, filter: "blur(4px)" }}
              animate={{ y: "0%", opacity: 1, filter: "blur(0px)" }}
              exit={{ y: "100%", opacity: 0, filter: "blur(4px)" }}
              transition={{ duration: 0.55, ease: EASE }}
            >
              {d}
            </motion.span>
          </AnimatePresence>
        </span>
      ))}
    </span>
  );
}
