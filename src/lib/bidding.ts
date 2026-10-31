import type { PublicLot } from "./types";

/**
 * The smallest bid the database accepts next, mirroring accept_bid(): one step above the current
 * price, or for the first bid the start price, and never less than one step (a lot can start at 0).
 */
export const minNextBid = (lot: Pick<PublicLot, "current_amount" | "start_price" | "bid_step">) =>
  lot.current_amount == null ? Math.max(lot.start_price, lot.bid_step) : lot.current_amount + lot.bid_step;
