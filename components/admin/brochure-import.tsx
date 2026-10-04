"use client"

import { useState, useTransition, type FormEvent } from "react"
import { FileUp, Loader2 } from "lucide-react"
import { importBrochure } from "@/app/[locale]/admin/actions"
import { uploadForImport } from "@/components/admin/private-upload"

const MAX_MB = 20

export function BrochureImport() {
  const [error, setError] = useState<string>()
  const [pending, start] = useTransition()

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const file = data.get("brochure")
    if (!(file instanceof File) || file.type !== "application/pdf") return setError("Choose a PDF brochure.")
    if (file.size > MAX_MB * 1024 * 1024) return setError(`The PDF must be ${MAX_MB} MB or smaller.`)
    setError(undefined)
    start(async () => {
      try {
        // Uploaded first, then read by the server (on success it opens the draft).
        const path = await uploadForImport(file, "brochures")
        const result = await importBrochure(path, String(data.get("note") ?? ""))
        if (result.status === "error") setError(result.message)
      } catch (e) {
        setError(e instanceof Error ? e.message : "Import failed.")
      }
    })
  }

  return (
    <form onSubmit={submit} className="mt-8 space-y-4 rounded-2xl bg-white p-6 ring-1 ring-neutral-200">
      <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-neutral-300 p-10 text-sm text-neutral-600 hover:border-rose-300">
        <FileUp className="h-7 w-7" />
        Choose a PDF (up to {MAX_MB} MB)
        <input name="brochure" type="file" accept="application/pdf" required className="text-xs" />
      </label>
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-neutral-800">Note for the AI (optional)</span>
        <input name="note" placeholder="e.g. Use the 2-bed type B, 1,240 sq ft" className="admin-input" />
      </label>
      {error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      <button type="submit" disabled={pending} className="inline-flex items-center gap-2 rounded-full bg-neutral-900 px-6 py-2.5 text-sm font-semibold text-white disabled:opacity-60">
        {pending && <Loader2 className="h-4 w-4 animate-spin" />}
        {pending ? "Reading the brochure… (about a minute)" : "Draft the listing"}
      </button>
    </form>
  )
}
