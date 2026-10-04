"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Eye, EyeOff, Loader2 } from "lucide-react"
import { addStaff, changeOwnPassword, resetStaffPassword, setStaffRole } from "@/app/[locale]/admin/account-actions"
import type { FormState } from "@/app/[locale]/admin/actions"
import { Field } from "@/components/admin/fields"
import { useFormAction } from "@/components/admin/use-form-action"
import { unwrap } from "@/lib/action-result"

function PasswordInput({ name, autoComplete, error }: { name: string; autoComplete: string; error?: string }) {
  const [show, setShow] = useState(false)
  return (
    <span className="relative block">
      <input name={name} type={show ? "text" : "password"} required autoComplete={autoComplete} className={`admin-input pe-10 ${error ? "border-red-400" : ""}`} />
      <button type="button" onClick={() => setShow((s) => !s)} aria-label={show ? "Hide password" : "Show password"} className="absolute end-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700">
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </span>
  )
}

function Message({ state }: { state: FormState }) {
  if (!state.message) return null
  return <p className={`text-sm ${state.status === "done" ? "text-emerald-700" : "text-red-600"}`}>{state.message}</p>
}

/** Change your own password (the current one is checked first). */
export function ChangePasswordForm() {
  const { state, pending, form } = useFormAction(changeOwnPassword, { resetOnDone: true })
  const e = state.fieldErrors ?? {}
  return (
    <form {...form} className="grid max-w-md gap-4">
      <Field label="Current password" error={e.current}>
        <PasswordInput name="current" autoComplete="current-password" error={e.current} />
      </Field>
      <Field label="New password" error={e.next} hint="At least 10 characters. A short sentence is easy to remember and hard to guess.">
        <PasswordInput name="next" autoComplete="new-password" error={e.next} />
      </Field>
      <Field label="New password again" error={e.confirm}>
        <PasswordInput name="confirm" autoComplete="new-password" error={e.confirm} />
      </Field>
      <div className="flex items-center gap-3">
        <button disabled={pending} className="inline-flex items-center gap-2 rounded-full bg-neutral-900 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60">
          {pending && <Loader2 className="h-4 w-4 animate-spin" />} Change password
        </button>
        <Message state={state} />
      </div>
    </form>
  )
}

export function AddStaffForm() {
  const { state, pending, form } = useFormAction(addStaff, { resetOnDone: true })
  const e = state.fieldErrors ?? {}
  return (
    <form {...form} className="grid gap-4 rounded-2xl bg-neutral-50 p-5 sm:grid-cols-2">
      <p className="font-medium text-neutral-900 sm:col-span-2">Add a staff login</p>
      <Field label="Full name" error={e.name}>
        <input name="name" required className="admin-input" />
      </Field>
      <Field label="Email" error={e.email}>
        <input name="email" type="email" required autoComplete="off" className="admin-input" />
      </Field>
      <Field label="Role" hint="Admin: everything. Editor: content and settings. Advisor: CRM, calendar and leads.">
        <select name="role" defaultValue="advisor" className="admin-input">
          <option value="advisor">Advisor</option>
          <option value="editor">Editor</option>
          <option value="admin">Admin</option>
        </select>
      </Field>
      <Field label="Temporary password" error={e.password} hint="Share it with them privately; they change it in My account.">
        <PasswordInput name="password" autoComplete="new-password" error={e.password} />
      </Field>
      <div className="flex items-center gap-3 sm:col-span-2">
        <button disabled={pending} className="inline-flex items-center gap-2 rounded-full bg-neutral-900 px-5 py-2 text-sm font-semibold text-white disabled:opacity-60">
          {pending && <Loader2 className="h-4 w-4 animate-spin" />} Add login
        </button>
        <Message state={state} />
      </div>
    </form>
  )
}

export function StaffRow({ id, name, email, role, isMe, lastSignIn }: { id: string; name: string; email: string; role: string; isMe: boolean; lastSignIn: string | null }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [resetting, setResetting] = useState(false)
  const [temp, setTemp] = useState("")
  const run = (fn: () => Promise<unknown>, done?: string, undo?: () => void) =>
    start(async () => {
      try {
        await unwrap(fn())
        if (done) alert(done)
        router.refresh()
      } catch (e) {
        undo?.()
        alert(e instanceof Error ? e.message : "Something went wrong.")
      }
    })

  return (
    <tr className={`border-b border-neutral-100 align-top last:border-0 ${pending ? "opacity-60" : ""}`}>
      <td className="px-4 py-3">
        <span className="font-medium text-neutral-900">{name}</span>
        {isMe && <span className="ms-2 text-xs text-neutral-500">(you)</span>}
        <span className="block text-xs text-neutral-500">{email}</span>
      </td>
      <td className="px-4 py-3">
        <select defaultValue={role} disabled={pending} onChange={(ev) => {
            // A refused change (e.g. the last admin) puts the old role back on screen.
            const select = ev.currentTarget
            run(() => setStaffRole(id, select.value as "admin" | "editor" | "advisor"), undefined, () => (select.value = role))
          }} className="admin-input h-9 w-auto" aria-label="Role">
          <option value="admin">Admin</option>
          <option value="editor">Editor</option>
          <option value="advisor">Advisor</option>
        </select>
      </td>
      <td className="px-4 py-3 text-xs text-neutral-500">{lastSignIn ? new Date(lastSignIn).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Dubai" }) : "Never"}</td>
      <td className="px-4 py-3 text-end">
        {resetting ? (
          <span className="inline-flex items-center gap-2">
            <input value={temp} onChange={(ev) => setTemp(ev.target.value)} placeholder="New temporary password" className="admin-input h-9 w-48" type="text" autoComplete="off" />
            <button type="button" disabled={temp.length < 10} onClick={() => run(() => resetStaffPassword(id, temp), `Password reset for ${email}. Share it with them privately.`)} className="rounded-full bg-neutral-900 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50">
              Set
            </button>
            <button type="button" onClick={() => setResetting(false)} className="text-xs text-neutral-500">
              Cancel
            </button>
          </span>
        ) : (
          <span className="inline-flex gap-3 text-xs">
            {!isMe && (
              <button type="button" onClick={() => setResetting(true)} className="text-neutral-700 hover:underline">
                Reset password
              </button>
            )}
            {!isMe && (
              <button type="button" onClick={() => confirm(`Remove ${email}'s access to the admin?`) && run(() => setStaffRole(id, null))} className="text-red-700 hover:underline">
                Remove access
              </button>
            )}
          </span>
        )}
      </td>
    </tr>
  )
}
