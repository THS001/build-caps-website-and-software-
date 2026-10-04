"use server"

import { attempt } from "@/lib/action-result"
import { revalidatePath } from "next/cache"
import { after } from "next/server"
import { z } from "zod"
import { currentStaff, serverClient } from "@/lib/supabase/server"
import { QA_TABLES, type QaTable } from "@/lib/ai/agents/translation-qa"

// Translation QA in the admin: resolve a flag once the text is fixed, re-check
// one item, or check everything published.

async function requireEditor() {
  const staff = await currentStaff()
  if (!staff || staff.role === "advisor") throw new Error("Only editors and admins can do this.")
  return staff
}

const tableSchema = z.enum(Object.keys(QA_TABLES) as [QaTable, ...QaTable[]])

export async function resolveFlag(id: string) {
  return attempt(async () => {
    const staff = await requireEditor()
    const supabase = await serverClient()
    const { error } = await supabase.from("translation_flags").update({ resolved_at: new Date().toISOString(), resolved_by: staff.id }).eq("id", z.string().uuid().parse(id))
    if (error) throw new Error(error.message)
    revalidatePath("/[locale]/admin/translations", "page")
  })
}

/** Re-checks one item now (after its text was fixed). Returns the number of open flags. */
export async function recheckItem(table: string, key: string) {
  return attempt(async () => {
    await requireEditor()
    const { runTranslationQa } = await import("@/lib/ai/agents/translation-qa")
    const flags = await runTranslationQa(tableSchema.parse(table), z.string().min(1).max(120).parse(key), { force: true })
    revalidatePath("/[locale]/admin/translations", "page")
    return flags
  })
}

/** Checks every published item whose wording changed since its last check, in the background. */
export async function checkAllPublished() {
  return attempt(async () => {
    await requireEditor()
    after(async () => {
      const { runTranslationQaAll } = await import("@/lib/ai/agents/translation-qa")
      await runTranslationQaAll()
    })
    return "Started. New flags appear here over the next few minutes; reload to see them."
  })
}
