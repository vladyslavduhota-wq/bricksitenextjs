import { redirect } from "@/i18n/navigation";

// The catalogue gave way to the live show: viewers only see the lot on air.
export default async function LotsPage({ params }: { params: Promise<{ locale: string }> }) {
  redirect({ href: "/live", locale: (await params).locale });
}
