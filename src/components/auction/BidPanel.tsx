"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { usePathname } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Check, Gavel, Minus, Plus, SignIn, Trophy, Warning, X } from "@phosphor-icons/react";
import { Link } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/client";
import { Bezel, Button, Notice, buttonClass, inputClass } from "@/components/ui";
import { formatUah } from "@/lib/format";
import { lotTitle } from "@/lib/lot-text";
import { cn } from "@/lib/utils";
import type { LotPatch, PublicLot } from "@/lib/types";
import { isOpen, useServerNow } from "./live";

type Viewer = { state: "loading" } | { state: "anon" } | { state: "noProfile" } | { state: "blocked" } | { state: "ready"; mine: Set<string> };
type PlaceResult = { bid_id: string; amount: number; lot: LotPatch; duplicate: boolean };
const KNOWN = ["amount_too_low", "amount_too_high", "already_leading", "rate_limited", "lot_closed", "lot_not_found", "user_blocked", "profile_required", "not_authenticated"] as const;
type ErrorKey = (typeof KNOWN)[number] | "invalid" | "generic";

const minNext = (lot: PublicLot) => (lot.current_amount == null ? lot.start_price : lot.current_amount + lot.bid_step);

/** Spec 5.3–5.4: three clicks (bid → check amount → confirm), with the commitment stated on the form. */
export function BidPanel({ lot, maxBid, onPlaced }: { lot: PublicLot; maxBid: number | null; onPlaced: (patch: LotPatch & { leading_bid_id: string }) => void }) {
  const t = useTranslations("bid");
  const locale = useLocale();
  const path = usePathname();
  const now = useServerNow();
  const dialog = useRef<HTMLDialogElement>(null);
  const clientKey = useRef<string | null>(null);
  const [viewer, setViewer] = useState<Viewer>({ state: "loading" });
  const [raw, setRaw] = useState<string | null>(null); // null: follow the current minimum
  const [error, setError] = useState<{ key: ErrorKey; value?: number } | null>(null);
  const [sending, setSending] = useState(false);
  const [justPlaced, setJustPlaced] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      const supabase = createClient();
      const { data } = await supabase.auth.getUser();
      if (!data.user) return alive && setViewer({ state: "anon" });
      const [profile, mine] = await Promise.all([
        supabase.from("profiles").select("is_blocked").eq("id", data.user.id).maybeSingle(),
        supabase.from("bids").select("id").eq("lot_id", lot.id).eq("user_id", data.user.id),
      ]);
      if (!alive) return;
      if (!profile.data) setViewer({ state: "noProfile" });
      else if (profile.data.is_blocked) setViewer({ state: "blocked" });
      else setViewer({ state: "ready", mine: new Set((mine.data ?? []).map((b) => b.id)) });
    })();
    return () => {
      alive = false;
    };
  }, [lot.id]);

  const min = minNext(lot);
  const value = raw ?? String(min);
  const amount = /^\d{1,9}$/.test(value) ? Number(value) : NaN;
  const nudge = (d: number) => {
    setError(null);
    setRaw(String(Math.max(min, (Number.isNaN(amount) ? min : amount) + d * lot.bid_step)));
  };

  if (!isOpen(lot, now)) return <Notice>{t("closed")}</Notice>;

  if (viewer.state === "loading") return <div className="h-[8.5rem] animate-pulse rounded-3xl bg-primary/5" />;
  if (viewer.state === "anon" || viewer.state === "noProfile") {
    const target = viewer.state === "anon" ? "/login" : "/welcome";
    return (
      <div>
        <Link href={{ pathname: target, query: { next: path } }} className={buttonClass("primary", "lg", "w-full")}>
          <SignIn size={20} weight="bold" /> {viewer.state === "anon" ? t("signIn") : t("finishProfile")}
        </Link>
        {viewer.state === "anon" && <p className="mt-3 text-center text-xs text-muted-foreground">{t("signInNote")}</p>}
      </div>
    );
  }
  if (viewer.state === "blocked") return <Notice tone="error">{t("blocked")}</Notice>;

  const leading = lot.leading_bid_id != null && viewer.mine.has(lot.leading_bid_id);
  const outbid = !leading && viewer.mine.size > 0;
  const bigJump = amount - min >= Math.max(10 * lot.bid_step, min);

  function review(e: FormEvent) {
    e.preventDefault();
    if (Number.isNaN(amount)) return setError({ key: "invalid" });
    if (amount < min) return setError({ key: "amount_too_low", value: min });
    if (maxBid != null && amount > maxBid) return setError({ key: "amount_too_high", value: maxBid });
    setError(null);
    clientKey.current ??= crypto.randomUUID();
    dialog.current?.showModal();
  }

  async function place() {
    setSending(true);
    setError(null);
    const { data, error: err } = await createClient().rpc("place_bid", { p_lot_id: lot.id, p_amount: amount, p_client_key: clientKey.current });
    setSending(false);
    if (err) {
      const key: ErrorKey = (KNOWN as readonly string[]).includes(err.message) ? (err.message as ErrorKey) : "generic";
      const detail = Number(err.details);
      setError({ key, value: Number.isFinite(detail) ? detail : undefined });
      // A new minimum: offer it, with a fresh key, since this attempt was rejected.
      if (key === "amount_too_low" && Number.isFinite(detail)) {
        setRaw(String(detail));
        clientKey.current = crypto.randomUUID();
      }
      if (key !== "amount_too_low" && key !== "rate_limited" && key !== "generic") dialog.current?.close();
      return;
    }
    const res = data as PlaceResult;
    onPlaced({ ...res.lot, leading_bid_id: res.bid_id });
    setViewer({ state: "ready", mine: new Set([...viewer.state === "ready" ? viewer.mine : [], res.bid_id]) });
    clientKey.current = null;
    setRaw(null);
    setJustPlaced(true);
    dialog.current?.close();
  }

  const message = error && t(`errors.${error.key}`, { min: formatUah(error.value ?? min), max: formatUah(error.value ?? maxBid ?? 0) });

  return (
    <div>
      {leading ? (
        <p className="mb-4 inline-flex items-center gap-2 rounded-full bg-accent px-4 py-2 text-sm font-medium text-accent-foreground"><Trophy weight="fill" /> {justPlaced ? t("success") : t("leading")}</p>
      ) : outbid ? (
        <p className="mb-4 inline-flex items-center gap-2 rounded-full bg-destructive/10 px-4 py-2 text-sm font-medium text-destructive"><Warning weight="fill" /> {t("outbid")}</p>
      ) : null}

      <form onSubmit={review} noValidate>
        <label className="mb-2 block text-sm font-medium text-primary" htmlFor="bid-amount">{t("amount")}</label>
        <div className="flex items-stretch gap-2">
          <button type="button" onClick={() => nudge(-1)} disabled={amount <= min} aria-label={t("less")} className="grid w-12 shrink-0 place-items-center rounded-2xl text-primary ring-1 ring-primary/15 transition hover:bg-primary/5 disabled:opacity-40"><Minus weight="bold" /></button>
          <input
            id="bid-amount"
            inputMode="numeric"
            value={value}
            onChange={(e) => { setError(null); setRaw(e.target.value.replace(/[^\d]/g, "")); }}
            aria-invalid={!!error}
            aria-describedby="bid-hint"
            className={cn(inputClass, "text-center text-2xl font-bold tabular-nums text-primary")}
          />
          <button type="button" onClick={() => nudge(1)} aria-label={t("more")} className="grid w-12 shrink-0 place-items-center rounded-2xl text-primary ring-1 ring-primary/15 transition hover:bg-primary/5"><Plus weight="bold" /></button>
        </div>
        <p id="bid-hint" className={cn("mt-2 text-xs", error ? "text-destructive" : "text-muted-foreground")}>{message ?? t("minHint", { min: formatUah(min) })}</p>
        <Button type="submit" size="lg" className="mt-4 w-full" disabled={leading}><Gavel size={20} weight="bold" /> {t("place")}</Button>
      </form>

      <dialog ref={dialog} className="m-auto w-[calc(100%-2rem)] max-w-md bg-transparent p-0 backdrop:bg-primary/60 backdrop:backdrop-blur-md" onClick={(e) => e.target === dialog.current && !sending && dialog.current.close()}>
        <Bezel core="relative p-6 sm:p-8">
          <button type="button" aria-label={t("cancel")} onClick={() => dialog.current?.close()} className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-full bg-primary/5 text-primary"><X weight="light" /></button>
          <h2 className="pr-10 text-2xl font-bold tracking-tight text-primary">{t("confirmTitle")}</h2>
          <p className="mt-4 text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground">{t("confirmLot")}</p>
          <p className="font-medium text-primary">{lotTitle(lot, locale)}</p>
          <p className="mt-4 text-5xl font-bold tracking-tight tabular-nums text-primary">{formatUah(amount)}</p>
          {bigJump && <div className="mt-4"><Notice tone="error">{t("bigJump", { diff: formatUah(amount - min) })}</Notice></div>}
          <p className="mt-4 rounded-2xl bg-accent-soft p-4 text-sm leading-relaxed text-primary ring-1 ring-primary/10">{t("commitment")}</p>
          {error && <div className="mt-4"><Notice tone="error">{message}</Notice></div>}
          <div className="mt-6 flex flex-wrap justify-end gap-2">
            <Button variant="ghost" onClick={() => dialog.current?.close()} disabled={sending}>{t("cancel")}</Button>
            <Button onClick={place} disabled={sending || Number.isNaN(amount)}><Check size={18} weight="bold" /> {sending ? t("sending") : t("confirm", { amount: formatUah(amount) })}</Button>
          </div>
        </Bezel>
      </dialog>
    </div>
  );
}
