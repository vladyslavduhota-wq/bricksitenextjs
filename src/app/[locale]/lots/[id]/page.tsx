import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { DemoLotPage } from "@/components/lot/DemoLotPage";

const DEMO_IDS = ["1", "2", "3"];

type Props = { params: Promise<{ locale: string; id: string }> };

export function generateStaticParams() {
  return routing.locales.flatMap((locale) => DEMO_IDS.map((id) => ({ locale, id })));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, id } = await params;
  const t = await getTranslations({ locale, namespace: "lotPage" });
  return {
    title: t("metaTitle", { id }),
    description: t("metaDescription"),
    openGraph: { title: t("metaTitle", { id }), description: t("metaDescription"), type: "article" },
  };
}

export default async function LotPage({ params }: Props) {
  const { locale, id } = await params;
  if (!DEMO_IDS.includes(id)) notFound();
  setRequestLocale(locale);
  return <DemoLotPage id={id} />;
}
