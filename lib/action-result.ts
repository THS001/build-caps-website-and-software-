import { unstable_rethrow } from "next/navigation"
import type { FormState } from "@/app/[locale]/admin/actions"

// Production builds replace the message of an error *thrown* by a server action
// with a generic "An error occurred in the Server Components render", so staff
// would never see "Only admins can delete…" or "That advisor is busy…". Admin
// actions therefore return their errors, and the client shows them.

export type ActionError = { error: string }

export const isActionError = (value: unknown): value is ActionError =>
  typeof value === "object" && value !== null && Object.keys(value).length === 1 && typeof (value as ActionError).error === "string"

/**
 * A message staff can act on. AI errors arrive as "400 {json…}" from the Anthropic
 * SDK; the common ones are put in plain words.
 */
export function errorMessage(error: unknown, fallback = "Something went wrong.") {
  const text = error instanceof Error ? error.message : typeof error === "string" ? error : ""
  if (!text) return fallback
  if (/credit balance is too low/i.test(text)) return "The AI is paused: the Anthropic account has run out of credit. Top it up in the Anthropic console (Plans & Billing), then try again."
  if (/invalid x-api-key|authentication_error/i.test(text)) return "The AI key isn't valid. Check ANTHROPIC_API_KEY in the hosting settings."
  if (/rate_limit_error|^429/i.test(text)) return "The AI is busy right now. Try again in a minute."
  if (/overloaded_error|^529/i.test(text)) return "The AI service is overloaded. Try again in a few minutes."
  return text
}

const messageOf = (error: unknown) => errorMessage(error)

/** Runs an action; a thrown error comes back as { error } (Next's redirects still go through). */
export async function attempt<T>(body: () => Promise<T>): Promise<T | ActionError> {
  try {
    return await body()
  } catch (error) {
    unstable_rethrow(error)
    console.error(error)
    return { error: messageOf(error) }
  }
}

/** The same for form actions: a thrown error becomes the form's error message. */
export async function attemptForm(body: () => Promise<FormState>): Promise<FormState> {
  try {
    return await body()
  } catch (error) {
    unstable_rethrow(error)
    console.error(error)
    return { status: "error", message: messageOf(error) }
  }
}

/** Client side: the action's value, or its error thrown as a plain Error for the caller's catch. */
export async function unwrap<T>(result: Promise<T | ActionError>): Promise<T> {
  const value = await result
  if (isActionError(value)) throw new Error(value.error)
  return value
}
