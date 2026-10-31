// Row shapes of the tables and views in supabase/migrations.

export type Role = "participant" | "moderator" | "admin";
export type LotStatus = "draft" | "active" | "closed";
export type BidStatus = "valid" | "cancelled";

export type Profile = {
  id: string;
  full_name: string;
  phone: string;
  display_name: string | null;
  show_anonymously: boolean;
  accepted_rules_at: string;
  photo_consent: boolean;
  locale: "uk" | "en";
  role: Role;
  is_blocked: boolean;
};

export type Lot = {
  id: string;
  slug: string;
  title_uk: string;
  title_en: string;
  description_uk: string;
  description_en: string;
  start_price: number;
  bid_step: number;
  ends_at: string | null;
  status: LotStatus;
  sort_order: number;
  current_amount: number | null;
  bid_count: number;
  closed_at: string | null;
  created_at: string;
};

export type LotImage = { id: string; lot_id: string; path: string; width: number | null; height: number | null; sort_order: number };

export type Settings = {
  goal_amount: number;
  max_bid_amount: number;
  min_seconds_between_bids: number;
  donate_url: string | null;
  stream_url: string | null;
  final_published: boolean;
  /** The lot on air in the live show, or null while viewers see the waiting screen. */
  current_lot_id: string | null;
};

export type AuctionStats = { total_raised: number; goal_amount: number; lot_count: number; bid_count: number; last_ends_at: string | null };

export type AdminBid = {
  id: string;
  lot_id: string;
  lot_title: string;
  lot_slug: string;
  amount: number;
  status: BidStatus;
  created_at: string;
  public_name: string | null;
  user_id: string;
  bidder_name: string;
  bidder_email: string | null;
  bidder_phone: string | null;
  bidder_blocked: boolean;
  /** Entered by an admin for someone in the room or on the phone. */
  is_manual: boolean;
  is_leading: boolean;
  cancelled_at: string | null;
  cancel_reason: string | null;
};

export type AdminUser = {
  id: string;
  full_name: string;
  display_name: string | null;
  email: string | null;
  phone: string | null;
  show_anonymously: boolean;
  photo_consent: boolean;
  role: Role;
  is_blocked: boolean;
  created_at: string;
  bid_count: number;
  last_bid_at: string | null;
};

export type Winner = {
  lot_id: string;
  lot_title: string;
  lot_status: LotStatus;
  closed_at: string | null;
  bid_count: number;
  amount: number;
  bid_at: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  is_manual: boolean;
};

export type AuditEntry = {
  id: number;
  created_at: string;
  action: "insert" | "update" | "delete";
  table_name: string;
  row_id: string | null;
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  actor_name: string | null;
};

export type Donation = { id: string; amount: number; note: string | null; received_at: string };

// Public read models: what the catalogue and lot pages need, nothing more.
export type PublicImage = { path: string; width: number | null; height: number | null };

export type PublicLot = {
  id: string;
  slug: string;
  title_uk: string;
  title_en: string;
  description_uk: string;
  description_en: string;
  start_price: number;
  bid_step: number;
  ends_at: string | null;
  status: Exclude<LotStatus, "draft">;
  current_amount: number | null;
  bid_count: number;
  leading_bid_id: string | null;
  images: PublicImage[];
};

/** The fields the database broadcasts on every change ("lot" event). */
export type LotPatch = Pick<PublicLot, "id" | "status" | "ends_at" | "current_amount" | "bid_count">;

export type PublicBid = { id: string; lot_id: string; amount: number; public_name: string | null; created_at: string };

/** What viewers see: the lot on air (null while waiting), its recent bids, its winner once closed. */
export type LiveState = { lot: PublicLot | null; bids: PublicBid[]; winner: { name: string; amount: number } | null; total: number };
