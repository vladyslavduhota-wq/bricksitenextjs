import "server-only";
import { createPublicClient } from "./supabase/public";
import { supabaseConfigured } from "./supabase/env";
import { LOT_COLUMNS, loadLiveState, shapeLot } from "./live-state";
import type { LiveState, PublicLot, Settings } from "./types";

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

export async function getPublicSettings(): Promise<Pick<Settings, "max_bid_amount" | "donate_url" | "stream_url"> | null> {
  if (!supabaseConfigured) return null;
  const { data } = await createPublicClient().from("settings").select("max_bid_amount, donate_url, stream_url").maybeSingle();
  return data;
}
