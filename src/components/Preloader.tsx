import { memo, useEffect } from "react";
import { preloaderHtml, preloaderScript } from "./preloader-source";

const markup = { __html: preloaderHtml };

/** KSE gavel preloader. Markup renders on the server; the animation script runs once after hydration. */
export const Preloader = memo(function Preloader() {
  useEffect(() => {
    const w = window as unknown as { __ksePre?: boolean };
    if (w.__ksePre) return;
    w.__ksePre = true;
    // eslint-disable-next-line no-new-func
    new Function(preloaderScript)();
  }, []);
  return <div suppressHydrationWarning dangerouslySetInnerHTML={markup} />;
});
