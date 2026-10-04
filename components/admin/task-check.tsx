"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { Check } from "lucide-react"
import { completeTask } from "@/app/[locale]/admin/crm-actions"
import { cn } from "@/lib/utils"
import { unwrap } from "@/lib/action-result"

export function TaskCheck({ id, done }: { id: string; done: boolean }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  return (
    <button
      type="button"
      disabled={pending}
      aria-label={done ? "Mark as not done" : "Mark as done"}
      onClick={() =>
        start(async () => {
          try {
            await unwrap(completeTask(id, !done))
            router.refresh()
          } catch (e) {
            alert(e instanceof Error ? e.message : "Something went wrong.")
          }
        })
      }
      className={cn("flex h-5 w-5 shrink-0 items-center justify-center rounded-md ring-1", done ? "bg-emerald-600 text-white ring-emerald-600" : "ring-neutral-300 hover:ring-neutral-500", pending && "opacity-50")}
    >
      {done && <Check className="h-3.5 w-3.5" />}
    </button>
  )
}
