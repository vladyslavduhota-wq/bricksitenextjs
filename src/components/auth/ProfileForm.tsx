"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { ArrowRight, Check as CheckIcon } from "@phosphor-icons/react";
import { Link } from "@/i18n/navigation";
import { Button, Check, Field, Notice, inputClass } from "@/components/ui";
import type { ProfileState } from "@/lib/actions/profile";
import type { Profile } from "@/lib/types";

type Action = (state: ProfileState, form: FormData) => Promise<ProfileState>;

/** Onboarding (mode "create", with the 18+ and rules consents) and account editing (mode "edit"). */
export function ProfileForm({ action, mode, profile }: { action: Action; mode: "create" | "edit"; profile?: Profile | null }) {
  const t = useTranslations("profile");
  const [state, formAction, pending] = useActionState(action, {});
  const [fullName, setFullName] = useState(profile?.full_name ?? "");
  // Controlled on purpose: React resets uncontrolled fields after a form action, which would wipe input on an error.
  const [phone, setPhone] = useState(profile?.phone ?? "+380 ");
  const [adult, setAdult] = useState(false);
  const [rules, setRules] = useState(false);
  const e = state.errors ?? {};
  const link = (href: "/rules" | "/privacy") =>
    function LegalLink(c: React.ReactNode) {
      return <Link href={href} target="_blank" className="text-primary underline decoration-accent decoration-2 underline-offset-4">{c}</Link>;
    };

  return (
    <form action={formAction} noValidate className="space-y-5">
      <Field label={t("fullName")} error={e.fullName && t("errors.fullName")}>
        <input name="full_name" className={inputClass} value={fullName} onChange={(ev) => setFullName(ev.target.value)} autoComplete="name" required maxLength={100} aria-invalid={!!e.fullName} />
      </Field>
      <Field label={t("phone")} hint={t("phoneHint")} error={e.phone && t("errors.phone")}>
        <input name="phone" type="tel" className={inputClass} value={phone} onChange={(ev) => setPhone(ev.target.value)} autoComplete="tel" inputMode="tel" required maxLength={20} aria-invalid={!!e.phone} />
      </Field>
      {mode === "create" && (
        <div className="-mx-3 space-y-1">
          <Check name="adult" checked={adult} onChange={(ev) => setAdult(ev.target.checked)} aria-invalid={!!e.adult}>{t("adult")}</Check>
          {e.adult && <p className="px-3 text-xs text-destructive">{t("errors.adult")}</p>}
          <Check name="rules" checked={rules} onChange={(ev) => setRules(ev.target.checked)} aria-invalid={!!e.rules}>{t.rich("rules", { rules: link("/rules"), privacy: link("/privacy") })}</Check>
          {e.rules && <p className="px-3 text-xs text-destructive">{t("errors.rules")}</p>}
        </div>
      )}

      {e.generic && <Notice tone="error">{t("errors.generic")}</Notice>}
      <div className="flex flex-wrap items-center gap-4">
        <Button type="submit" size="lg" disabled={pending} className={mode === "create" ? "w-full" : ""}>
          {mode === "create" ? <>{t("submit")} <ArrowRight weight="bold" /></> : t("save")}
        </Button>
        {/* key restarts the fade each time a save succeeds */}
        {state.saved && <span key={state.saved} className="inline-flex items-center gap-1.5 text-sm font-medium text-primary"><CheckIcon weight="bold" /> {t("saved")}</span>}
      </div>
    </form>
  );
}
