import { memo, useEffect, useState } from "react";
import { preloaderHtml, preloaderScript } from "./preloader-source";

const markup = { __html: preloaderHtml };

/** KSE gavel preloader. Markup renders on the server; the animation script runs once after hydration. */
export const Preloader = memo(function Preloader() {
  const [gone] = useState(() => typeof window !== "undefined" && !!(window as unknown as { __ksePre?: boolean }).__ksePre);
  useEffect(() => {
    const w = window as unknown as { __ksePre?: boolean };
    if (w.__ksePre) return;
    w.__ksePre = true;
    // eslint-disable-next-line no-new-func
    new Function(preloaderScript)();
  }, []);
  if (gone) return null;
  return <div suppressHydrationWarning dangerouslySetInnerHTML={markup} />;
});
