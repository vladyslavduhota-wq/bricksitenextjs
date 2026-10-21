import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { FinalPage } from "@/components/final/FinalPage";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "finalPage" });
  return { title: t("metaTitle"), description: t("metaDescription"), openGraph: { title: t("metaTitle"), description: t("metaDescription") } };
}

export default async function Final({ params }: Props) {
  setRequestLocale((await params).locale);
  return <FinalPage />;
}
