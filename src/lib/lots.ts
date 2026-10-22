import "server-only";
import { createPublicClient } from "./supabase/public";
import { supabaseConfigured } from "./supabase/env";
import type { AuctionStats, PublicBid, PublicLot, Settings } from "./types";

const LOT_COLUMNS = "id, slug, title_uk, title_en, description_uk, description_en, start_price, bid_step, ends_at, status, current_amount, bid_count, leading_bid_id, images:lot_images(path, width, height, sort_order)";

type Row = Omit<PublicLot, "images"> & { images: (PublicLot["images"][number] & { sort_order: number })[] };
const shape = (r: Row): PublicLot => ({ ...r, images: [...r.images].sort((a, b) => a.sort_order - b.sort_order).map(({ path, width, height }) => ({ path, width, height })) });

/** Every published lot (drafts are hidden by RLS), in catalogue order. */
export async function getPublicLots(): Promise<PublicLot[]> {
  if (!supabaseConfigured) return [];
  const { data, error } = await createPublicClient().from("lots").select(LOT_COLUMNS).order("sort_order").order("created_at").returns<Row[]>();
  if (error) throw error;
  return data.map(shape);
}

export async function getPublicLot(slug: string): Promise<{ lot: PublicLot; bids: PublicBid[] } | null> {
  if (!supabaseConfigured) return null;
  const supabase = createPublicClient();
  const { data, error } = await supabase.from("lots").select(LOT_COLUMNS).eq("slug", slug).maybeSingle<Row>();
  if (error) throw error;
  if (!data) return null;
  const { data: bids } = await supabase.from("bid_history").select("*").eq("lot_id", data.id).order("created_at", { ascending: false }).limit(30).returns<PublicBid[]>();
  return { lot: shape(data), bids: bids ?? [] };
}

export async function getAuctionStats(): Promise<AuctionStats | null> {
  if (!supabaseConfigured) return null;
  const { data } = await createPublicClient().from("auction_stats").select("*").maybeSingle<AuctionStats>();
  return data;
}

export async function getPublicSettings(): Promise<Pick<Settings, "snipe_window_seconds" | "snipe_extend_seconds" | "max_bid_amount" | "donate_url" | "stream_url" | "final_published"> | null> {
  if (!supabaseConfigured) return null;
  const { data } = await createPublicClient().from("settings").select("snipe_window_seconds, snipe_extend_seconds, max_bid_amount, donate_url, stream_url, final_published").maybeSingle();
  return data;
}

/** Minimum acceptable bid, mirroring place_bid(). */
export const minNextBid = (lot: Pick<PublicLot, "current_amount" | "bid_step" | "start_price">) => (lot.current_amount == null ? lot.start_price : lot.current_amount + lot.bid_step);

/** Public names behind the given leading bids (null = anonymous), for the final page. */
export async function getLeaderNames(bidIds: string[]): Promise<Record<string, string | null>> {
  if (!supabaseConfigured || !bidIds.length) return {};
  const { data } = await createPublicClient().from("bid_history").select("id, public_name").in("id", bidIds);
  return Object.fromEntries((data ?? []).map((b) => [b.id, b.public_name]));
}
