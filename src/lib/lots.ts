import "server-only";
import { createPublicClient } from "./supabase/public";
import { supabaseConfigured } from "./supabase/env";
import { LOT_COLUMNS, loadLiveState, shapeLot } from "./live-state";
import type { AuctionStats, LiveState, PublicLot, Settings } from "./types";

/** Every published lot (drafts are hidden by RLS), in show order. */
export async function getPublicLots(): Promise<PublicLot[]> {
  if (!supabaseConfigured) return [];
  const { data, error } = await createPublicClient().from("lots").select(LOT_COLUMNS).order("sort_order").order("created_at");
  if (error) throw error;
  return data.map(shapeLot);
}

export async function getLiveState(): Promise<LiveState> {
  if (!supabaseConfigured) return { lot: null, bids: [], winner: null, total: 0 };
  return loadLiveState(createPublicClient());
}

export async function getAuctionStats(): Promise<AuctionStats | null> {
  if (!supabaseConfigured) return null;
  const { data } = await createPublicClient().from("auction_stats").select("*").maybeSingle<AuctionStats>();
  return data;
}

export async function getPublicSettings(): Promise<Pick<Settings, "max_bid_amount" | "donate_url" | "stream_url" | "final_published"> | null> {
  if (!supabaseConfigured) return null;
  const { data } = await createPublicClient().from("settings").select("max_bid_amount, donate_url, stream_url, final_published").maybeSingle();
  return data;
}

/** Winners' full names by lot, for closed lots only. */
export async function getWinnerNames(): Promise<Record<string, string>> {
  if (!supabaseConfigured) return {};
  const { data } = await createPublicClient().from("lot_winners").select("lot_id, winner_name");
  return Object.fromEntries((data ?? []).map((w) => [w.lot_id, w.winner_name]));
}
