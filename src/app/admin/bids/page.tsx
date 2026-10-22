import Form from "next/form";
import Link from "next/link";
import { DownloadSimple, Prohibit, ProhibitInset, XCircle } from "@phosphor-icons/react/dist/ssr";
import { BidStatusBadge, Empty, PAGE_SIZE, PageHeader, Pager, Panel, Table, Tabs, pageFrom, td, th, tr, DownloadLink } from "@/components/admin/kit";
import { AutoSubmitSelect } from "@/components/admin/AutoSubmitSelect";
import { ConfirmAction } from "@/components/admin/ConfirmAction";
import { Badge, buttonClass } from "@/components/ui";
import { cancelBid, setBlocked } from "@/app/admin/actions";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatUah } from "@/lib/format";
import { formatKyivPrecise } from "@/lib/time";
import type { AdminBid } from "@/lib/types";

export const metadata = { title: "Ставки" };

type Props = { searchParams: Promise<{ lot?: string; status?: string; page?: string }> };

export default async function BidsPage({ searchParams }: Props) {
  const { profile } = await requireStaff();
  const isAdmin = profile.role === "admin";
  const q = await searchParams;
  const page = pageFrom(q.page);
  const status = q.status === "valid" || q.status === "cancelled" ? q.status : "";
  const supabase = await createClient();

  let query = supabase.from("admin_bids").select("*", { count: "exact" }).order("created_at", { ascending: false }).range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  if (q.lot) query = query.eq("lot_id", q.lot);
  if (status) query = query.eq("status", status);
  const [{ data: bids, count }, { data: lots }] = await Promise.all([
    query.returns<AdminBid[]>(),
    supabase.from("lots").select("id, title_uk").neq("status", "draft").order("sort_order"),
  ]);

  return (
    <>
      <PageHeader
        title="Ставки"
        description="Усі ставки за часом. Підозрілу ставку можна скасувати: ціна лота перерахується від наступної дійсної ставки."
        actions={isAdmin && <DownloadLink href="/admin/export/bids" className={buttonClass("ghost")}><DownloadSimple size={18} weight="light" /> Усі ставки CSV</DownloadLink>}
      />
      <Panel flush title={
        <div className="flex flex-wrap items-center gap-3">
          <Tabs base="/admin/bids" param="status" current={status} query={{ lot: q.lot }} items={[{ value: "", label: "Усі" }, { value: "valid", label: "Дійсні" }, { value: "cancelled", label: "Скасовані" }]} />
          <Form action="/admin/bids" className="flex items-center gap-2">
            {status && <input type="hidden" name="status" value={status} />}
            <AutoSubmitSelect name="lot" defaultValue={q.lot ?? ""} aria-label="Лот" className="w-64 text-sm">
              <option value="">Усі лоти</option>
              {(lots ?? []).map((l) => <option key={l.id} value={l.id}>{l.title_uk}</option>)}
            </AutoSubmitSelect>
            <noscript><button className={buttonClass("ghost", "sm")}>Показати</button></noscript>
          </Form>
        </div>
      }>
        {!bids?.length ? <Empty>Ставок за цим фільтром немає.</Empty> : (
          <Table>
            <thead>
              <tr>
                <th className={th}>Час (Київ)</th>
                <th className={th}>Лот</th>
                <th className={th}>Учасник</th>
                <th className={`${th} text-right`}>Сума</th>
                <th className={th}>Статус</th>
                <th className={`${th} text-right`}>Дії</th>
              </tr>
            </thead>
            <tbody>
              {bids.map((b) => (
                <tr key={b.id} className={tr}>
                  <td className={`${td} whitespace-nowrap tabular-nums text-muted-foreground`}>{formatKyivPrecise(b.created_at)}</td>
                  <td className={td}>
                    <Link href={`/admin/bids?lot=${b.lot_id}`} className="block max-w-[14rem] truncate font-medium text-primary hover:underline">{b.lot_title}</Link>
                  </td>
                  <td className={td}>
                    <span className="flex items-center gap-2 font-medium">
                      {b.bidder_name}
                      {b.bidder_blocked && <Badge tone="danger">заблокований</Badge>}
                    </span>
                    <span className="block text-xs text-muted-foreground">{b.bidder_email ? `${b.bidder_email} · ` : ""}на сайті: {b.public_name ?? "анонімно"}</span>
                  </td>
                  <td className={`${td} whitespace-nowrap text-right font-bold tabular-nums ${b.status === "cancelled" ? "text-muted-foreground line-through" : "text-primary"}`}>{formatUah(b.amount)}</td>
                  <td className={td}>
                    <span className="flex flex-wrap gap-1"><BidStatusBadge status={b.status} />{b.is_leading && <Badge tone="accent">лідирує</Badge>}</span>
                    {b.cancel_reason && <span className="mt-1 block max-w-[14rem] text-xs text-muted-foreground">{b.cancel_reason}</span>}
                  </td>
                  <td className={td}>
                    <div className="flex justify-end gap-1.5">
                      {b.status === "valid" && (
                        <ConfirmAction
                          action={cancelBid.bind(null, b.id)}
                          title="Скасувати ставку?"
                          description={`${formatUah(b.amount)} від ${b.bidder_name} на «${b.lot_title}». ${b.is_leading ? "Лідером стане попередня дійсна ставка." : "Ця ставка не лідирує, ціна лота не зміниться."}`}
                          reason={{ label: "Причина (видно в журналі)", placeholder: "Наприклад: помилкова сума, дубль акаунта" }}
                          confirmLabel="Скасувати ставку"
                          tone="danger"
                        >
                          <XCircle size={16} weight="light" /> Скасувати
                        </ConfirmAction>
                      )}
                      <ConfirmAction
                        action={setBlocked.bind(null, b.user_id, !b.bidder_blocked)}
                        variant="quiet"
                        title={b.bidder_blocked ? "Розблокувати учасника?" : "Заблокувати учасника?"}
                        description={b.bidder_blocked ? `${b.bidder_name} знову зможе робити ставки.` : `${b.bidder_name} більше не зможе робити ставки. Наявні ставки залишаться: скасуйте їх окремо, якщо потрібно.`}
                        confirmLabel={b.bidder_blocked ? "Розблокувати" : "Заблокувати"}
                        tone={b.bidder_blocked ? "primary" : "danger"}
                      >
                        {b.bidder_blocked ? <ProhibitInset size={16} weight="light" /> : <Prohibit size={16} weight="light" />}
                        <span className="sr-only sm:not-sr-only">{b.bidder_blocked ? "Розблокувати" : "Блок"}</span>
                      </ConfirmAction>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
        <Pager page={page} total={count ?? 0} base="/admin/bids" query={{ lot: q.lot, status: status || undefined }} />
      </Panel>
    </>
  );
}
