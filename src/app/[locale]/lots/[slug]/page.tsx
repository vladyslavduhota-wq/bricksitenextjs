import { redirect } from "@/i18n/navigation";

// Links to single lots that were already shared keep working: they open the live show.
export default async function LotPage({ params }: { params: Promise<{ locale: string }> }) {
  redirect({ href: "/live", locale: (await params).locale });
}
