import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

export default async function NotFound() {
  const t = await getTranslations("notFound");
  return (
    <main className="grid min-h-[100dvh] place-items-center bg-background px-4">
      <div className="max-w-md text-center">
        <p className="text-outline text-8xl font-bold leading-none">404</p>
        <h1 className="mt-6 text-3xl font-bold text-primary">{t("title")}</h1>
        <p className="mt-3 text-muted-foreground">{t("text")}</p>
        <Link href="/" className="mt-8 inline-flex rounded-full bg-primary px-6 py-3 font-medium text-primary-foreground">
          {t("home")}
        </Link>
      </div>
    </main>
  );
}
