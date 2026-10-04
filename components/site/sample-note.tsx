import { FlaskConical } from "lucide-react"
import { useTranslations } from "next-intl"
import { SAMPLE_DATA } from "@/lib/data/shared"
import { cn } from "@/lib/utils"

/** Marks figures and listings as samples while the site runs on mock data. Renders nothing once real data is live. */
export function SampleNote({ className }: { className?: string }) {
  const t = useTranslations("common")
  if (!SAMPLE_DATA) return null
  return (
    <p className={cn("inline-flex items-center gap-2 rounded-full bg-sand-100 px-3 py-1 text-xs text-neutral-600", className)}>
      <FlaskConical className="h-3.5 w-3.5 text-rose-500" />
      {t("sampleData")}
    </p>
  )
}
