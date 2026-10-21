import { describe, expect, it } from "vitest";
import { fromKyivInput, toKyivInput } from "@/lib/time";
import { slugify, toCsv } from "@/lib/format";

describe("Kyiv time", () => {
  it("reads admin input as Kyiv time in winter and summer", () => {
    expect(fromKyivInput("2026-11-14T12:00")!.toISOString()).toBe("2026-11-14T10:00:00.000Z");
    expect(fromKyivInput("2026-07-01T12:00")!.toISOString()).toBe("2026-07-01T09:00:00.000Z");
  });

  it("handles the night daylight saving ends", () => {
    // 25.10.2026: clocks go back from 04:00 to 03:00.
    expect(fromKyivInput("2026-10-25T02:00")!.toISOString()).toBe("2026-10-24T23:00:00.000Z");
    expect(fromKyivInput("2026-10-25T05:00")!.toISOString()).toBe("2026-10-25T03:00:00.000Z");
  });

  it("round-trips for the form", () => {
    for (const v of ["2026-11-14T12:00", "2026-07-01T00:30", "2026-10-25T05:00"]) expect(toKyivInput(fromKyivInput(v)!)).toBe(v);
  });

  it("rejects malformed input", () => {
    expect(fromKyivInput("14.11.2026 12:00")).toBeNull();
  });
});

describe("slugify", () => {
  it("transliterates Ukrainian titles", () => {
    expect(slugify("Годинник ректора")).toBe("hodynnyk-rektora");
    expect(slugify("Шарф «KSE» №1, з’їзд")).toBe("sharf-kse-no1-zizd");
  });
});

describe("toCsv", () => {
  it("quotes, escapes and defuses formulas", () => {
    const csv = toCsv(["a", "b"], [["x;y", '=HYPERLINK("evil")'], [true, null]]);
    expect(csv).toBe('﻿a;b\r\n"x;y";"\'=HYPERLINK(""evil"")"\r\nтак;');
  });
});
