import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { alternates } from "@/i18n/alternates";
import { FinalPage } from "@/components/final/FinalPage";
import { getAuctionStats, getPublicLots, getWinnerNames } from "@/lib/lots";

// The total and prices stay live through Realtime; winners refresh at most every 30 s.
export const revalidate = 30;

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "finalPage" });
  return { title: t("metaTitle"), description: t("metaDescription"), openGraph: { title: t("metaTitle"), description: t("metaDescription") }, alternates: alternates("/final", locale) };
}

export default async function Final({ params }: Props) {
  setRequestLocale((await params).locale);
  const [lots, stats, winners] = await Promise.all([getPublicLots(), getAuctionStats(), getWinnerNames()]);
  return <FinalPage lots={lots} stats={stats} winners={winners} />;
}
