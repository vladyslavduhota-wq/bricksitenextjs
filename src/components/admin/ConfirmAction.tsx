"use client";

import { useActionState, useEffect, useRef, useTransition, type ReactNode } from "react";
import { X } from "@phosphor-icons/react";
import { Bezel, Button, Field, Notice, inputClass } from "@/components/ui";
import type { ActionState } from "@/app/admin/actions";

type Props = {
  action: (state: ActionState, form: FormData) => Promise<ActionState>;
  children: ReactNode;
  title: string;
  description?: ReactNode;
  confirmLabel: string;
  variant?: "primary" | "accent" | "ghost" | "danger" | "quiet";
  size?: "sm" | "md";
  tone?: "danger" | "primary";
  /** Ask for an optional free-text reason (stored with the action). */
  reason?: { label: string; placeholder?: string };
  className?: string;
};

/** A button that asks before doing anything irreversible, in a dialog styled like the site's modals. */
export function ConfirmAction({ action, children, title, description, confirmLabel, variant = "ghost", size = "sm", tone = "primary", reason, className }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [state, dispatch, pending] = useActionState(action, {});
  const [, startTransition] = useTransition();

  useEffect(() => {
    if (state.ok) dialog.current?.close();
  }, [state]);

  return (
    <>
      <Button variant={variant} size={size} className={className} onClick={() => dialog.current?.showModal()}>{children}</Button>
      <dialog
        ref={dialog}
        className="m-auto w-[calc(100%-2rem)] max-w-md bg-transparent p-0 backdrop:bg-primary/60 backdrop:backdrop-blur-md"
        onClick={(e) => e.target === dialog.current && dialog.current.close()}
      >
        <Bezel core="relative p-6 sm:p-8">
          <button type="button" aria-label="Закрити" onClick={() => dialog.current?.close()} className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-full bg-primary/5 text-primary">
            <X weight="light" />
          </button>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const form = new FormData(e.currentTarget);
              startTransition(() => dispatch(form));
            }}
          >
            <h2 className="pr-10 text-2xl font-bold tracking-tight text-primary">{title}</h2>
            {description && <div className="mt-2 text-sm leading-relaxed text-muted-foreground">{description}</div>}
            {reason && (
              <Field label={reason.label} className="mt-5">
                <textarea name="reason" rows={3} maxLength={300} placeholder={reason.placeholder} className={inputClass} />
              </Field>
            )}
            {state.error && <div className="mt-4"><Notice tone="error">{state.error}</Notice></div>}
            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <Button variant="ghost" onClick={() => dialog.current?.close()}>Скасувати</Button>
              <Button type="submit" variant={tone === "danger" ? "danger" : "primary"} disabled={pending}>{pending ? "Зачекайте…" : confirmLabel}</Button>
            </div>
          </form>
        </Bezel>
      </dialog>
    </>
  );
}
