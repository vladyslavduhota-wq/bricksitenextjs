"use client";

import { memo, useEffect, useState } from "react";
import { preloaderHtml, preloaderScript } from "./preloader-source";

const markup = { __html: preloaderHtml };

/**
 * A clock for the ported script that never leaps. The script times every frame from its start, so a
 * frame that arrived late (the page busy hydrating, decoding images or swapping fonts) used to jump
 * the animation ahead, which read as a stutter. Here a late frame advances it by at most one slow
 * frame, so the animation pauses for the hiccup instead. The script text itself stays verbatim.
 */
function steadyClock(maxStep = 64) {
  let virtual = performance.now();
  let last = virtual;
  return {
    performance: { now: () => virtual },
    requestAnimationFrame: (cb: FrameRequestCallback) =>
      requestAnimationFrame((real) => {
        virtual += Math.min(Math.max(real - last, 0), maxStep);
        last = real;
        cb(virtual);
      }),
  };
}

/** KSE gavel preloader. Markup renders on the server; the animation script runs once after hydration. */
export const Preloader = memo(function Preloader() {
  const [gone, setGone] = useState(false);
  useEffect(() => {
    const w = window as unknown as { __ksePre?: boolean; __ksePreDone?: boolean };
    if (w.__ksePreDone) { setGone(true); return; }
    const done = () => { w.__ksePreDone = true; setGone(true); };
    document.addEventListener("kse:preloader-done", done, { once: true });
    if (w.__ksePre) return () => document.removeEventListener("kse:preloader-done", done);
    w.__ksePre = true;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      document.dispatchEvent(new Event("kse:preloader-exit"));
      done();
      return () => document.removeEventListener("kse:preloader-done", done);
    }
    const clock = steadyClock();
    new Function("performance", "requestAnimationFrame", preloaderScript)(clock.performance, clock.requestAnimationFrame);
    // The steady clock stretches the intro on a struggling device; never let it hold the page longer than this.
    const cap = setTimeout(() => {
      if (w.__ksePreDone) return;
      document.getElementById("pre")?.classList.add("out");
      document.dispatchEvent(new Event("kse:preloader-exit"));
      document.documentElement.style.overflow = "";
      done();
    }, 9000);
    return () => {
      clearTimeout(cap);
      document.removeEventListener("kse:preloader-done", done);
    };
  }, []);
  // Hidden rather than removed: the ported script keeps a resize listener that still looks up its nodes.
  return <div suppressHydrationWarning hidden={gone} dangerouslySetInnerHTML={markup} />;
});
