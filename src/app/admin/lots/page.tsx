import Image from "next/image";
import Link from "next/link";
import { CaretRight, DownloadSimple, ImageSquare, Plus } from "@phosphor-icons/react/dist/ssr";
import { Empty, LotStatusBadge, PageHeader, Panel, Table, Tabs, td, th, tr, DownloadLink } from "@/components/admin/kit";
import { Badge, buttonClass } from "@/components/ui";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { photoUrl } from "@/lib/supabase/env";
import { formatUah } from "@/lib/format";
import type { Lot, LotStatus } from "@/lib/types";

export const metadata = { title: "Лоти" };

type Props = { searchParams: Promise<{ status?: string }> };

export default async function LotsPage({ searchParams }: Props) {
  await requireAdmin();
  const { status = "" } = await searchParams;
  const supabase = await createClient();
  const [{ data: lots }, { data: images }, { data: show }] = await Promise.all([
    supabase.from("lots").select("*").order("sort_order").order("created_at").returns<Lot[]>(),
    supabase.from("lot_images").select("lot_id, path").order("sort_order"),
    supabase.from("settings").select("current_lot_id").single(),
  ]);
  const all = lots ?? [];
  const cover = new Map<string, string>();
  for (const i of images ?? []) if (!cover.has(i.lot_id)) cover.set(i.lot_id, i.path);
  const shown = status ? all.filter((l) => l.status === status) : all;
  const count = (s: LotStatus) => all.filter((l) => l.status === s).length;

  return (
    <>
      <PageHeader
        title="Лоти"
        description="Речі ректора в порядку показу в ефірі. Чернетки на сайті не видно."
        actions={
          <>
            <Link href="/admin/lots/new" className={buttonClass("primary")}><Plus size={18} weight="bold" /> Новий лот</Link>
            <DownloadLink href="/admin/export/winners" className={buttonClass("ghost")}><DownloadSimple size={18} weight="light" /> Переможці CSV</DownloadLink>
          </>
        }
      />
      <Panel flush title={<Tabs base="/admin/lots" param="status" current={status} query={{}} items={[
        { value: "", label: "Усі", count: all.length },
        { value: "active", label: "Активні", count: count("active") },
        { value: "draft", label: "Чернетки", count: count("draft") },
        { value: "closed", label: "Закриті", count: count("closed") },
      ]} />}>
        {shown.length === 0 ? (
          <Empty>{all.length ? "У цьому фільтрі лотів немає." : "Лотів ще немає. Додайте перший."}</Empty>
        ) : (
          <Table>
            <thead>
              <tr>
                <th className={th}>Лот</th>
                <th className={th}>Статус</th>
                <th className={`${th} text-right`}>Ціна</th>
                <th className={`${th} text-right`}>Ставок</th>
                <th className={`${th} text-right`}>Порядок</th>
                <th className={th}><span className="sr-only">Відкрити</span></th>
              </tr>
            </thead>
            <tbody>
              {shown.map((l) => {
                const img = cover.get(l.id);
                return (
                  <tr key={l.id} className={`${tr} group`}>
                    <td className={td}>
                      <Link href={`/admin/lots/${l.id}`} className="flex items-center gap-3">
                        <span className="relative grid h-14 w-11 shrink-0 place-items-center overflow-hidden rounded-xl bg-navy-deep text-primary-foreground/40">
                          {img ? <Image src={photoUrl(img)} alt="" fill sizes="44px" className="object-cover" /> : <ImageSquare size={20} weight="light" />}
                        </span>
                        <span className="min-w-0">
                          <span className="block max-w-[18rem] truncate font-bold text-primary group-hover:underline">{l.title_uk}</span>
                          {!l.title_en && <span className="block text-xs text-muted-foreground">без EN</span>}
                        </span>
                      </Link>
                    </td>
                    <td className={td}><span className="flex flex-wrap gap-1"><LotStatusBadge status={l.status} />{l.id === show?.current_lot_id && <Badge tone="accent">В ефірі</Badge>}</span></td>
                    <td className={`${td} whitespace-nowrap text-right tabular-nums`}>
                      {l.current_amount ? <b className="text-primary">{formatUah(l.current_amount)}</b> : <span className="text-muted-foreground">старт {formatUah(l.start_price)}</span>}
                      <span className="block text-xs text-muted-foreground">крок {formatUah(l.bid_step)}</span>
                    </td>
                    <td className={`${td} text-right tabular-nums`}>{l.bid_count}</td>
                    <td className={`${td} text-right tabular-nums text-muted-foreground`}>{l.sort_order}</td>
                    <td className={`${td} text-right`}>
                      <Link href={`/admin/lots/${l.id}`} aria-label={`Редагувати «${l.title_uk}»`} className="inline-grid h-9 w-9 place-items-center rounded-full text-primary ring-1 ring-primary/15 transition group-hover:bg-primary group-hover:text-primary-foreground">
                        <CaretRight size={16} />
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        )}
      </Panel>
    </>
  );
}
