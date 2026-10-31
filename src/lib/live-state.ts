import type { SupabaseClient } from "@supabase/supabase-js";
import type { LiveState, PublicBid, PublicLot } from "./types";

// Shared by the server (first paint) and the browser (when the presenter switches lots).
export const LOT_COLUMNS = "id, slug, title_uk, title_en, description_uk, description_en, start_price, bid_step, ends_at, status, current_amount, bid_count, leading_bid_id, images:lot_images(path, width, height, sort_order)";

type Row = Omit<PublicLot, "images"> & { images: (PublicLot["images"][number] & { sort_order: number })[] };
export const shapeLot = (r: Row): PublicLot => ({
  ...r,
  images: [...r.images].sort((a, b) => a.sort_order - b.sort_order).map(({ path, width, height }) => ({ path, width, height })),
});

export const HISTORY_LIMIT = 30;

/** Everything a viewer needs about one lot: details, recent bids, and the winner once it is closed. */
export async function loadLot(supabase: SupabaseClient, lotId: string): Promise<Omit<LiveState, "total">> {
  const [lot, bids, winner] = await Promise.all([
    supabase.from("lots").select(LOT_COLUMNS).eq("id", lotId).maybeSingle<Row>(),
    supabase.from("bid_history").select("*").eq("lot_id", lotId).order("created_at", { ascending: false }).limit(HISTORY_LIMIT).returns<PublicBid[]>(),
    supabase.from("lot_winners").select("winner_name, amount").eq("lot_id", lotId).maybeSingle<{ winner_name: string; amount: number }>(),
  ]);
  if (!lot.data) return { lot: null, bids: [], winner: null };
  return { lot: shapeLot(lot.data), bids: bids.data ?? [], winner: winner.data ? { name: winner.data.winner_name, amount: winner.data.amount } : null };
}

/** The lot on air right now (or none), with the total raised. */
export async function loadLiveState(supabase: SupabaseClient): Promise<LiveState> {
  const [settings, stats] = await Promise.all([
    supabase.from("settings").select("current_lot_id").maybeSingle<{ current_lot_id: string | null }>(),
    supabase.from("auction_stats").select("total_raised").maybeSingle<{ total_raised: number }>(),
  ]);
  const total = Number(stats.data?.total_raised ?? 0);
  const id = settings.data?.current_lot_id;
  if (!id) return { lot: null, bids: [], winner: null, total };
  return { ...(await loadLot(supabase, id)), total };
}
