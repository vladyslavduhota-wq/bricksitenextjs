/** Auction closes automatically at this moment (time of day pending confirmation). */
export const FINAL_AT = new Date("2026-11-14T12:00:00+02:00");

export const isAuctionClosed = (now: Date = new Date()) => now.getTime() >= FINAL_AT.getTime();
