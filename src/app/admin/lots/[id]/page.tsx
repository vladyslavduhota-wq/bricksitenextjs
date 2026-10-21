import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, LockSimple, Trash } from "@phosphor-icons/react/dist/ssr";
import { LotStatusBadge, PageHeader, Panel } from "@/components/admin/kit";
import { LotForm } from "@/components/admin/LotForm";
import { PhotoManager } from "@/components/admin/PhotoManager";
import { ConfirmAction } from "@/components/admin/ConfirmAction";
import { Notice, microLabel } from "@/components/ui";
import { closeLotNow, deleteLot } from "@/app/admin/actions";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatUah } from "@/lib/format";
import { formatKyiv, formatKyivPrecise, formatTimeLeft, toKyivInput } from "@/lib/time";
import type { AdminBid, Lot, LotImage } from "@/lib/types";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ created?: string }> };

export async function generateMetadata({ params }: Props) {
  const supabase = await createClient();
  const { data } = await supabase.from("lots").select("title_uk").eq("id", (await params).id).maybeSingle();
  return { title: data?.title_uk ?? "Лот" };
}

export default async function LotPage({ params, searchParams }: Props) {
  await requireAdmin();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const supabase = await createClient();
  const [{ data: lot }, { data: images }, { data: bids }] = await Promise.all([
    supabase.from("lots").select("*").eq("id", id).maybeSingle<Lot>(),
    supabase.from("lot_images").select("*").eq("lot_id", id).order("sort_order").returns<LotImage[]>(),
    supabase.from("admin_bids").select("*").eq("lot_id", id).eq("status", "valid").order("amount", { ascending: false }).limit(5).returns<AdminBid[]>(),
  ]);
  if (!lot) notFound();
  const leader = bids?.[0];
  const created = (await searchParams).created;

  return (
    <>
      <Link href="/admin/lots" className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"><ArrowLeft /> Усі лоти</Link>
      <PageHeader title={lot.title_uk} description={<span className="inline-flex items-center gap-2"><LotStatusBadge status={lot.status} /> /lots/{lot.slug}</span>} />
      {created && <div className="mb-6"><Notice tone="success">Лот створено. Додайте фото і, коли все готово, зробіть його активним.</Notice></div>}

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="min-w-0 space-y-6">
          <Panel title="Фото">
            <PhotoManager lotId={lot.id} title={lot.title_uk} images={images ?? []} />
          </Panel>
          <Panel>
            <LotForm key={lot.ends_at + lot.status} lot={lot} endsAtDefault={toKyivInput(lot.ends_at)} />
          </Panel>
        </div>

        {/* Price, closing and actions come first when the layout stacks; a sticky side column on wide screens. */}
        <div className="order-first grid gap-6 md:grid-cols-2 xl:sticky xl:top-10 xl:order-none xl:grid-cols-1">

          <Panel>
            <p className={microLabel}>{lot.bid_count ? "Поточна ставка" : "Стартова ціна"}</p>
            <p className="mt-2 text-4xl font-bold tracking-tight tabular-nums text-primary">{formatUah(lot.current_amount ?? lot.start_price)}</p>
            <dl className="mt-5 space-y-2 text-sm">
              <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Ставок</dt><dd className="font-medium tabular-nums">{lot.bid_count}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Лідер</dt><dd className="truncate font-medium">{leader?.bidder_name ?? "—"}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Закриття</dt><dd className="text-right font-medium tabular-nums">{formatKyiv(lot.ends_at)}</dd></div>
              {lot.status === "active" && <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Залишилось</dt><dd className="font-medium">{formatTimeLeft(lot.ends_at)}</dd></div>}
              {lot.closed_at && <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Закрито</dt><dd className="font-medium tabular-nums">{formatKyiv(lot.closed_at)}</dd></div>}
            </dl>
            {lot.status === "active" && (
              <ConfirmAction
                action={closeLotNow.bind(null, lot.id)}
                variant="primary"
                size="md"
                className="mt-6 w-full"
                title="Закрити лот достроково?"
                description={leader ? `Ставки зупиняться зараз. Переможцем стане ${leader.bidder_name} зі ставкою ${formatUah(leader.amount)}, йому надійде лист.` : "Ставки зупиняться зараз. На лот поки немає ставок."}
                confirmLabel="Закрити зараз"
              >
                <LockSimple size={18} weight="light" /> Закрити зараз
              </ConfirmAction>
            )}
          </Panel>

          <Panel title="Найвищі ставки" flush actions={<Link href={`/admin/bids?lot=${lot.id}`} className="text-sm font-medium text-primary hover:underline">Усі</Link>}>
            {bids?.length ? (
              <ul className="divide-y divide-primary/[0.07] pb-2">
                {bids.map((b) => (
                  <li key={b.id} className="flex items-center justify-between gap-3 px-5 py-2.5 text-sm sm:px-6">
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{b.bidder_name}</span>
                      <span className="block text-xs tabular-nums text-muted-foreground">{formatKyivPrecise(b.created_at)}</span>
                    </span>
                    <b className="tabular-nums text-primary">{formatUah(b.amount)}</b>
                  </li>
                ))}
              </ul>
            ) : <p className="px-5 pb-5 text-sm text-muted-foreground sm:px-6">Ставок ще немає.</p>}
          </Panel>

          {lot.bid_count === 0 && (
            <Panel title="Видалення">
              <p className="mb-4 text-sm text-muted-foreground">Лот без ставок можна видалити разом із фото. Лот зі ставками можна лише закрити.</p>
              <ConfirmAction action={deleteLot.bind(null, lot.id)} variant="danger" size="md" tone="danger" title="Видалити лот?" description="Лот і всі його фото буде видалено назавжди." confirmLabel="Видалити лот">
                <Trash size={18} weight="light" /> Видалити лот
              </ConfirmAction>
            </Panel>
          )}
        </div>
      </div>
    </>
  );
}
