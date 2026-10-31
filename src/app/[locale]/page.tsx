import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { alternates } from "@/i18n/alternates";
import { ClientMessages } from "@/i18n/client-messages";
import { HomePage } from "@/components/home/HomePage";
import { getLiveState } from "@/lib/lots";

// The lot on air and the total stay live through Realtime; this only bounds the first paint.
export const revalidate = 10;

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return { alternates: alternates("/", (await params).locale) };
}

export default async function Home({ params }: Props) {
  setRequestLocale((await params).locale);
  const live = await getLiveState();
  return (
    <ClientMessages namespaces={["nav", "hero", "marquee", "about", "lots", "steps", "report", "final", "faq", "footer", "closed", "lot", "live"]}>
      <HomePage live={live} />
    </ClientMessages>
  );
}
