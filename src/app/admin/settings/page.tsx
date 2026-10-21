import { Trash } from "@phosphor-icons/react/dist/ssr";
import { Empty, PageHeader, Panel } from "@/components/admin/kit";
import { ConfirmAction } from "@/components/admin/ConfirmAction";
import { DonationForm, SettingsForm } from "@/components/admin/SettingsForm";
import { deleteDonation } from "@/app/admin/actions";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatUah } from "@/lib/format";
import { formatKyiv } from "@/lib/time";
import type { Donation, Settings } from "@/lib/types";

export const metadata = { title: "Налаштування" };

export default async function SettingsPage() {
  await requireAdmin();
  const supabase = await createClient();
  const [{ data: settings }, { data: donations }] = await Promise.all([
    supabase.from("settings").select("*").single<Settings>(),
    supabase.from("donations").select("*").order("received_at", { ascending: false }).returns<Donation[]>(),
  ]);
  const total = (donations ?? []).reduce((s, d) => s + d.amount, 0);

  return (
    <>
      <PageHeader title="Налаштування" description="Параметри аукціону. Зміни діють одразу для всіх нових ставок." />
      {settings && <Panel><SettingsForm settings={settings} /></Panel>}

      <Panel className="mt-6" title="Прямі донати" actions={<span className="text-sm text-muted-foreground">разом <b className="tabular-nums text-primary">{formatUah(total)}</b></span>}>
        <p className="-mt-2 mb-5 max-w-[60ch] text-sm text-muted-foreground">Гроші, що прийшли без ставки (банка, перекази). Додаються до лічильника збору на сайті.</p>
        <DonationForm />
        {donations?.length ? (
          <ul className="mt-6 divide-y divide-primary/[0.07] border-t border-primary/10">
            {donations.map((d) => (
              <li key={d.id} className="flex items-center justify-between gap-3 py-3">
                <span className="min-w-0">
                  <b className="tabular-nums text-primary">{formatUah(d.amount)}</b>
                  <span className="ml-2 text-sm text-muted-foreground">{d.note ?? ""}</span>
                  <span className="block text-xs tabular-nums text-muted-foreground">{formatKyiv(d.received_at)}</span>
                </span>
                <ConfirmAction action={deleteDonation.bind(null, d.id)} variant="quiet" tone="danger" title="Видалити донат?" description={`${formatUah(d.amount)} буде віднято з лічильника збору.`} confirmLabel="Видалити">
                  <Trash size={16} weight="light" /> <span className="sr-only">Видалити</span>
                </ConfirmAction>
              </li>
            ))}
          </ul>
        ) : <Empty>Донатів ще не додано.</Empty>}
      </Panel>
    </>
  );
}
