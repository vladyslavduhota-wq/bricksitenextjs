import Link from "next/link";
import { ArrowLeft } from "@phosphor-icons/react/dist/ssr";
import { PageHeader, Panel } from "@/components/admin/kit";
import { LotForm } from "@/components/admin/LotForm";
import { requireAdmin } from "@/lib/auth";

export const metadata = { title: "Новий лот" };

export default async function NewLotPage() {
  await requireAdmin();
  return (
    <>
      <Link href="/admin/lots" className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"><ArrowLeft /> Усі лоти</Link>
      <PageHeader title="Новий лот" description="Нові лоти створюються як чернетки. Активні лоти стають у чергу ефіру за порядком." />
      <Panel>
        <LotForm />
      </Panel>
    </>
  );
}
