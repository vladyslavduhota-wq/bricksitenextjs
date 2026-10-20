import { memo, useEffect, useState } from "react";
import { preloaderHtml, preloaderScript } from "./preloader-source";

const markup = { __html: preloaderHtml };

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
    // eslint-disable-next-line no-new-func
    new Function(preloaderScript)();
    return () => document.removeEventListener("kse:preloader-done", done);
  }, []);
  if (gone) return null;
  return <div suppressHydrationWarning dangerouslySetInnerHTML={markup} />;
});
