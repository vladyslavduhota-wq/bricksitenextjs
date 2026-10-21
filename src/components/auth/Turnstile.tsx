"use client";

import { useEffect, useRef } from "react";

type TurnstileApi = {
  render: (el: HTMLElement, opts: Record<string, unknown>) => string;
  reset: (id: string) => void;
  remove: (id: string) => void;
};
declare global {
  interface Window { turnstile?: TurnstileApi }
}

export const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "";
const SCRIPT = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

/**
 * Cloudflare Turnstile bot check (spec: captcha on registration and bids).
 * Renders nothing until NEXT_PUBLIC_TURNSTILE_SITE_KEY is set. Change `resetKey` to get a fresh token after each use.
 */
export function Turnstile({ onToken, resetKey, locale }: { onToken: (token: string | null) => void; resetKey: number; locale: string }) {
  const box = useRef<HTMLDivElement>(null);
  const widget = useRef<string | null>(null);
  const callback = useRef(onToken);
  useEffect(() => {
    callback.current = onToken;
  });

  useEffect(() => {
    if (!TURNSTILE_SITE_KEY || !box.current) return;
    const el = box.current;
    const mount = () => {
      if (!window.turnstile || widget.current) return;
      widget.current = window.turnstile.render(el, {
        sitekey: TURNSTILE_SITE_KEY,
        language: locale,
        appearance: "interaction-only",
        callback: (t: string) => callback.current(t),
        "expired-callback": () => callback.current(null),
        "error-callback": () => callback.current(null),
      });
    };
    if (window.turnstile) mount();
    else {
      let s = document.querySelector<HTMLScriptElement>(`script[src="${SCRIPT}"]`);
      if (!s) {
        s = Object.assign(document.createElement("script"), { src: SCRIPT, async: true });
        document.head.append(s);
      }
      s.addEventListener("load", mount);
    }
    return () => {
      if (widget.current) window.turnstile?.remove(widget.current);
      widget.current = null;
    };
  }, [locale]);

  useEffect(() => {
    if (resetKey && widget.current) {
      callback.current(null);
      window.turnstile?.reset(widget.current);
    }
  }, [resetKey]);

  return TURNSTILE_SITE_KEY ? <div ref={box} className="min-h-0 empty:hidden" /> : null;
}
