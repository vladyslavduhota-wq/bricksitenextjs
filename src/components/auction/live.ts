"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { supabaseConfigured } from "@/lib/supabase/env";
import type { LotPatch, PublicBid, PublicLot } from "@/lib/types";

// ---------------------------------------------------------------- one Realtime channel per tab

type Listener = { lot?: (p: LotPatch) => void; bid?: (b: PublicBid) => void; resync?: () => void };
const listeners = new Set<Listener>();
let channel: RealtimeChannel | null = null;

function connect() {
  if (channel || !supabaseConfigured) return;
  channel = createClient()
    .channel("auction")
    .on("broadcast", { event: "lot" }, ({ payload }) => listeners.forEach((l) => l.lot?.(payload as LotPatch)))
    .on("broadcast", { event: "bid" }, ({ payload }) => listeners.forEach((l) => l.bid?.(payload as PublicBid)))
    // Fires on the first join and on every reconnect: refetch, so nothing missed while offline survives.
    .subscribe((status) => status === "SUBSCRIBED" && listeners.forEach((l) => l.resync?.()));
}

function useAuctionEvents(listener: Listener) {
  useEffect(() => {
    listeners.add(listener);
    connect();
    return () => void listeners.delete(listener);
  }, [listener]);
}

// ---------------------------------------------------------------- server-synced clock

let offset = 0;
let synced = false;
let now = Date.now();
const ticks = new Set<() => void>();
let timer: ReturnType<typeof setInterval> | null = null;

async function syncClock() {
  if (synced) return;
  synced = true;
  try {
    const t0 = Date.now();
    const { now: server } = (await (await fetch("/api/time", { cache: "no-store" })).json()) as { now: number };
    offset = server - (t0 + Date.now()) / 2;
  } catch {
    synced = false;
  }
}

function subscribeClock(cb: () => void) {
  ticks.add(cb);
  void syncClock();
  timer ??= setInterval(() => {
    now = Date.now() + offset;
    ticks.forEach((t) => t());
  }, 1000);
  return () => {
    ticks.delete(cb);
    if (!ticks.size && timer) {
      clearInterval(timer);
      timer = null;
    }
  };
}

/** Server time, ticking every second. Null during server render, so countdowns never mismatch on hydration. */
export const useServerNow = () => useSyncExternalStore(subscribeClock, () => now, () => null);

// ---------------------------------------------------------------- live state

export const isOpen = (lot: Pick<PublicLot, "status" | "ends_at">, at: number | null) =>
  lot.status === "active" && (at == null || at < new Date(lot.ends_at).getTime());

const STATE_COLUMNS = "id, status, ends_at, current_amount, bid_count, leading_bid_id";

/** All lots with prices, counts and deadlines kept live. */
export function useLiveLots(initial: PublicLot[]) {
  const [lots, setLots] = useState(initial);
  const [listener] = useState<Listener>(() => ({
    lot: (p) => setLots((ls) => ls.map((l) => (l.id === p.id ? { ...l, ...p } : l))),
    resync: async () => {
      const { data } = await createClient().from("lots").select(STATE_COLUMNS).in("id", initial.map((l) => l.id));
      if (data) setLots((ls) => ls.map((l) => ({ ...l, ...(data.find((d) => d.id === l.id) ?? {}) })));
    },
  }));
  useAuctionEvents(listener);
  return lots;
}

/** One lot and its bid history, kept live. */
export function useLiveLot(initialLot: PublicLot, initialBids: PublicBid[]) {
  const [lot, setLot] = useState(initialLot);
  const [bids, setBids] = useState(initialBids);
  const [listener] = useState<Listener>(() => {
    let pending: ReturnType<typeof setTimeout> | null = null;
    const refetch = () => {
      if (pending) clearTimeout(pending);
      pending = setTimeout(async () => {
        const supabase = createClient();
        const [state, history] = await Promise.all([
          supabase.from("lots").select(STATE_COLUMNS).eq("id", initialLot.id).single(),
          supabase.from("bid_history").select("*").eq("lot_id", initialLot.id).order("created_at", { ascending: false }).limit(30),
        ]);
        if (state.data) setLot((l) => ({ ...l, ...state.data }));
        if (history.data) setBids(history.data as PublicBid[]);
      }, 250);
    };
    return {
      lot: (p) => {
        if (p.id !== initialLot.id) return;
        setLot((l) => ({ ...l, ...p }));
        // A drop in the count means a bid was cancelled: history and leader need a refresh.
        refetch();
      },
      bid: (b) => {
        if (b.lot_id !== initialLot.id) return;
        setBids((bs) => (bs.some((x) => x.id === b.id) ? bs : [b, ...bs].slice(0, 30)));
        setLot((l) => ({ ...l, leading_bid_id: b.id }));
      },
      resync: refetch,
    };
  });
  useAuctionEvents(listener);
  /** Apply place_bid()'s own response at once, before the broadcast arrives. */
  const applyOwnBid = (patch: LotPatch & { leading_bid_id: string }) => setLot((l) => ({ ...l, ...patch }));
  return { lot, bids, applyOwnBid };
}
