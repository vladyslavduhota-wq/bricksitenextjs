import { defineRouting } from "next-intl/routing";

/** Ukrainian lives at "/", English at "/en". */
export const routing = defineRouting({
  locales: ["uk", "en"],
  defaultLocale: "uk",
  localePrefix: "as-needed",
});

export type Locale = (typeof routing.locales)[number];
