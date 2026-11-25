import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ScreenView } from "@/components/auction/ScreenView";
import { getPathname } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { getLiveState } from "@/lib/lots";
import { qrPath } from "@/lib/qr";

export const revalidate = 5;

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const t = await getTranslations({ locale: (await params).locale, namespace: "live" });
  return { title: t("metaTitle"), robots: { index: false, follow: false } };
}

// Where the stream's QR sends viewers. On Vercel the production domain is the fallback.
const base = () => {
  const url = process.env.NEXT_PUBLIC_SITE_URL;
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (vercel && (!url || new URL(url).hostname === "localhost")) return `https://${vercel}`;
  return url ?? "http://localhost:3000";
};

export default async function ScreenPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const url = new URL(getPathname({ href: "/live", locale: locale as Locale }), base());
  return <ScreenView initial={await getLiveState()} site={url.host + url.pathname} qr={qrPath(url.href)} />;
}
