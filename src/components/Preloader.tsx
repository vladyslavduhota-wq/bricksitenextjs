import { useEffect, useRef } from "react";
import { preloaderHtml, preloaderScript } from "./preloader-source";

/** KSE gavel preloader. Markup renders on the server; the animation script runs once after hydration. */
export function Preloader() {
  const ran = useRef(false);
  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    // eslint-disable-next-line no-new-func
    new Function(preloaderScript)();
  }, []);
  return <div suppressHydrationWarning dangerouslySetInnerHTML={{ __html: preloaderHtml }} />;
}
