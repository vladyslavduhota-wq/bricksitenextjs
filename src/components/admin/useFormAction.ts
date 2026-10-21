"use client";

import { useActionState, useTransition, type FormEvent } from "react";
import type { ActionState } from "@/app/admin/actions";

/**
 * Submits through onSubmit instead of <form action>, so React does not reset the fields afterwards:
 * on a validation error the admin keeps what they typed.
 */
export function useFormAction(action: (state: ActionState, form: FormData) => Promise<ActionState>) {
  const [state, dispatch, pending] = useActionState(action, {});
  const [, startTransition] = useTransition();
  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    startTransition(() => dispatch(form));
  };
  return { state, onSubmit, pending };
}
