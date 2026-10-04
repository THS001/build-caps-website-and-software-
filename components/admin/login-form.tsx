"use client"

import { useState, type FormEvent } from "react"
import { useRouter } from "next/navigation"
import { browserClient } from "@/lib/supabase/browser"

export function LoginForm() {
  const router = useRouter()
  const [error, setError] = useState<string>()
  const [pending, setPending] = useState(false)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    setPending(true)
    setError(undefined)
    const { error } = await browserClient().auth.signInWithPassword({
      email: String(form.get("email")),
      password: String(form.get("password")),
    })
    setPending(false)
    if (error) return setError("Those details didn’t work. Check your email and password.")
    router.replace("/admin")
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 space-y-3">
      <input name="email" type="email" required autoComplete="email" placeholder="Email" className="admin-input" />
      <input name="password" type="password" required autoComplete="current-password" placeholder="Password" className="admin-input" />
      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
      <button type="submit" disabled={pending} className="h-11 w-full rounded-xl bg-neutral-900 font-semibold text-white disabled:opacity-60">
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  )
}
