"use client";

import { useEffect, useRef, useState } from "react";
import { FloppyDisk, Plus } from "@phosphor-icons/react";
import { Button, Check, Field, inputClass } from "@/components/ui";
import { addDonation, saveSettings } from "@/app/admin/actions";
import { formatUah } from "@/lib/format";
import { useFormAction } from "./useFormAction";
import type { Settings } from "@/lib/types";

const digits = (v: string) => v.replace(/[^\d]/g, "");

function SaveBar({ pending, ok, error, at, label }: { pending: boolean; ok?: string; error?: string; at?: number; label: string }) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button type="submit" disabled={pending}><FloppyDisk size={18} weight="light" /> {pending ? "Зберігаємо…" : label}</Button>
      {ok && <span key={at} className="text-sm font-medium text-primary">{ok}</span>}
      {error && <span key={at} className="text-sm font-medium text-destructive">{error}</span>}
    </div>
  );
}

/** Every number the spec leaves to the admin: goal (5.5), anti-sniping (5.3), max bid (5.3), bid rate, jar (5.6), stream (5.7). */
export function SettingsForm({ settings }: { settings: Settings }) {
  const { state, onSubmit, pending } = useFormAction(saveSettings);
  const f = state.fields ?? {};
  const [goal, setGoal] = useState(String(settings.goal_amount));
  const [maxBid, setMaxBid] = useState(String(settings.max_bid_amount));
  const [windowMin, setWindowMin] = useState(String(settings.snipe_window_seconds / 60));
  const [extendMin, setExtendMin] = useState(String(settings.snipe_extend_seconds / 60));

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-8">
      <fieldset className="grid gap-5 @lg:grid-cols-2">
        <legend className="mb-4 text-lg font-bold tracking-tight text-primary">Збір</legend>
        <Field label="Ціль збору, ₴" hint={Number(goal) ? `Прогрес-бар на сайті рахує від ${formatUah(Number(goal))}.` : "0 — прогрес-бар не показується."} error={f.goal_amount}>
          <input name="goal_amount" inputMode="numeric" className={inputClass} value={goal} onChange={(e) => setGoal(digits(e.target.value))} aria-invalid={!!f.goal_amount} />
        </Field>
        <Field label="Посилання на банку" hint="Кнопка «Підтримати без ставки». Monobank-банка або рахунок фонду." error={f.donate_url}>
          <input name="donate_url" type="url" className={inputClass} defaultValue={settings.donate_url ?? ""} placeholder="https://send.monobank.ua/jar/…" aria-invalid={!!f.donate_url} />
        </Field>
      </fieldset>

      <fieldset className="grid gap-5 border-t border-primary/10 pt-8 @lg:grid-cols-2 @4xl:grid-cols-4">
        <legend className="mb-4 text-lg font-bold tracking-tight text-primary">Правила ставок</legend>
        <Field label="Анти-снайпінг: вікно, хв" hint="Ставка в останні N хвилин продовжує лот." error={f.snipe_window_minutes}>
          <input name="snipe_window_minutes" inputMode="decimal" className={inputClass} value={windowMin} onChange={(e) => setWindowMin(e.target.value)} aria-invalid={!!f.snipe_window_minutes} />
        </Field>
        <Field label="Анти-снайпінг: продовження, хв" hint="До скількох хвилин від ставки." error={f.snipe_extend_minutes}>
          <input name="snipe_extend_minutes" inputMode="decimal" className={inputClass} value={extendMin} onChange={(e) => setExtendMin(e.target.value)} aria-invalid={!!f.snipe_extend_minutes} />
        </Field>
        <Field label="Максимальна ставка, ₴" hint="Захист від помилкових сум." error={f.max_bid_amount}>
          <input name="max_bid_amount" inputMode="numeric" className={inputClass} value={maxBid} onChange={(e) => setMaxBid(digits(e.target.value))} aria-invalid={!!f.max_bid_amount} />
        </Field>
        <Field label="Пауза між ставками, с" hint="Для одного учасника." error={f.min_seconds_between_bids}>
          <input name="min_seconds_between_bids" inputMode="numeric" className={inputClass} defaultValue={settings.min_seconds_between_bids} aria-invalid={!!f.min_seconds_between_bids} />
        </Field>
        <p className="text-sm text-muted-foreground @lg:col-span-2 @4xl:col-span-4">
          {Number(windowMin) > 0
            ? `Зараз: ставка за ${windowMin} хв до закриття продовжує лот до ${extendMin} хв від моменту ставки.`
            : "Анти-снайпінг вимкнено: лоти закриваються рівно в зазначений час."}
        </p>
      </fieldset>

      <fieldset className="grid gap-5 border-t border-primary/10 pt-8 @lg:grid-cols-2">
        <legend className="mb-4 text-lg font-bold tracking-tight text-primary">Фінал 14.11</legend>
        <Field label="Пряма трансляція" hint="Посилання YouTube або Instagram Live. Показується на сторінці фіналу й на головній." error={f.stream_url}>
          <input name="stream_url" type="url" className={inputClass} defaultValue={settings.stream_url ?? ""} placeholder="https://www.youtube.com/watch?v=…" aria-invalid={!!f.stream_url} />
        </Field>
        <div className="-mx-3 self-end">
          <Check name="final_published" defaultChecked={settings.final_published}>
            <b className="font-medium text-primary">Опублікувати підсумки</b>
            <span className="block text-xs text-muted-foreground">Сторінка фіналу покаже суму, переможців (за їхньою згодою) і подяки.</span>
          </Check>
        </div>
      </fieldset>

      <SaveBar pending={pending} ok={state.ok} error={state.error} at={state.at} label="Зберегти налаштування" />
    </form>
  );
}

export function DonationForm() {
  const { state, onSubmit, pending } = useFormAction(addDonation);
  const form = useRef<HTMLFormElement>(null);
  // Clear only after a successful save, so a typo isn't lost on an error.
  useEffect(() => {
    if (state.ok) form.current?.reset();
  }, [state]);
  return (
    <form
      ref={form}
      onSubmit={onSubmit}
      noValidate
      className="grid gap-3 @xl:grid-cols-[10rem_minmax(0,1fr)_auto] @xl:items-start"
    >
      <Field label="Сума, ₴" error={state.fields?.amount}>
        <input name="amount" inputMode="numeric" className={inputClass} onInput={(e) => (e.currentTarget.value = digits(e.currentTarget.value))} required aria-invalid={!!state.fields?.amount} />
      </Field>
      <Field label="Примітка" hint="Наприклад: «Банка, 05.11» або назва партнера.">
        <input name="note" className={inputClass} maxLength={200} />
      </Field>
      <Button type="submit" className="@xl:mt-7" disabled={pending}><Plus size={18} weight="bold" /> Додати</Button>
      {(state.ok || state.error) && <p key={state.at} className={`text-sm font-medium @xl:col-span-3 ${state.error ? "text-destructive" : "text-primary"}`}>{state.error ?? state.ok}</p>}
    </form>
  );
}
