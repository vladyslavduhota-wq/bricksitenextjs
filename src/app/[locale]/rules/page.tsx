import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { alternates } from "@/i18n/alternates";
import { LegalPage } from "@/components/LegalPage";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "legal.rules" });
  return { title: t("metaTitle"), alternates: alternates("/rules", locale) };
}

export default async function RulesPage({ params }: Props) {
  setRequestLocale((await params).locale);
  return <LegalPage kind="rules" />;
}
