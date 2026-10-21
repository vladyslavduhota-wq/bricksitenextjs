const uah = new Intl.NumberFormat("uk-UA", { maximumFractionDigits: 0 });

/** 12 500 ₴ */
export const formatUah = (n: number | null | undefined) => (n == null ? "—" : `${uah.format(n)} ₴`);

// Ukrainian national transliteration (KMU 2010), enough for URL slugs.
const TRANSLIT: Record<string, string> = {
  а: "a", б: "b", в: "v", г: "h", ґ: "g", д: "d", е: "e", є: "ie", ж: "zh", з: "z", и: "y", і: "i", ї: "i", й: "i",
  к: "k", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f", х: "kh", ц: "ts", ч: "ch",
  ш: "sh", щ: "shch", ь: "", ю: "iu", я: "ia", "'": "", "’": "", ʼ: "",
};

/** "Годинник ректора" -> "hodynnyk-rektora" */
export function slugify(text: string) {
  return [...text.toLowerCase()]
    .map((c) => TRANSLIT[c] ?? c)
    .join("")
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/, "");
}

/** CSV that Excel opens correctly (UTF-8 BOM, ";" separator for Ukrainian locale settings). */
export function toCsv(header: string[], rows: (string | number | boolean | null | undefined)[][]) {
  const cell = (v: string | number | boolean | null | undefined) => {
    let s = v == null ? "" : typeof v === "boolean" ? (v ? "так" : "ні") : String(v);
    // Names come from users: stop Excel from running them as formulas.
    if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
    return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return "﻿" + [header, ...rows].map((r) => r.map(cell).join(";")).join("\r\n");
}
