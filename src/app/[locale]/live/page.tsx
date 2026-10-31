import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { alternates } from "@/i18n/alternates";
import { LiveView } from "@/components/auction/LiveView";
import { getLiveState, getPublicSettings } from "@/lib/lots";

// Realtime keeps it current; this only bounds how stale the first paint can be.
export const revalidate = 5;

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "live" });
  return { title: t("metaTitle"), description: t("metaDescription"), openGraph: { title: t("metaTitle"), description: t("metaDescription") }, alternates: alternates("/live", locale) };
}

export default async function LivePage({ params }: Props) {
  setRequestLocale((await params).locale);
  const [state, settings] = await Promise.all([getLiveState(), getPublicSettings()]);
  return <LiveView initial={state} maxBid={settings?.max_bid_amount ?? null} />;
}
