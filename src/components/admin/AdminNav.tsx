"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Broadcast, ClockCounterClockwise, Gavel, GearSix, Package, SquaresFour, UsersThree, type Icon } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

const ITEMS: { href: string; label: string; icon: Icon; adminOnly?: boolean }[] = [
  { href: "/admin", label: "Огляд", icon: SquaresFour },
  { href: "/admin/live", label: "Ефір", icon: Broadcast, adminOnly: true },
  { href: "/admin/lots", label: "Лоти", icon: Package, adminOnly: true },
  { href: "/admin/bids", label: "Ставки", icon: Gavel },
  { href: "/admin/users", label: "Учасники", icon: UsersThree },
  { href: "/admin/settings", label: "Налаштування", icon: GearSix, adminOnly: true },
  { href: "/admin/audit", label: "Журнал", icon: ClockCounterClockwise, adminOnly: true },
];

export function AdminNav({ isAdmin }: { isAdmin: boolean }) {
  const path = usePathname();
  return (
    <nav className="-mx-1 flex gap-1 overflow-x-auto px-1 [scrollbar-width:none] lg:mx-0 lg:flex-col lg:overflow-visible lg:px-0 [&::-webkit-scrollbar]:hidden">
      {ITEMS.filter((i) => isAdmin || !i.adminOnly).map(({ href, label, icon: I }) => {
        const active = href === "/admin" ? path === href : path.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex shrink-0 items-center gap-3 rounded-full px-4 py-2.5 text-sm font-medium transition duration-300 ease-spring",
              active ? "bg-accent text-accent-foreground" : "text-primary-foreground/70 hover:bg-primary-foreground/10 hover:text-primary-foreground",
            )}
          >
            <I size={20} weight={active ? "regular" : "light"} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
