import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { alternates } from "@/i18n/alternates";
import { ClientMessages } from "@/i18n/client-messages";
import { HomePage } from "@/components/home/HomePage";
import { getAuctionStats, getPublicLots } from "@/lib/lots";

// Prices and the total stay live through Realtime; the page refreshes at most every 30 s.
export const revalidate = 30;

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return { alternates: alternates("/", (await params).locale) };
}

export default async function Home({ params }: Props) {
  setRequestLocale((await params).locale);
  const [lots, stats] = await Promise.all([getPublicLots(), getAuctionStats()]);
  return (
    <ClientMessages namespaces={["nav", "hero", "marquee", "about", "lots", "steps", "report", "final", "faq", "footer", "closed", "lot"]}>
      <HomePage lots={lots} stats={stats} />
    </ClientMessages>
  );
}
