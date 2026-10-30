import type { Metadata } from "next";
import { getPathname } from "./navigation";
import { routing, type Locale } from "./routing";

/** Canonical URL and per-page language alternates (with x-default on Ukrainian) for search engines. */
export function alternates(href: string, locale: string): Metadata["alternates"] {
  const path = (l: Locale) => getPathname({ href, locale: l });
  return {
    canonical: path(locale as Locale),
    languages: { ...Object.fromEntries(routing.locales.map((l) => [l, path(l)])), "x-default": path(routing.defaultLocale) },
  };
}
