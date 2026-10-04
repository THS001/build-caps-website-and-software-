"use client"

import { startTransition, useActionState, useEffect, useRef, type FormEvent } from "react"
import type { FormState } from "@/app/[locale]/admin/actions"

/**
 * useActionState for admin forms. React 19 clears a <form action={…}> after every
 * submit, even when the action only returns validation errors, so staff would have
 * to retype everything. Submitting through onSubmit keeps what was typed; forms
 * that add one item after another can ask to be cleared once the save succeeds.
 */
export function useFormAction(action: (state: FormState, form: FormData) => Promise<FormState>, { resetOnDone = false } = {}) {
  const [state, dispatch, pending] = useActionState<FormState, FormData>(action, { status: "idle" })
  const ref = useRef<HTMLFormElement>(null)
  useEffect(() => {
    if (resetOnDone && state.status === "done") ref.current?.reset()
  }, [state, resetOnDone])

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    startTransition(() => dispatch(form))
  }
  return { state, pending, form: { ref, onSubmit } }
}

/** The message, naming each field to fix, for small forms that don't highlight their fields. */
export function errorText(state: FormState) {
  const details = Object.entries(state.fieldErrors ?? {}).map(([field, error]) => `${field.replace(/_/g, " ")}: ${error}`)
  return details.length ? `Please check ${details.join("; ")}.` : state.message
}
