import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { alternates } from "@/i18n/alternates";
import { LotView } from "@/components/auction/LotView";
import { getPublicLot, getPublicLots, getPublicSettings } from "@/lib/lots";
import { lotDescription, lotTitle } from "@/lib/lot-text";
import { photoUrl } from "@/lib/supabase/env";
import { routing } from "@/i18n/routing";

// Live state comes from Realtime; the page refreshes at most every 30 s for edits and new photos.
export const revalidate = 30;

type Props = { params: Promise<{ locale: string; slug: string }> };

export async function generateStaticParams() {
  const lots = await getPublicLots();
  return routing.locales.flatMap((locale) => lots.map((l) => ({ locale, slug: l.slug })));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const data = await getPublicLot(slug);
  if (!data) return {};
  const t = await getTranslations({ locale, namespace: "lot" });
  const title = lotTitle(data.lot, locale);
  const description = lotDescription(data.lot, locale) || t("metaFallback");
  const cover = data.lot.images[0];
  return {
    title: `${title} · KSE`,
    alternates: alternates(`/lots/${slug}`, locale),
    description,
    openGraph: { title, description, type: "article", images: cover ? [{ url: photoUrl(cover.path), width: cover.width ?? undefined, height: cover.height ?? undefined }] : [] },
  };
}

export default async function LotPage({ params }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const [data, settings] = await Promise.all([getPublicLot(slug), getPublicSettings()]);
  if (!data) notFound();
  return <LotView initialLot={data.lot} initialBids={data.bids} rules={settings} />;
}
