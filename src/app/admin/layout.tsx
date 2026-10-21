import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { BrandLogo } from "@/components/BrandLogo";
import { AdminShell } from "@/components/admin/AdminShell";
import { Bezel, Notice, buttonClass } from "@/components/ui";
import { getViewer, isStaff } from "@/lib/auth";
import { supabaseConfigured } from "@/lib/supabase/env";
import "../globals.css";

// Every admin page depends on who is signed in: never prerender.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { template: "%s · Адмінка аукціону", default: "Адмінка аукціону" },
  robots: { index: false, follow: false },
};

function Frame({ children }: { children: ReactNode }) {
  return (
    <html lang="uk">
      <body>{children}</body>
    </html>
  );
}

function Message({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Frame>
      <main className="dot-grid grid min-h-[100dvh] place-items-center bg-background px-4">
        <Bezel className="w-full max-w-md" core="p-8">
          <BrandLogo />
          <h1 className="mt-8 text-3xl font-bold tracking-tight text-primary">{title}</h1>
          <div className="mt-3 text-muted-foreground">{children}</div>
        </Bezel>
      </main>
    </Frame>
  );
}

export default async function AdminLayout({ children }: { children: ReactNode }) {
  if (!supabaseConfigured) {
    return <Message title="База даних не підключена"><Notice>Заповніть .env.local значеннями Supabase, і адмінка запрацює.</Notice></Message>;
  }
  const viewer = await getViewer();
  if (!viewer) redirect("/login?next=/admin");
  if (!viewer.profile) redirect("/welcome?next=/admin");
  if (!isStaff(viewer.profile)) {
    return (
      <Message title="Немає доступу">
        <p>Цей акаунт ({viewer.email}) не має ролі адміністратора чи модератора. Попросіть адміністратора аукціону надати доступ.</p>
        <div className="mt-6 flex gap-2">
          <Link href="/" className={buttonClass("primary")}>На сайт</Link>
        </div>
      </Message>
    );
  }
  return (
    <Frame>
      <AdminShell profile={viewer.profile}>{children}</AdminShell>
    </Frame>
  );
}
