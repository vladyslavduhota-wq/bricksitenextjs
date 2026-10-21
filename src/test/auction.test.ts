import { describe, expect, it } from "vitest";
import { isAuctionClosed } from "@/lib/auction";

describe("auction closing", () => {
  it("is open one second before the final on 14.11.2026", () => {
    expect(isAuctionClosed(new Date("2026-11-14T11:59:59+02:00"))).toBe(false);
  });
  it("closes exactly at the final time", () => {
    expect(isAuctionClosed(new Date("2026-11-14T12:00:00+02:00"))).toBe(true);
  });
});
