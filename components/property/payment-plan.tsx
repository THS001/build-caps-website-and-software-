import { useTranslations } from "next-intl"
import type { PaymentPlan as Plan } from "@/lib/data"
import { cn } from "@/lib/utils"

const segments = [
  { key: "onBooking", className: "bg-rose-500" },
  { key: "duringConstruction", className: "bg-rose-300" },
  { key: "onHandover", className: "bg-navy-500" },
  { key: "postHandover", className: "bg-navy-900" },
] as const

/** Stacked bar of the payment plan: what is paid when, as a share of the price. */
export function PaymentPlanBar({ plan, className }: { plan: Plan; className?: string }) {
  const t = useTranslations("property.paymentPlan")
  const parts = segments.filter((s) => plan[s.key] > 0)

  return (
    <div className={className}>
      <div className="flex h-3 overflow-hidden rounded-full" role="img" aria-label={parts.map((s) => `${t(s.key)} ${plan[s.key]}%`).join(", ")}>
        {parts.map((s) => (
          <div key={s.key} className={s.className} style={{ width: `${plan[s.key]}%` }} />
        ))}
      </div>
      <dl className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {parts.map((s) => (
          <div key={s.key}>
            <dt className="flex items-center gap-2 text-xs text-neutral-500">
              <span className={cn("h-2 w-2 rounded-full", s.className)} />
              {t(s.key)}
            </dt>
            <dd className="mt-1 text-2xl font-semibold text-neutral-900">{plan[s.key]}%</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}
