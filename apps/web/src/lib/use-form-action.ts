"use client";

import { useActionState, useTransition, type FormEvent } from "react";

/**
 * Like useActionState, but submits through onSubmit so React doesn't reset the form afterwards.
 * (With <form action>, React 19 clears every field after each submit, even when validation fails.)
 */
export function useFormAction<S>(action: (prev: S, formData: FormData) => Promise<S>, initial: S) {
  const [state, dispatch, actionPending] = useActionState<S, FormData>(
    action as (prev: Awaited<S>, formData: FormData) => Promise<S>,
    initial as Awaited<S>,
  );
  const [transitionPending, start] = useTransition();
  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    start(() => dispatch(formData));
  };
  return [state, onSubmit, actionPending || transitionPending] as const;
}
