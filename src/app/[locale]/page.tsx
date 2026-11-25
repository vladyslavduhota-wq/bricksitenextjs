import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { alternates } from "@/i18n/alternates";
import { ClientMessages } from "@/i18n/client-messages";
import { HomePage } from "@/components/home/HomePage";
import { getPublicLots } from "@/lib/lots";

export const revalidate = 60;

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return { alternates: alternates("/", (await params).locale) };
}

export default async function Home({ params }: Props) {
  setRequestLocale((await params).locale);
  const lots = await getPublicLots();
  return (
    <ClientMessages namespaces={["nav", "hero", "marquee", "about", "lots", "steps", "faq", "footer", "lot"]}>
      <HomePage lots={lots} />
    </ClientMessages>
  );
}
