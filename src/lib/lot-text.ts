import type { PublicLot } from "./types";

/** English falls back to Ukrainian until the Rector's Office adds a translation. */
export const lotTitle = (lot: Pick<PublicLot, "title_uk" | "title_en">, locale: string) => (locale === "en" && lot.title_en ? lot.title_en : lot.title_uk);
export const lotDescription = (lot: Pick<PublicLot, "description_uk" | "description_en">, locale: string) =>
  locale === "en" && lot.description_en ? lot.description_en : lot.description_uk;
