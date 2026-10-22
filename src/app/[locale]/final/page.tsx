import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { FinalPage } from "@/components/final/FinalPage";
import { getAuctionStats, getLeaderNames, getPublicLots } from "@/lib/lots";

// The total and prices stay live through Realtime; winners refresh at most every 30 s.
export const revalidate = 30;

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "finalPage" });
  return { title: t("metaTitle"), description: t("metaDescription"), openGraph: { title: t("metaTitle"), description: t("metaDescription") } };
}

export default async function Final({ params }: Props) {
  setRequestLocale((await params).locale);
  const [lots, stats] = await Promise.all([getPublicLots(), getAuctionStats()]);
  const leaders = await getLeaderNames(lots.flatMap((l) => (l.status === "closed" && l.leading_bid_id ? [l.leading_bid_id] : [])));
  return <FinalPage lots={lots} stats={stats} leaders={leaders} />;
}
