import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { LegalPage } from "@/components/LegalPage";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const t = await getTranslations({ locale: (await params).locale, namespace: "legal.privacy" });
  return { title: t("metaTitle") };
}

export default async function PrivacyPage({ params }: Props) {
  setRequestLocale((await params).locale);
  return <LegalPage kind="privacy" />;
}
