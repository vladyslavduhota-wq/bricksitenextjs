import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowSquareOut, SignOut } from "@phosphor-icons/react/dist/ssr";
import { BrandLogo } from "@/components/BrandLogo";
import { AdminNav } from "./AdminNav";
import { roleLabel } from "./kit";
import type { Profile } from "@/lib/types";

const signOut = (
  <form action="/auth/signout" method="post">
    <input type="hidden" name="next" value="/" />
    <button className="inline-flex items-center gap-2 text-sm text-primary-foreground/70 transition hover:text-accent"><SignOut size={18} weight="light" /> Вийти</button>
  </form>
);

/** Navy sidebar on desktop, a compact top bar with scrolling pills on phones. */
export function AdminShell({ profile, children }: { profile: Pick<Profile, "full_name" | "role">; children: ReactNode }) {
  return (
    <div className="min-h-[100dvh] bg-background lg:grid lg:grid-cols-[16.5rem_minmax(0,1fr)]">
      <aside className="sticky top-0 z-30 p-2 sm:p-3 lg:h-[100dvh]">
        <div className="dot-grid-light relative flex h-full flex-col gap-4 overflow-hidden rounded-[1.75rem] bg-primary p-3 text-primary-foreground shadow-soft lg:gap-8 lg:p-4">
          <div className="flex items-center justify-between gap-3 px-1 pt-1">
            <Link href="/admin" className="flex items-center gap-3">
              <BrandLogo light />
            </Link>
            <div className="lg:hidden">{signOut}</div>
          </div>
          <AdminNav isAdmin={profile.role === "admin"} />
          <div className="mt-auto hidden space-y-4 border-t border-primary-foreground/10 px-2 pt-4 lg:block">
            <div>
              <p className="truncate font-medium">{profile.full_name}</p>
              <p className="text-xs text-primary-foreground/60">{roleLabel(profile.role)}</p>
            </div>
            <div className="flex flex-col gap-2">
              <Link href="/" target="_blank" className="inline-flex items-center gap-2 text-sm text-primary-foreground/70 transition hover:text-accent"><ArrowSquareOut size={18} weight="light" /> Відкрити сайт</Link>
              {signOut}
            </div>
          </div>
        </div>
      </aside>
      <main className="px-4 pb-20 pt-4 sm:px-6 lg:px-10 lg:pt-10">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>
    </div>
  );
}
