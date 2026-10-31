import Link from "next/link";
import { CheckCircle, DownloadSimple, Plus, WarningCircle } from "@phosphor-icons/react/dist/ssr";
import { Empty, PageHeader, Panel, Progress, StatCard, Table, td, th, tr, DownloadLink } from "@/components/admin/kit";
import { Badge, buttonClass } from "@/components/ui";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatUah } from "@/lib/format";
import { formatKyivPrecise } from "@/lib/time";
import type { AdminBid, AuctionStats, Lot, Settings } from "@/lib/types";

export const metadata = { title: "Огляд" };

export default async function AdminHome() {
  const { profile } = await requireStaff();
  const isAdmin = profile.role === "admin";
  const supabase = await createClient();

  const [stats, settings, lots, recent, people, blocked, images] = await Promise.all([
    supabase.from("auction_stats").select("*").single<AuctionStats>(),
    supabase.from("settings").select("*").single<Settings>(),
    supabase.from("lots").select("id, title_uk, title_en, status, current_amount, start_price, bid_count, sort_order").order("sort_order").order("created_at").returns<Lot[]>(),
    supabase.from("admin_bids").select("*").order("created_at", { ascending: false }).limit(8).returns<AdminBid[]>(),
    supabase.from("admin_users").select("id", { count: "exact", head: true }),
    supabase.from("admin_users").select("id", { count: "exact", head: true }).eq("is_blocked", true),
    supabase.from("lot_images").select("lot_id"),
  ]);

  const s = stats.data;
  const all = lots.data ?? [];
  const active = all.filter((l) => l.status === "active");
  const onAir = all.find((l) => l.id === settings.data?.current_lot_id) ?? null;
  const queue = active.filter((l) => l !== onAir);
  const goal = settings.data?.goal_amount ?? 0;
  const withPhotos = new Set((images.data ?? []).map((i) => i.lot_id));

  // What still blocks a clean public start (spec, acceptance criterion 1).
  const published = all.filter((l) => l.status !== "draft");
  const checks = [
    { ok: published.length > 0, text: "Є опубліковані лоти", fix: "/admin/lots" },
    { ok: published.every((l) => withPhotos.has(l.id)), text: `Усі опубліковані лоти мають фото${published.some((l) => !withPhotos.has(l.id)) ? ` (без фото: ${published.filter((l) => !withPhotos.has(l.id)).length})` : ""}`, fix: "/admin/lots" },
    { ok: published.every((l) => l.title_en), text: "Усі опубліковані лоти мають англійську назву", fix: "/admin/lots" },
    { ok: goal > 0, text: "Задано ціль збору", fix: "/admin/settings" },
    { ok: !!settings.data?.donate_url, text: "Додано посилання на банку для донатів", fix: "/admin/settings" },
  ];

  return (
    <>
      <PageHeader
        title="Огляд"
        description="Стан аукціону зараз. Дані оновлюються при кожному відкритті сторінки."
        actions={isAdmin && (
          <>
            <Link href="/admin/lots/new" className={buttonClass("primary")}><Plus size={18} weight="bold" /> Новий лот</Link>
            <DownloadLink href="/admin/export/winners" className={buttonClass("ghost")}><DownloadSimple size={18} weight="light" /> Переможці CSV</DownloadLink>
          </>
        )}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard tone="primary" label="Зібрано" value={formatUah(s?.total_raised ?? 0)} note={goal ? `Ціль ${formatUah(goal)} · ${Math.round(((s?.total_raised ?? 0) / goal) * 100)}%` : "Ціль ще не задана"}>
          {goal > 0 && <Progress value={((s?.total_raised ?? 0) / goal) * 100} light />}
        </StatCard>
        <StatCard label="Активні лоти" value={active.length} note={`усього ${all.length}, чернеток ${all.filter((l) => l.status === "draft").length}`} />
        <StatCard label="Ставки" value={s?.bid_count ?? 0} note="дійсні, на опублікованих лотах" />
        <StatCard tone="accent" label="Учасники" value={people.count ?? 0} note={blocked.count ? `заблоковано: ${blocked.count}` : "заблокованих немає"} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-5">
        <Panel title="Ефір" flush className="lg:col-span-2" actions={isAdmin && <Link href="/admin/live" className="text-sm font-medium text-primary hover:underline">Керувати</Link>}>
          {onAir || queue.length ? (
            <ul className="divide-y divide-primary/[0.07]">
              {[...(onAir ? [onAir] : []), ...queue.slice(0, 5)].map((l) => (
                <li key={l.id} className="flex items-center justify-between gap-3 px-5 py-3 sm:px-6">
                  <div className="min-w-0">
                    {isAdmin ? <Link href={`/admin/lots/${l.id}`} className="block truncate font-medium text-primary hover:underline">{l.title_uk}</Link> : <p className="truncate font-medium text-primary">{l.title_uk}</p>}
                    <p className="text-xs text-muted-foreground">{l.bid_count ? `${formatUah(l.current_amount)} · ставок ${l.bid_count}` : `старт ${formatUah(l.start_price)} · без ставок`}</p>
                  </div>
                  {l === onAir ? <Badge tone="accent">В ефірі</Badge> : <Badge tone="outline">Далі</Badge>}
                </li>
              ))}
            </ul>
          ) : <Empty>Активних лотів немає.</Empty>}
        </Panel>

        <Panel title="Останні ставки" flush className="lg:col-span-3" actions={<Link href="/admin/bids" className="text-sm font-medium text-primary hover:underline">Усі ставки</Link>}>
          {(recent.data ?? []).length === 0 ? <Empty>Ставок ще немає.</Empty> : (
            <Table>
              <thead><tr><th className={th}>Час</th><th className={th}>Лот</th><th className={th}>Учасник</th><th className={`${th} text-right`}>Сума</th></tr></thead>
              <tbody>
                {recent.data!.map((b) => (
                  <tr key={b.id} className={tr}>
                    <td className={`${td} whitespace-nowrap tabular-nums text-muted-foreground`}>{formatKyivPrecise(b.created_at)}</td>
                    <td className={`${td} max-w-[14rem] truncate`}>{b.lot_title}</td>
                    <td className={td}>{b.bidder_name}</td>
                    <td className={`${td} whitespace-nowrap text-right font-bold tabular-nums ${b.status === "cancelled" ? "text-muted-foreground line-through" : "text-primary"}`}>{formatUah(b.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Panel>
      </div>

      {isAdmin && (
        <Panel title="Перевірка перед стартом" className="mt-6">
          <ul className="grid gap-2 sm:grid-cols-2">
            {checks.map((c) => (
              <li key={c.text} className="flex items-start gap-3 rounded-2xl px-3 py-2.5 ring-1 ring-primary/10">
                {c.ok ? <CheckCircle size={22} weight="fill" className="shrink-0 text-primary" /> : <WarningCircle size={22} weight="fill" className="shrink-0 text-destructive" />}
                <span className="flex-1 text-sm">{c.text}</span>
                {!c.ok && <Link href={c.fix} className="text-sm font-medium text-primary hover:underline">Виправити</Link>}
              </li>
            ))}
          </ul>
        </Panel>
      )}
    </>
  );
}
