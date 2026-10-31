"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Minus, Plus } from "@phosphor-icons/react";
import { Button, Field, inputClass } from "@/components/ui";
import { useAuctionPulse } from "@/components/auction/live";
import { addManualBid, type ActionState } from "@/app/admin/actions";
import { formatUah } from "@/lib/format";
import { useFormAction } from "./useFormAction";

/** Reloads the control panel's data whenever a bid lands, a lot closes or the lot on air changes. */
export function LiveRefresh() {
  const router = useRouter();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useAuctionPulse(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => router.refresh(), 300);
  });
  return null;
}

/** One-click show controls (next lot, pause): no dialog, the show must not wait. */
export function ActionButton({ action, children, variant = "ghost", size = "md", className }: { action: () => Promise<ActionState>; children: React.ReactNode; variant?: "primary" | "accent" | "ghost"; size?: "md" | "lg"; className?: string }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <span className="inline-flex flex-col gap-1">
      <Button variant={variant} size={size} className={className} disabled={pending} onClick={() => start(async () => setError((await action()).error ?? null))}>
        {children}
      </Button>
      {error && <span className="text-xs text-destructive">{error}</span>}
    </span>
  );
}

const digits = (v: string) => v.replace(/[^\d]/g, "");

/** A bid from the room or by phone: name, optional phone, amount prefilled with the minimum. */
export function ManualBidForm({ lotId, min, step }: { lotId: string; min: number; step: number }) {
  const { state, onSubmit, pending } = useFormAction(addManualBid.bind(null, lotId));
  const [first] = useState(() => crypto.randomUUID());
  // The server hands back a new key after a success: the fields remount empty, the amount follows the new minimum.
  const key = state.next ?? first;
  const f = state.fields ?? {};
  return (
    <form onSubmit={onSubmit} noValidate>
      <ManualBidFields key={key} clientKey={key} min={min} step={step} fields={f} />
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Button type="submit" size="lg" disabled={pending}>{pending ? "Додаємо…" : "Додати ставку"}</Button>
        {state.ok && <span key={state.at} className="text-sm font-medium text-primary">{state.ok}</span>}
        {state.error && !f.amount && <span key={state.at} className="text-sm font-medium text-destructive">{state.error}</span>}
      </div>
    </form>
  );
}

function ManualBidFields({ clientKey, min, step, fields: f }: { clientKey: string; min: number; step: number; fields: Record<string, string> }) {
  const [amount, setAmount] = useState<string | null>(null); // null: follow the minimum
  const value = amount ?? String(min);
  const nudge = (d: number) => setAmount(String(Math.max(min, (Number(value) || min) + d * step)));
  return (
    <div className="grid gap-4 @xl:grid-cols-[minmax(0,1fr)_minmax(0,0.8fr)]">
      <input type="hidden" name="client_key" value={clientKey} />
      <Field label="Ім'я та прізвище *" error={f.name}>
        <input name="name" className={inputClass} autoComplete="off" required aria-invalid={!!f.name} />
      </Field>
      <Field label="Телефон" hint="Для зв'язку, якщо виграє." error={f.phone}>
        <input name="phone" type="tel" className={inputClass} autoComplete="off" aria-invalid={!!f.phone} />
      </Field>
      <Field label="Сума, ₴ *" hint={`Мінімум ${formatUah(min)}`} error={f.amount} className="@xl:col-span-2">
        <div className="flex items-stretch gap-2">
          <button type="button" onClick={() => nudge(-1)} disabled={Number(value) <= min} aria-label="Зменшити на крок" className="grid w-12 shrink-0 place-items-center rounded-2xl text-primary ring-1 ring-primary/15 transition hover:bg-primary/5 disabled:opacity-40"><Minus weight="bold" /></button>
          <input name="amount" inputMode="numeric" value={value} onChange={(e) => setAmount(digits(e.target.value))} className={`${inputClass} text-center text-2xl font-bold tabular-nums text-primary`} aria-invalid={!!f.amount} />
          <button type="button" onClick={() => nudge(1)} aria-label="Збільшити на крок" className="grid w-12 shrink-0 place-items-center rounded-2xl text-primary ring-1 ring-primary/15 transition hover:bg-primary/5"><Plus weight="bold" /></button>
        </div>
      </Field>
    </div>
  );
}
