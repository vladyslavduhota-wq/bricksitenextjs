"use client";

import { useEffect, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { supabaseConfigured } from "@/lib/supabase/env";
import { HISTORY_LIMIT, loadLiveState, loadLot } from "@/lib/live-state";
import type { LiveState, LotPatch, PublicBid, PublicLot } from "@/lib/types";

// ---------------------------------------------------------------- one Realtime channel per tab

type Listener = { lot?: (p: LotPatch) => void; bid?: (b: PublicBid) => void; show?: (p: { current_lot_id: string | null }) => void; resync?: () => void };
const listeners = new Set<Listener>();
let channel: RealtimeChannel | null = null;

function connect() {
  if (channel || !supabaseConfigured) return;
  channel = createClient()
    .channel("auction")
    .on("broadcast", { event: "lot" }, ({ payload }) => listeners.forEach((l) => l.lot?.(payload as LotPatch)))
    .on("broadcast", { event: "bid" }, ({ payload }) => listeners.forEach((l) => l.bid?.(payload as PublicBid)))
    .on("broadcast", { event: "show" }, ({ payload }) => listeners.forEach((l) => l.show?.(payload as { current_lot_id: string | null })))
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

// ---------------------------------------------------------------- the live show

export type Phase = "waiting" | "live" | "winner";
export const phaseOf = (lot: PublicLot | null): Phase => (!lot ? "waiting" : lot.status === "closed" ? "winner" : "live");

/** The lot on air, its bids, its winner and the total raised, following the presenter in real time. */
export function useLiveShow(initial: LiveState) {
  const [state, setState] = useState(initial);
  const current = useRef(initial.lot?.id ?? null);

  const [listener] = useState<Listener>(() => {
    // Always from the database: the source of truth after a switch, a close or a reconnect.
    const reload = async () => {
      const next = await loadLiveState(createClient());
      current.current = next.lot?.id ?? null;
      setState(next);
    };
    const reloadLot = async (id: string) => {
      const next = await loadLot(createClient(), id);
      if (current.current === id) setState((s) => ({ ...s, ...next }));
    };
    return {
      show: ({ current_lot_id }) => {
        current.current = current_lot_id;
        void reload();
      },
      lot: (p) => {
        if (p.id !== current.current) return;
        setState((s) => (s.lot ? { ...s, total: s.total + (p.current_amount ?? 0) - (s.lot.current_amount ?? 0), lot: { ...s.lot, ...p } } : s));
        // Closing reveals the winner; a drop in the count means a cancelled bid. Both need fresh data.
        void reloadLot(p.id);
      },
      bid: (b) => {
        if (b.lot_id !== current.current) return;
        setState((s) => (!s.lot || s.bids.some((x) => x.id === b.id) ? s : { ...s, bids: [b, ...s.bids].slice(0, HISTORY_LIMIT), lot: { ...s.lot, leading_bid_id: b.id } }));
      },
      resync: () => void reload(),
    };
  });
  useAuctionEvents(listener);

  /** Apply place_bid()'s own response at once, before the broadcast arrives. */
  const applyOwnBid = (patch: LotPatch & { leading_bid_id: string }) =>
    setState((s) => (s.lot?.id === patch.id ? { ...s, lot: { ...s.lot, ...patch } } : s));

  return { ...state, phase: phaseOf(state.lot), applyOwnBid };
}

// ---------------------------------------------------------------- all lots (final page)

const STATE_COLUMNS = "id, status, ends_at, current_amount, bid_count, leading_bid_id";

/** All lots with prices and counts kept live. */
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

/** Calls back on any auction event (a bid, a close, a lot switch, a reconnect). For pages that refetch everything. */
export function useAuctionPulse(onPulse: () => void) {
  const ref = useRef(onPulse);
  useEffect(() => {
    ref.current = onPulse;
  });
  const [listener] = useState<Listener>(() => {
    const fire = () => ref.current();
    return { lot: fire, bid: fire, show: fire, resync: fire };
  });
  useAuctionEvents(listener);
}
