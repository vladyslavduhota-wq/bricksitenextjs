import Image from "next/image";
import Link from "next/link";
import { ArrowSquareOut, Broadcast, CheckCircle, ImageSquare, Pause, SkipForward, Trophy, XCircle } from "@phosphor-icons/react/dist/ssr";
import { Empty, PageHeader, Panel, Table, td, th, tr } from "@/components/admin/kit";
import { ConfirmAction } from "@/components/admin/ConfirmAction";
import { ActionButton, LiveRefresh, ManualBidForm } from "@/components/admin/LiveControls";
import { Badge, buttonClass, microLabel } from "@/components/ui";
import { cancelBid, finishLot, nextLot, pauseShow, showLot } from "@/app/admin/actions";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { photoUrl } from "@/lib/supabase/env";
import { formatUah } from "@/lib/format";
import { minNextBid } from "@/lib/bidding";
import { formatKyivPrecise } from "@/lib/time";
import type { AdminBid, Lot } from "@/lib/types";

export const metadata = { title: "Ефір" };

/** The presenter's control panel: what is on air, closing it, the next lot, and bids from the room. */
export default async function LivePage() {
  await requireAdmin();
  const supabase = await createClient();
  const [{ data: show }, { data: lots }, { data: stats }] = await Promise.all([
    supabase.from("settings").select("current_lot_id").single(),
    supabase.from("lots").select("*").neq("status", "draft").order("sort_order").order("created_at").returns<Lot[]>(),
    supabase.from("auction_stats").select("total_raised").single(),
  ]);
  const all = lots ?? [];
  const lot = all.find((l) => l.id === show?.current_lot_id) ?? null;
  const [{ data: bids }, { data: cover }] = lot
    ? await Promise.all([
        supabase.from("admin_bids").select("*").eq("lot_id", lot.id).order("created_at", { ascending: false }).limit(15).returns<AdminBid[]>(),
        supabase.from("lot_images").select("path").eq("lot_id", lot.id).order("sort_order").limit(1).maybeSingle(),
      ])
    : [{ data: [] as AdminBid[] }, { data: null }];
  const leader = bids?.find((b) => b.is_leading);
  const queue = all.filter((l) => l.status === "active" && l.id !== lot?.id);
  const done = all.filter((l) => l.status === "closed");
  const open = lot?.status === "active";
  const min = lot ? minNextBid(lot) : 0;

  return (
    <>
      <LiveRefresh />
      <PageHeader
        title="Ефір"
        description="Лот в ефірі бачать усі глядачі на сайті й на екрані трансляції. Оновлюється наживо."
        actions={
          <>
            <a href="/screen" target="_blank" rel="noreferrer" className={buttonClass("ghost")}><ArrowSquareOut size={18} weight="light" /> Екран трансляції</a>
            <a href="/live" target="_blank" rel="noreferrer" className={buttonClass("ghost")}><ArrowSquareOut size={18} weight="light" /> Сторінка глядачів</a>
          </>
        }
      />

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="min-w-0 space-y-6">
          <Panel title={<span className="inline-flex items-center gap-2"><Broadcast size={20} weight="light" /> Зараз в ефірі</span>} actions={<span className="text-sm text-muted-foreground">Зібрано <b className="tabular-nums text-primary">{formatUah(stats?.total_raised ?? 0)}</b></span>}>
            {lot ? (
              <div>
                <div className="flex flex-wrap gap-5">
                  <span className="relative grid h-40 w-32 shrink-0 place-items-center overflow-hidden rounded-2xl bg-navy-deep text-primary-foreground/40">
                    {cover ? <Image src={photoUrl(cover.path)} alt="" fill sizes="128px" className="object-contain" /> : <ImageSquare size={28} weight="light" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    {open ? <Badge tone="accent">Ставки відкрито</Badge> : <Badge tone="primary">Лот завершено</Badge>}
                    <h2 className="mt-2 text-2xl font-bold tracking-tight text-primary">{lot.title_uk}</h2>
                    <p className="mt-3 text-4xl font-bold tracking-tight tabular-nums text-primary">{formatUah(lot.current_amount ?? lot.start_price)}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {lot.current_amount == null ? "стартова ціна · ставок немає" : `ставок ${lot.bid_count} · крок ${formatUah(lot.bid_step)}`}
                    </p>
                    {leader && (
                      <p className="mt-3 inline-flex flex-wrap items-center gap-2 text-sm">
                        <Trophy size={16} weight="fill" className="text-primary" />
                        <b className="text-primary">{leader.bidder_name}</b>
                        {leader.is_manual && <Badge tone="outline">із зали</Badge>}
                        {leader.bidder_phone && <a href={`tel:${leader.bidder_phone.replace(/[^\d+]/g, "")}`} className="tabular-nums text-muted-foreground hover:underline">{leader.bidder_phone}</a>}
                      </p>
                    )}
                  </div>
                </div>
                <div className="mt-6 flex flex-wrap gap-2 border-t border-primary/10 pt-5">
                  {open && (
                    <ConfirmAction
                      action={finishLot}
                      variant="primary"
                      size="md"
                      title="Завершити лот?"
                      description={leader ? `Ставки зупиняться, і всі побачать переможця: ${leader.bidder_name}, ${formatUah(leader.amount)}.` : "Ставок немає: лот завершиться без переможця."}
                      confirmLabel="Завершити й показати переможця"
                    >
                      <CheckCircle size={18} weight="light" /> Завершити лот
                    </ConfirmAction>
                  )}
                  {open ? (
                    <ConfirmAction action={nextLot} variant="ghost" size="md" title="Перейти до наступного лота?" description="Цей лот ще не завершено: він повернеться в чергу без переможця, а ставки на нього зупиняться." confirmLabel="Перейти">
                      <SkipForward size={18} weight="light" /> Наступний лот
                    </ConfirmAction>
                  ) : (
                    <ActionButton action={nextLot} variant="accent"><SkipForward size={18} weight="light" /> Наступний лот</ActionButton>
                  )}
                  <ActionButton action={pauseShow}><Pause size={18} weight="light" /> Пауза</ActionButton>
                </div>
              </div>
            ) : (
              <div className="py-6 text-center">
                <p className="text-muted-foreground">Зараз нічого не в ефірі: глядачі бачать екран очікування.</p>
                <div className="mt-5 flex justify-center">
                  <ActionButton action={nextLot} variant="primary" size="lg"><Broadcast size={20} weight="light" /> Почати з першого лота в черзі</ActionButton>
                </div>
              </div>
            )}
          </Panel>

          {lot && open && (
            <Panel title="Ставка із зали або телефоном">
              <ManualBidForm lotId={lot.id} min={min} step={lot.bid_step} />
            </Panel>
          )}

          {lot && (
            <Panel title="Ставки на цей лот" flush>
              {!bids?.length ? <Empty>Ставок ще немає.</Empty> : (
                <Table>
                  <thead><tr><th className={th}>Час</th><th className={th}>Учасник</th><th className={`${th} text-right`}>Сума</th><th className={`${th} text-right`}>Дії</th></tr></thead>
                  <tbody>
                    {bids.map((b) => (
                      <tr key={b.id} className={tr}>
                        <td className={`${td} whitespace-nowrap tabular-nums text-muted-foreground`}>{formatKyivPrecise(b.created_at)}</td>
                        <td className={td}>
                          <span className="flex flex-wrap items-center gap-2 font-medium">{b.bidder_name}{b.is_manual && <Badge tone="outline">із зали</Badge>}{b.is_leading && <Badge tone="accent">лідирує</Badge>}</span>
                          <span className="block text-xs text-muted-foreground">{b.bidder_phone ?? b.bidder_email ?? ""}</span>
                        </td>
                        <td className={`${td} whitespace-nowrap text-right font-bold tabular-nums ${b.status === "cancelled" ? "text-muted-foreground line-through" : "text-primary"}`}>{formatUah(b.amount)}</td>
                        <td className={`${td} text-right`}>
                          {b.status === "valid" && (
                            <ConfirmAction action={cancelBid.bind(null, b.id)} title="Скасувати ставку?" description={`${formatUah(b.amount)} від ${b.bidder_name}.`} reason={{ label: "Причина (видно в журналі)" }} confirmLabel="Скасувати ставку" tone="danger">
                              <XCircle size={16} weight="light" /> Скасувати
                            </ConfirmAction>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              )}
            </Panel>
          )}
        </div>

        <div className="space-y-6 xl:sticky xl:top-10">
          <Panel title="Черга" flush actions={<Link href="/admin/lots" className="text-sm font-medium text-primary hover:underline">Лоти</Link>}>
            {queue.length ? (
              <ul className="divide-y divide-primary/[0.07] pb-2">
                {queue.map((l, k) => (
                  <li key={l.id} className="flex items-center justify-between gap-3 px-5 py-2.5 sm:px-6">
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-primary">{k + 1}. {l.title_uk}</span>
                      <span className="block text-xs tabular-nums text-muted-foreground">старт {formatUah(l.start_price)}</span>
                    </span>
                    <ActionButton action={showLot.bind(null, l.id)} variant="ghost">Показати</ActionButton>
                  </li>
                ))}
              </ul>
            ) : <p className="px-5 pb-5 text-sm text-muted-foreground sm:px-6">Активних лотів у черзі немає.</p>}
          </Panel>

          {done.length > 0 && (
            <Panel title="Завершені" flush>
              <ul className="divide-y divide-primary/[0.07] pb-2">
                {done.map((l) => (
                  <li key={l.id} className="flex items-center justify-between gap-3 px-5 py-2.5 sm:px-6">
                    <span className="min-w-0 truncate text-sm text-primary">{l.title_uk}</span>
                    <span className="shrink-0 text-sm font-bold tabular-nums text-primary">{l.current_amount != null ? formatUah(l.current_amount) : "—"}</span>
                  </li>
                ))}
              </ul>
              <p className={`${microLabel} px-5 pb-4 sm:px-6`}>Контакти переможців: експорт CSV в «Огляді»</p>
            </Panel>
          )}
        </div>
      </div>
    </>
  );
}
