import { setRequestLocale } from "next-intl/server";
import { HomePage } from "@/components/home/HomePage";

export default async function Home({ params }: { params: Promise<{ locale: string }> }) {
  setRequestLocale((await params).locale);
  return <HomePage />;
}
