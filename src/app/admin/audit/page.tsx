import Link from "next/link";
import { Empty, PAGE_SIZE, PageHeader, Pager, Panel, Table, Tabs, lotStatusLabel, pageFrom, roleLabel, td, th, tr } from "@/components/admin/kit";
import { Badge } from "@/components/ui";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatUah } from "@/lib/format";
import { formatKyiv, formatKyivPrecise } from "@/lib/time";
import type { AuditEntry, LotStatus, Role } from "@/lib/types";

export const metadata = { title: "Журнал дій" };

const TABLES: Record<string, string> = { lots: "Лот", lot_images: "Фото", bids: "Ставка", profiles: "Учасник", settings: "Налаштування", donations: "Донат" };
const ACTIONS: Record<AuditEntry["action"], [string, "accent" | "outline" | "danger"]> = { insert: ["створено", "accent"], update: ["змінено", "outline"], delete: ["видалено", "danger"] };

const FIELD: Record<string, string> = {
  title_uk: "назва", title_en: "назва EN", description_uk: "опис", description_en: "опис EN", start_price: "старт", bid_step: "крок",
  ends_at: "закриття", status: "статус", sort_order: "порядок", slug: "адреса", is_blocked: "блокування", role: "роль",
  cancel_reason: "причина", goal_amount: "ціль", max_bid_amount: "макс. ставка", snipe_window_seconds: "вікно анти-снайпінгу",
  snipe_extend_seconds: "продовження", min_seconds_between_bids: "пауза", donate_url: "банка", stream_url: "трансляція",
  final_published: "підсумки", amount: "сума", note: "примітка",
};
// Bookkeeping columns that change on their own and only add noise.
const SKIP = new Set(["updated_at", "created_at", "current_amount", "bid_count", "leading_bid_id", "winner_bid_id", "closed_at", "reminder_sent_at", "cancelled_at", "cancelled_by", "id"]);

function show(key: string, v: unknown): string {
  if (v == null || v === "") return "—";
  if (key === "ends_at") return formatKyiv(String(v));
  if (key === "status" && ["draft", "active", "closed"].includes(String(v))) return lotStatusLabel(v as LotStatus);
  if (key === "status") return v === "cancelled" ? "скасована" : "дійсна";
  if (key === "role") return roleLabel(v as Role);
  if (typeof v === "boolean") return v ? "так" : "ні";
  if (["start_price", "bid_step", "goal_amount", "max_bid_amount", "amount"].includes(key)) return formatUah(Number(v));
  const s = String(v);
  return s.length > 60 ? `${s.slice(0, 57)}…` : s;
}

function changes(e: AuditEntry) {
  if (e.action !== "update") {
    const row = e.new_data ?? e.old_data ?? {};
    const name = row.title_uk ?? row.full_name ?? (row.amount != null ? formatUah(Number(row.amount)) : null);
    return name ? [String(name)] : [];
  }
  return Object.keys(e.new_data ?? {})
    .filter((k) => !SKIP.has(k) && JSON.stringify(e.old_data?.[k]) !== JSON.stringify(e.new_data?.[k]))
    .map((k) => `${FIELD[k] ?? k}: ${show(k, e.old_data?.[k])} → ${show(k, e.new_data?.[k])}`);
}

type Props = { searchParams: Promise<{ table?: string; page?: string }> };

export default async function AuditPage({ searchParams }: Props) {
  await requireAdmin();
  const sp = await searchParams;
  const page = pageFrom(sp.page);
  const table = sp.table && sp.table in TABLES ? sp.table : "";
  const supabase = await createClient();
  let query = supabase.from("admin_audit").select("*", { count: "exact" }).order("created_at", { ascending: false }).range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  if (table) query = query.eq("table_name", table);
  const { data, count } = await query.returns<AuditEntry[]>();

  return (
    <>
      <PageHeader title="Журнал дій" description="Хто, що і коли змінив: лоти, фото, ставки, учасники, налаштування. «Система» — автоматичне закриття лотів." />
      <Panel flush title={<Tabs base="/admin/audit" param="table" current={table} query={{}} items={[{ value: "", label: "Усе" }, ...Object.entries(TABLES).map(([value, label]) => ({ value, label }))]} />}>
        {!data?.length ? <Empty>Записів ще немає.</Empty> : (
          <Table>
            <thead><tr><th className={th}>Час (Київ)</th><th className={th}>Хто</th><th className={th}>Що</th><th className={th}>Зміни</th></tr></thead>
            <tbody>
              {data.map((e) => {
                const [label, tone] = ACTIONS[e.action];
                const lines = changes(e);
                return (
                  <tr key={e.id} className={tr}>
                    <td className={`${td} whitespace-nowrap align-top tabular-nums text-muted-foreground`}>{formatKyivPrecise(e.created_at)}</td>
                    <td className={`${td} align-top font-medium`}>{e.actor_name ?? <span className="text-muted-foreground">Система</span>}</td>
                    <td className={`${td} whitespace-nowrap align-top`}>
                      <span className="mr-2 font-medium text-primary">{TABLES[e.table_name] ?? e.table_name}</span>
                      <Badge tone={tone}>{label}</Badge>
                    </td>
                    <td className={`${td} align-top`}>
                      {e.table_name === "lots" && e.action !== "delete" && e.row_id ? (
                        <Link href={`/admin/lots/${e.row_id}`} className="block space-y-0.5 hover:underline">{lines.map((l) => <span key={l} className="block">{l}</span>)}</Link>
                      ) : (
                        <span className="block space-y-0.5">{lines.length ? lines.map((l) => <span key={l} className="block">{l}</span>) : <span className="text-muted-foreground">—</span>}</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        )}
        <Pager page={page} total={count ?? 0} base="/admin/audit" query={{ table: table || undefined }} />
      </Panel>
    </>
  );
}
