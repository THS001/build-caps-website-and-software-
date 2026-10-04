import { ArrowRight, Hourglass } from "lucide-react"
import { useTranslations } from "next-intl"
import { TransitionLink } from "@/components/motion/view-transitions"
import { cn } from "@/lib/utils"

type Topic = "communities" | "launches" | "developers" | "team" | "reports" | "listings"

/** Stands in for a list that has nothing published yet, and points to a person instead. */
export function EmptyNote({ topic, className }: { topic: Topic; className?: string }) {
  const t = useTranslations("common.empty")
  return (
    <div className={cn("flex flex-col items-start gap-4 rounded-3xl bg-sand-100/70 p-8 md:flex-row md:items-center md:justify-between md:p-10", className)}>
      <div className="flex items-start gap-4">
        <Hourglass className="mt-1 h-6 w-6 shrink-0 text-rose-500" />
        <p className="max-w-2xl text-lg text-neutral-700">{t(topic)}</p>
      </div>
      <TransitionLink href="/book" className="inline-flex shrink-0 items-center gap-2 rounded-full bg-neutral-900 px-5 py-3 text-sm font-semibold text-white">
        {t("cta")}
        <ArrowRight className="h-4 w-4 rtl:rotate-180" />
      </TransitionLink>
    </div>
  )
}
