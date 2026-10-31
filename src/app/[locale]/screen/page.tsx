import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ScreenView } from "@/components/auction/ScreenView";
import { getLiveState } from "@/lib/lots";

export const revalidate = 5;

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const t = await getTranslations({ locale: (await params).locale, namespace: "live" });
  return { title: t("metaTitle"), robots: { index: false, follow: false } };
}

// Shown on the stream so viewers know where to bid; hidden while the address is still localhost.
const site = (() => {
  const host = process.env.NEXT_PUBLIC_SITE_URL ? new URL(process.env.NEXT_PUBLIC_SITE_URL).host : "";
  return host.startsWith("localhost") ? "" : host;
})();

export default async function ScreenPage({ params }: Props) {
  setRequestLocale((await params).locale);
  return <ScreenView initial={await getLiveState()} site={site} />;
}
