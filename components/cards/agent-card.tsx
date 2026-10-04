import { Languages } from "lucide-react"
import { useTranslations } from "next-intl"
import { localeNames } from "@/i18n/locales"
import type { Agent } from "@/lib/data"
import { TransitionLink } from "@/components/motion/view-transitions"
import { cn } from "@/lib/utils"
import { AdvisorScoreBadge } from "./advisor-score"

export function AgentAvatar({ agent, className }: { agent: Agent; className?: string }) {
  const initials = agent.name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
  return (
    <div
      aria-hidden
      className={cn(
        "flex items-center justify-center rounded-full bg-gradient-to-br from-rose-300 via-rose-500 to-navy-500 font-semibold text-white",
        className,
      )}
    >
      {initials}
    </div>
  )
}

export function AgentCard({ agent }: { agent: Agent }) {
  const t = useTranslations("team")

  return (
    <TransitionLink href={`/team/${agent.slug}`} className="group block rounded-3xl bg-white p-6 ring-1 ring-neutral-200 transition-shadow hover:shadow-[0_30px_80px_-40px_rgb(0_23_63/0.35)]">
      <AgentAvatar agent={agent} className="h-16 w-16 text-lg" />
      <h3 className="mt-5 text-lg font-semibold text-neutral-900 group-hover:underline">{agent.name}</h3>
      <p className="text-sm text-neutral-500">{t(`roles.${agent.role}`)}</p>
      <AdvisorScoreBadge score={agent.score} />
      <p className="mt-4 flex items-start gap-2 text-sm text-neutral-700">
        <Languages className="mt-0.5 h-4 w-4 shrink-0 text-rose-500" />
        {agent.languages.map((l) => localeNames[l]).join(" · ")}
      </p>
    </TransitionLink>
  )
}
