import type { ReactNode } from "react"
import { Reveal } from "@/components/reveal"
import { cn } from "@/lib/utils"

type SectionHeaderProps = {
  eyebrow?: string
  title: string
  subtitle?: string
  /** Link or button aligned to the end of the header row on wide screens. */
  action?: ReactNode
  align?: "start" | "center"
  tone?: "light" | "dark"
  className?: string
}

export function SectionHeader({ eyebrow, title, subtitle, action, align = "start", tone = "light", className }: SectionHeaderProps) {
  const dark = tone === "dark"
  return (
    <Reveal className={cn("mb-10 flex flex-col gap-6 md:mb-14", align === "center" ? "items-center text-center" : "md:flex-row md:items-end md:justify-between", className)}>
      <div className={cn(align === "center" && "flex flex-col items-center")}>
        {eyebrow && <p className={cn("text-label mb-3", dark ? "text-rose-300" : "text-rose-700")}>{eyebrow}</p>}
        <h2 className={cn("max-w-3xl text-3xl font-semibold leading-tight md:text-5xl", dark ? "text-white" : "text-neutral-900")}>{title}</h2>
        {subtitle && <p className={cn("mt-4 max-w-2xl text-lg", dark ? "text-white/75" : "text-neutral-600")}>{subtitle}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </Reveal>
  )
}
