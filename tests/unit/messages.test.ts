import { describe, expect, it } from "vitest";
import uk from "../../messages/uk.json";
import en from "../../messages/en.json";

type Tree = { [k: string]: unknown };
const keys = (o: Tree, p = ""): string[] =>
  Object.entries(o).flatMap(([k, v]) => (v && typeof v === "object" && !Array.isArray(v) ? keys(v as Tree, `${p}${k}.`) : [`${p}${k}`]));
const at = (o: Tree, path: string) => path.split(".").reduce<unknown>((n, k) => (n as Tree)?.[k], o);

// Argument names: "{n}" or "{n, plural, ...}". Plural branch text such as "{No bids yet}" is not an argument.
const args = (s: unknown, re: RegExp) => (typeof s === "string" ? [...new Set([...s.matchAll(re)].map((m) => m[1]!))].sort() : []);
const simpleOrComplex = /\{(\w+)\s*[,}]/g;
const complex = /\{(\w+)\s*,/g;

describe("translations", () => {
  it("en has exactly the keys uk has", () => {
    expect(keys(en).sort()).toEqual(keys(uk).sort());
  });

  it("every en string keeps the uk placeholders and adds none", () => {
    for (const k of keys(uk)) {
      // uk copy is Cyrillic, so every ASCII name in braces there is a real argument.
      const want = args(at(uk, k), simpleOrComplex);
      const text = String(at(en, k));
      for (const a of want) expect(text, `${k} needs {${a}}`).toContain(`{${a}`);
      for (const a of args(text, complex)) expect(want, `${k} has an unknown {${a}}`).toContain(a);
    }
  });

  it("no en string is left empty", () => {
    for (const k of keys(en)) expect(String(at(en, k)).trim(), k).not.toBe("");
  });
});
