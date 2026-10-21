"use client";

import { useState } from "react";
import { Button } from "@/components/ui";
import { setRole } from "@/app/admin/actions";
import { useFormAction } from "./useFormAction";
import type { Role } from "@/lib/types";
import { cn } from "@/lib/utils";

const OPTIONS: [Role, string][] = [["participant", "Учасник"], ["moderator", "Модератор"], ["admin", "Адміністратор"]];

/** Role picker; the save button appears only after a change. Admin rights get an extra confirm. */
export function RoleForm({ userId, role }: { userId: string; role: Role }) {
  const { state, onSubmit, pending } = useFormAction(setRole.bind(null, userId));
  const [value, setValue] = useState<Role>(role);
  return (
    <form
      onSubmit={(e) => {
        if (value === "admin" && !confirm("Адміністратор бачить контакти всіх учасників і може змінювати лоти. Надати права?")) return e.preventDefault();
        onSubmit(e);
      }}
      className="flex items-center gap-1.5"
    >
      <select
        name="role"
        value={value}
        onChange={(e) => setValue(e.target.value as Role)}
        aria-label="Роль"
        className={cn("h-9 rounded-full bg-card px-3 text-xs font-medium text-primary ring-1 ring-primary/15 outline-none focus:ring-2 focus:ring-accent", state.error && "ring-destructive/60")}
      >
        {OPTIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
      {value !== role && <Button type="submit" size="sm" disabled={pending}>Зберегти</Button>}
      {state.error && <span className="text-xs text-destructive">{state.error}</span>}
    </form>
  );
}
