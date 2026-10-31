import Form from "next/form";
import { MagnifyingGlass, Prohibit, ProhibitInset } from "@phosphor-icons/react/dist/ssr";
import { Empty, PAGE_SIZE, PageHeader, Pager, Panel, RoleBadge, Table, Tabs, pageFrom, td, th, tr } from "@/components/admin/kit";
import { ConfirmAction } from "@/components/admin/ConfirmAction";
import { RoleForm } from "@/components/admin/RoleForm";
import { Badge, inputClass } from "@/components/ui";
import { setBlocked } from "@/app/admin/actions";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatKyiv } from "@/lib/time";
import type { AdminUser } from "@/lib/types";

export const metadata = { title: "Учасники" };

type Props = { searchParams: Promise<{ q?: string; filter?: string; page?: string }> };

export default async function UsersPage({ searchParams }: Props) {
  const viewer = await requireStaff();
  const isAdmin = viewer.profile.role === "admin";
  const sp = await searchParams;
  const page = pageFrom(sp.page);
  const filter = ["blocked", "staff", "bidders"].includes(sp.filter ?? "") ? sp.filter! : "";
  // Strip characters that have meaning in PostgREST filter syntax.
  const search = (sp.q ?? "").replace(/[,()*%\\]/g, " ").trim().slice(0, 60);
  const supabase = await createClient();

  let query = supabase.from("admin_users").select("*", { count: "exact" }).order("created_at", { ascending: false }).range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  if (search) query = query.or(`full_name.ilike.*${search}*${isAdmin ? `,email.ilike.*${search}*,phone.ilike.*${search}*` : ""}`);
  if (filter === "blocked") query = query.eq("is_blocked", true);
  if (filter === "staff") query = query.neq("role", "participant");
  if (filter === "bidders") query = query.gt("bid_count", 0);
  const { data: users, count } = await query.returns<AdminUser[]>();

  return (
    <>
      <PageHeader
        title="Учасники"
        description={isAdmin ? "Зареєстровані учасники та їхні контакти. Контакти бачать лише адміністратори." : "Зареєстровані учасники. Контакти бачать лише адміністратори."}
      />
      <Panel flush title={
        <div className="flex flex-wrap items-center gap-3">
          <Tabs base="/admin/users" param="filter" current={filter} query={{ q: search || undefined }} items={[
            { value: "", label: "Усі" }, { value: "bidders", label: "Зі ставками" }, { value: "blocked", label: "Заблоковані" }, { value: "staff", label: "Команда" },
          ]} />
          <Form action="/admin/users" className="relative">
            {filter && <input type="hidden" name="filter" value={filter} />}
            <MagnifyingGlass size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input name="q" defaultValue={search} placeholder={isAdmin ? "Ім'я, email або телефон" : "Ім'я"} aria-label="Пошук" className={`${inputClass} h-11 w-64 py-0 pl-11 text-sm`} />
          </Form>
        </div>
      }>
        {!users?.length ? <Empty>{search ? `Нікого не знайдено за «${search}».` : "Учасників за цим фільтром немає."}</Empty> : (
          <Table>
            <thead>
              <tr>
                <th className={th}>Учасник</th>
                {isAdmin && <th className={th}>Контакти</th>}
                <th className={`${th} text-right`}>Ставок</th>
                <th className={th}>З нами з</th>
                <th className={`${th} text-right`}>{isAdmin ? "Роль і доступ" : "Доступ"}</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className={tr}>
                  <td className={td}>
                    <span className="flex flex-wrap items-center gap-2 font-medium text-primary">{u.full_name}<RoleBadge role={u.role} />{u.is_blocked && <Badge tone="danger">заблокований</Badge>}</span>
                  </td>
                  {isAdmin && (
                    <td className={td}>
                      <a href={`mailto:${u.email}`} className="block hover:underline">{u.email}</a>
                      <a href={`tel:${u.phone?.replace(/[^\d+]/g, "")}`} className="block text-xs tabular-nums text-muted-foreground hover:underline">{u.phone}</a>
                    </td>
                  )}
                  <td className={`${td} text-right tabular-nums`}>{u.bid_count}</td>
                  <td className={`${td} whitespace-nowrap tabular-nums text-muted-foreground`}>{formatKyiv(u.created_at)}</td>
                  <td className={td}>
                    <div className="flex items-center justify-end gap-1.5">
                      {isAdmin && u.id !== viewer.id && <RoleForm userId={u.id} role={u.role} />}
                      {u.role === "participant" && (
                        <ConfirmAction
                          action={setBlocked.bind(null, u.id, !u.is_blocked)}
                          variant="quiet"
                          title={u.is_blocked ? "Розблокувати учасника?" : "Заблокувати учасника?"}
                          description={u.is_blocked ? `${u.full_name} знову зможе робити ставки.` : `${u.full_name} більше не зможе робити ставки. Наявні ставки залишаться: скасуйте їх у розділі «Ставки», якщо потрібно.`}
                          confirmLabel={u.is_blocked ? "Розблокувати" : "Заблокувати"}
                          tone={u.is_blocked ? "primary" : "danger"}
                        >
                          {u.is_blocked ? <ProhibitInset size={16} weight="light" /> : <Prohibit size={16} weight="light" />}
                          {u.is_blocked ? "Розблокувати" : "Блок"}
                        </ConfirmAction>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
        <Pager page={page} total={count ?? 0} base="/admin/users" query={{ q: search || undefined, filter: filter || undefined }} />
      </Panel>
    </>
  );
}
