import Link from "next/link";
import type { ReactNode } from "react";
import { Badge, Bezel, microLabel } from "@/components/ui";
import { cn } from "@/lib/utils";
import type { BidStatus, LotStatus, Role } from "@/lib/types";

export function PageHeader({ title, description, actions }: { title: ReactNode; description?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-3xl font-bold tracking-tight text-primary md:text-5xl">{title}</h1>
        {description && <p className="mt-2 max-w-[60ch] text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

/** A titled bezel card; `flush` drops the padding for tables. */
export function Panel({ title, actions, children, flush = false, className }: { title?: ReactNode; actions?: ReactNode; children: ReactNode; flush?: boolean; className?: string }) {
  return (
    <Bezel className={className} core={cn("@container overflow-hidden", !flush && "p-5 sm:p-6")}>
      {(title || actions) && (
        <div className={cn("flex flex-wrap items-center justify-between gap-3", flush ? "px-5 pb-4 pt-5 sm:px-6" : "mb-5")}>
          {title && <h2 className="text-lg font-bold tracking-tight text-primary">{title}</h2>}
          {actions}
        </div>
      )}
      {children}
    </Bezel>
  );
}

export function StatCard({ label, value, note, tone = "card", children }: { label: string; value: ReactNode; note?: ReactNode; tone?: "card" | "primary" | "accent"; children?: ReactNode }) {
  const core = { card: "bg-card", primary: "bg-primary text-primary-foreground", accent: "bg-accent text-accent-foreground" }[tone];
  return (
    <Bezel core={cn("flex h-full flex-col justify-between gap-4 p-5", core)}>
      <p className={cn(microLabel, tone !== "card" && "text-current opacity-70")}>{label}</p>
      <div>
        <p className="text-3xl font-bold tracking-tight tabular-nums">{value}</p>
        {note && <p className={cn("mt-1 text-sm", tone === "card" ? "text-muted-foreground" : "opacity-70")}>{note}</p>}
        {children}
      </div>
    </Bezel>
  );
}

export function Progress({ value, light = false }: { value: number; light?: boolean }) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div className={cn("mt-3 h-2 overflow-hidden rounded-full", light ? "bg-primary-foreground/15" : "bg-primary/10")} role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100}>
      <div className="h-full rounded-full bg-accent transition-[width] duration-700 ease-spring" style={{ width: `${pct}%` }} />
    </div>
  );
}

// Tables: horizontal scroll on phones, micro-label heads like the site's eyebrows.
export function Table({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[44rem] border-collapse text-left text-sm">{children}</table>
    </div>
  );
}
export const th = cn(microLabel, "whitespace-nowrap border-b border-primary/10 px-4 py-3 font-medium first:pl-5 last:pr-5 sm:first:pl-6 sm:last:pr-6");
export const td = "border-b border-primary/[0.07] px-4 py-3 align-middle first:pl-5 last:pr-5 sm:first:pl-6 sm:last:pr-6";
export const tr = "transition-colors hover:bg-primary/[0.025] [&:last-child>td]:border-b-0";

export function Empty({ children }: { children: ReactNode }) {
  return <p className="px-6 py-12 text-center text-sm text-muted-foreground">{children}</p>;
}

const LOT_STATUS: Record<LotStatus, [string, "muted" | "accent" | "primary"]> = {
  draft: ["Чернетка", "muted"],
  active: ["Активний", "accent"],
  closed: ["Закритий", "primary"],
};
export const LotStatusBadge = ({ status }: { status: LotStatus }) => <Badge tone={LOT_STATUS[status][1]}>{LOT_STATUS[status][0]}</Badge>;
export const lotStatusLabel = (s: LotStatus) => LOT_STATUS[s][0];

export const BidStatusBadge = ({ status }: { status: BidStatus }) =>
  status === "valid" ? <Badge tone="outline">Дійсна</Badge> : <Badge tone="danger">Скасована</Badge>;

const ROLE: Record<Role, string> = { participant: "Учасник", moderator: "Модератор", admin: "Адміністратор" };
export const roleLabel = (r: Role) => ROLE[r];
export const RoleBadge = ({ role }: { role: Role }) => (role === "participant" ? null : <Badge tone={role === "admin" ? "primary" : "accent"}>{ROLE[role]}</Badge>);

/** Filter pills that keep the rest of the query string. */
export function Tabs({ items, current, base, param, query }: { items: { value: string; label: string; count?: number }[]; current: string; base: string; param: string; query: Record<string, string | undefined> }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((it) => {
        const q = new URLSearchParams(Object.entries({ ...query, [param]: it.value || undefined, page: undefined }).filter((e): e is [string, string] => !!e[1]));
        const active = current === it.value;
        return (
          <Link
            key={it.value}
            href={`${base}${q.size ? `?${q}` : ""}`}
            className={cn(
              "inline-flex h-9 items-center gap-2 rounded-full px-4 text-sm font-medium transition",
              active ? "bg-primary text-primary-foreground" : "text-primary ring-1 ring-primary/15 hover:bg-primary/5",
            )}
          >
            {it.label}
            {it.count != null && <span className={cn("tabular-nums text-xs", active ? "text-primary-foreground/70" : "text-muted-foreground")}>{it.count}</span>}
          </Link>
        );
      })}
    </div>
  );
}

/** CSV downloads must be a plain link: client-side navigation would try to render the file as a page. */
export function DownloadLink({ href, className, children }: { href: string; className?: string; children: ReactNode }) {
  return (
    // eslint-disable-next-line @next/next/no-html-link-for-pages
    <a href={href} download className={className}>{children}</a>
  );
}

export const PAGE_SIZE = 50;

export function Pager({ page, total, base, query }: { page: number; total: number; base: string; query: Record<string, string | undefined> }) {
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  if (pages === 1) return null;
  const href = (p: number) => {
    const q = new URLSearchParams(Object.entries({ ...query, page: p > 1 ? String(p) : undefined }).filter((e): e is [string, string] => !!e[1]));
    return `${base}${q.size ? `?${q}` : ""}`;
  };
  const btn = "inline-flex h-9 items-center rounded-full px-4 text-sm font-medium text-primary ring-1 ring-primary/15 transition hover:bg-primary/5";
  return (
    <div className="flex items-center justify-between gap-3 border-t border-primary/10 px-5 py-4 text-sm text-muted-foreground sm:px-6">
      <span className="tabular-nums">Сторінка {page} з {pages} · {total}</span>
      <div className="flex gap-2">
        {page > 1 && <Link href={href(page - 1)} className={btn}>← Назад</Link>}
        {page < pages && <Link href={href(page + 1)} className={btn}>Далі →</Link>}
      </div>
    </div>
  );
}

export const pageFrom = (raw: string | undefined) => Math.max(1, Number.parseInt(raw ?? "1", 10) || 1);
