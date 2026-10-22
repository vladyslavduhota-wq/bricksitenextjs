import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Catalogue } from "@/components/auction/Catalogue";
import { getPublicLots } from "@/lib/lots";

// Prices stay live through Realtime; the page itself refreshes at most every 30 s for new lots and edits.
export const revalidate = 30;

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const t = await getTranslations({ locale: (await params).locale, namespace: "catalog" });
  return { title: t("metaTitle"), description: t("metaDescription"), openGraph: { title: t("metaTitle"), description: t("metaDescription") } };
}

export default async function LotsPage({ params }: Props) {
  setRequestLocale((await params).locale);
  return <Catalogue initial={await getPublicLots()} />;
}
