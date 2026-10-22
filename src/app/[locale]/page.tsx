import { setRequestLocale } from "next-intl/server";
import { HomePage } from "@/components/home/HomePage";
import { getAuctionStats, getPublicLots } from "@/lib/lots";

// Prices and the total stay live through Realtime; the page refreshes at most every 30 s.
export const revalidate = 30;

export default async function Home({ params }: { params: Promise<{ locale: string }> }) {
  setRequestLocale((await params).locale);
  const [lots, stats] = await Promise.all([getPublicLots(), getAuctionStats()]);
  return <HomePage lots={lots} stats={stats} />;
}
