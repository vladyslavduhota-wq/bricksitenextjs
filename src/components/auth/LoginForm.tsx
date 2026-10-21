"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ArrowRight, EnvelopeSimple, GoogleLogo } from "@phosphor-icons/react";
import type { AuthError } from "@supabase/supabase-js";
import { Link } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/client";
import { supabaseConfigured } from "@/lib/supabase/env";
import { Button, Field, Notice, inputClass } from "@/components/ui";
import { Turnstile, TURNSTILE_SITE_KEY } from "./Turnstile";

type ErrorKey = "email" | "rateLimit" | "code" | "captcha" | "link" | "generic";

function errorKey(e: AuthError): ErrorKey {
  if (e.status === 429 || e.code?.startsWith("over_")) return "rateLimit";
  if (e.code === "captcha_failed") return "captcha";
  if (e.code === "otp_expired" || e.code === "invalid_credentials") return "code";
  if (e.code === "email_address_invalid" || e.code === "validation_failed") return "email";
  return "generic";
}

const RESEND_AFTER = 60;

export function LoginForm({ next, initialError }: { next: string; initialError?: ErrorKey }) {
  const t = useTranslations("auth");
  const locale = useLocale();
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<ErrorKey | null>(initialError ?? null);
  const [pending, setPending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [captcha, setCaptcha] = useState<string | null>(null);
  const [captchaReset, setCaptchaReset] = useState(0);

  useEffect(() => {
    if (!cooldown) return;
    const id = setTimeout(() => setCooldown((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [cooldown]);

  const callbackUrl = () => `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;

  async function sendCode(e?: FormEvent) {
    e?.preventDefault();
    if (TURNSTILE_SITE_KEY && !captcha) return setError("captcha");
    setPending(true);
    setError(null);
    const { error } = await createClient().auth.signInWithOtp({
      email: email.trim(),
      options: { shouldCreateUser: true, emailRedirectTo: callbackUrl(), ...(captcha ? { captchaToken: captcha } : {}) },
    });
    setPending(false);
    setCaptchaReset((n) => n + 1); // tokens are single-use
    if (error) return setError(errorKey(error));
    setStep("code");
    setCooldown(RESEND_AFTER);
  }

  async function verify(e: FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const { error } = await createClient().auth.verifyOtp({ email: email.trim(), token: code.trim(), type: "email" });
    if (error) {
      setPending(false);
      return setError(errorKey(error));
    }
    // Full navigation, so the server sees the new session and can route new users to onboarding.
    window.location.assign(callbackUrl());
  }

  async function google() {
    setPending(true);
    const { error } = await createClient().auth.signInWithOAuth({ provider: "google", options: { redirectTo: callbackUrl() } });
    if (error) {
      setPending(false);
      setError(errorKey(error));
    }
  }

  if (!supabaseConfigured) return <Notice>{t("notConfigured")}</Notice>;

  const legal = (
    <p className="mt-6 text-xs leading-relaxed text-muted-foreground">
      {t.rich("legal", {
        rules: (c) => <Link href="/rules" className="text-primary underline decoration-accent decoration-2 underline-offset-4">{c}</Link>,
        privacy: (c) => <Link href="/privacy" className="text-primary underline decoration-accent decoration-2 underline-offset-4">{c}</Link>,
      })}
    </p>
  );

  if (step === "code") {
    return (
      <form onSubmit={verify} noValidate>
        <span className="grid h-12 w-12 place-items-center rounded-full bg-accent text-accent-foreground"><EnvelopeSimple size={24} weight="light" /></span>
        <h2 className="mt-5 text-2xl font-bold tracking-tight text-primary">{t("codeTitle")}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{t("codeLead", { email: email.trim() })}</p>
        <Field label={t("code")} className="mt-6" error={error ? t(`errors.${error}`) : undefined}>
          <input
            className={`${inputClass} text-center font-bold tracking-[0.4em] tabular-nums`}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 10))}
            inputMode="numeric"
            autoComplete="one-time-code"
            autoFocus
            required
            aria-invalid={error === "code"}
          />
        </Field>
        <Button type="submit" size="lg" className="mt-5 w-full" disabled={pending || code.length < 6}>
          {t("verify")} <ArrowRight weight="bold" />
        </Button>
        <div className="mt-5 flex flex-wrap items-center justify-between gap-2 text-sm">
          <button type="button" className="font-medium text-primary underline-offset-4 hover:underline" onClick={() => { setStep("email"); setCode(""); setError(null); }}>
            {t("changeEmail")}
          </button>
          {cooldown ? (
            <span className="text-muted-foreground">{t("resendIn", { s: cooldown })}</span>
          ) : (
            <button type="button" className="font-medium text-primary underline-offset-4 hover:underline disabled:opacity-50" disabled={pending} onClick={() => sendCode()}>
              {t("resend")}
            </button>
          )}
        </div>
        {/* A resend needs a fresh bot check too. */}
        <div className="mt-4"><Turnstile onToken={setCaptcha} resetKey={captchaReset} locale={locale} /></div>
      </form>
    );
  }

  return (
    <div>
      <form onSubmit={sendCode} noValidate>
        <Field label={t("email")} error={error ? t(`errors.${error}`) : undefined}>
          <input
            className={inputClass}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            placeholder="name@example.com"
            required
            aria-invalid={error === "email"}
          />
        </Field>
        <div className="mt-4"><Turnstile onToken={setCaptcha} resetKey={captchaReset} locale={locale} /></div>
        <Button type="submit" size="lg" className="mt-5 w-full" disabled={pending || !/^\S+@\S+\.\S+$/.test(email.trim())}>
          {t("sendCode")} <ArrowRight weight="bold" />
        </Button>
      </form>
      <div className="my-6 flex items-center gap-3 text-xs uppercase tracking-[0.2em] text-muted-foreground">
        <span className="h-px flex-1 bg-primary/10" />{t("or")}<span className="h-px flex-1 bg-primary/10" />
      </div>
      <Button variant="ghost" size="lg" className="w-full" disabled={pending} onClick={google}>
        <GoogleLogo size={20} weight="bold" /> {t("google")}
      </Button>
      {legal}
    </div>
  );
}
