"use client";

import { useState } from "react";
import { FloppyDisk } from "@phosphor-icons/react";
import { Button, Field, Notice, inputClass } from "@/components/ui";
import { cn } from "@/lib/utils";
import { slugify, formatUah } from "@/lib/format";
import { saveLot } from "@/app/admin/actions";
import { useFormAction } from "./useFormAction";
import type { Lot, LotStatus } from "@/lib/types";

const STATUS_OPTIONS: { value: LotStatus; label: string; hint: string }[] = [
  { value: "draft", label: "Чернетка", hint: "Бачать лише адміністратори" },
  { value: "active", label: "Активний", hint: "У черзі ефіру; ставки, коли лот в ефірі" },
  { value: "closed", label: "Закритий", hint: "Показано, переможця зафіксовано" },
];

/** Every field of a lot from the spec (5.8), UA and EN side by side. */
export function LotForm({ lot }: { lot?: Lot }) {
  const { state, onSubmit, pending } = useFormAction(saveLot);
  const f = state.fields ?? {};
  const hasBids = (lot?.bid_count ?? 0) > 0;
  const [title, setTitle] = useState(lot?.title_uk ?? "");
  const [slug, setSlug] = useState(lot?.slug ?? "");
  const [status, setStatus] = useState<LotStatus>(lot?.status ?? "draft");
  const [step, setStep] = useState(String(lot?.bid_step ?? 100));
  const [start, setStart] = useState(lot ? String(lot.start_price) : "");
  const autoSlug = slugify(title);

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-8">
      {lot && <input type="hidden" name="id" value={lot.id} />}

      <fieldset className="space-y-5">
        <legend className="mb-4 text-lg font-bold tracking-tight text-primary">Назва та опис</legend>
        <div className="grid gap-5 @2xl:grid-cols-2">
          <Field label="Назва (UA) *" error={f.title_uk}>
            <input name="title_uk" className={inputClass} value={title} onChange={(e) => setTitle(e.target.value)} maxLength={160} required aria-invalid={!!f.title_uk} />
          </Field>
          <Field label="Назва (EN)" hint="Без неї англійська версія покаже українську назву.">
            <input name="title_en" className={inputClass} defaultValue={lot?.title_en} maxLength={160} />
          </Field>
          <Field label="Опис (UA)" hint="Коротко й нейтрально, без історій (ТЗ, розд. 6)." error={f.description_uk}>
            <textarea name="description_uk" rows={5} className={inputClass} defaultValue={lot?.description_uk} maxLength={4000} />
          </Field>
          <Field label="Опис (EN)">
            <textarea name="description_en" rows={5} className={inputClass} defaultValue={lot?.description_en} maxLength={4000} />
          </Field>
        </div>
      </fieldset>

      <fieldset className="space-y-5 border-t border-primary/10 pt-8">
        <legend className="mb-4 text-lg font-bold tracking-tight text-primary">Ціна</legend>
        <div className="grid gap-5 @lg:grid-cols-2">
          <Field label="Стартова ціна, ₴ *" hint={hasBids ? "На лот уже є ставки: стартову ціну змінити не можна." : "Перша ставка має бути не меншою."} error={f.start_price}>
            <input name="start_price" inputMode="numeric" className={inputClass} value={start} onChange={(e) => setStart(e.target.value.replace(/[^\d]/g, ""))} readOnly={hasBids} aria-readonly={hasBids} aria-invalid={!!f.start_price} />
          </Field>
          <Field label="Крок ставки, ₴ *" hint={Number(step) > 0 ? `Кожна наступна ставка більша щонайменше на ${formatUah(Number(step))}.` : undefined} error={f.bid_step}>
            <input name="bid_step" inputMode="numeric" className={inputClass} value={step} onChange={(e) => setStep(e.target.value.replace(/[^\d]/g, ""))} aria-invalid={!!f.bid_step} />
          </Field>
        </div>
      </fieldset>

      <fieldset className="space-y-5 border-t border-primary/10 pt-8">
        <legend className="mb-4 text-lg font-bold tracking-tight text-primary">Публікація</legend>
        <div role="radiogroup" aria-label="Статус" className="grid gap-2 @xl:grid-cols-3">
          {STATUS_OPTIONS.map((o) => (
            <label
              key={o.value}
              className={cn(
                "cursor-pointer rounded-2xl p-4 ring-1 transition",
                status === o.value ? "bg-primary text-primary-foreground ring-primary" : "bg-card text-primary ring-primary/15 hover:bg-primary/[0.03]",
              )}
            >
              <input type="radio" name="status" value={o.value} checked={status === o.value} onChange={() => setStatus(o.value)} className="sr-only" />
              <span className="block font-bold">{o.label}</span>
              <span className={cn("mt-1 block text-xs", status === o.value ? "text-primary-foreground/70" : "text-muted-foreground")}>{o.hint}</span>
            </label>
          ))}
        </div>
        {f.status && <p className="text-xs text-destructive">{f.status}</p>}
        <Field label="Порядок в ефірі" hint="Менше число показується раніше. «Наступний лот» іде в цьому порядку." className="max-w-xs">
          <input name="sort_order" type="number" step={1} className={inputClass} defaultValue={lot?.sort_order ?? 0} />
        </Field>
        <Field label="Адреса сторінки" hint={slug ? undefined : autoSlug ? `Буде: /lots/${autoSlug}` : "Латинські літери, цифри й дефіси."} error={f.slug}>
          <div className="flex items-center rounded-2xl bg-card ring-1 ring-primary/15 focus-within:ring-2 focus-within:ring-accent">
            <span className="pl-4 text-muted-foreground">/lots/</span>
            <input name="slug" className="w-full rounded-2xl bg-transparent py-3 pl-1 pr-4 outline-none" value={slug} placeholder={autoSlug} onChange={(e) => setSlug(e.target.value.toLowerCase())} maxLength={60} aria-invalid={!!f.slug} />
          </div>
        </Field>
      </fieldset>

      <div className="sticky bottom-4 z-10 flex flex-wrap items-center gap-3 rounded-full bg-background/80 p-2 shadow-soft ring-1 ring-primary/10 backdrop-blur-xl">
        <Button type="submit" size="md" disabled={pending}><FloppyDisk size={18} weight="light" /> {pending ? "Зберігаємо…" : lot ? "Зберегти зміни" : "Створити лот"}</Button>
        {state.ok && <span key={state.at} className="px-2 text-sm font-medium text-primary">{state.ok}</span>}
        {state.error && <span key={state.at} className="px-2 text-sm font-medium text-destructive">{state.error}</span>}
      </div>
      {!lot && <Notice>Фото можна додати одразу після створення лота.</Notice>}
    </form>
  );
}
