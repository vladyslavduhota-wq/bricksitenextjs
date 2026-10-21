import Link from "next/link";
import { ArrowLeft } from "@phosphor-icons/react/dist/ssr";
import { PageHeader, Panel } from "@/components/admin/kit";
import { LotForm } from "@/components/admin/LotForm";
import { requireAdmin } from "@/lib/auth";
import { FINAL_AT } from "@/lib/auction";
import { toKyivInput } from "@/lib/time";

export const metadata = { title: "Новий лот" };

export default async function NewLotPage() {
  await requireAdmin();
  return (
    <>
      <Link href="/admin/lots" className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"><ArrowLeft /> Усі лоти</Link>
      <PageHeader title="Новий лот" description="Нові лоти створюються як чернетки: на сайті їх не видно, доки ви не зробите їх активними." />
      <Panel>
        <LotForm endsAtDefault={toKyivInput(FINAL_AT)} />
      </Panel>
    </>
  );
}
