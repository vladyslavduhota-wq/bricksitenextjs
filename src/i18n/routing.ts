import { defineRouting } from "next-intl/routing";

/** Ukrainian lives at "/", English at "/en". */
export const routing = defineRouting({
  locales: ["uk", "en"],
  defaultLocale: "uk",
  localePrefix: "as-needed",
  // Always open in Ukrainian: no redirect by browser language or a remembered choice.
  // English only when someone follows the EN switch, which links straight to /en.
  localeDetection: false,
  localeCookie: false,
});

export type Locale = (typeof routing.locales)[number];
