import { ChevronDown } from "lucide-react"
import type { ComponentProps } from "react"
import { cn } from "@/lib/utils"

/** Styled native <select>: accessible, mobile-friendly pickers, and RTL-aware chevron placement. */
export function NativeSelect({ className, wrapperClassName, ...props }: ComponentProps<"select"> & { wrapperClassName?: string }) {
  return (
    <div className={cn("relative", wrapperClassName)}>
      <select
        {...props}
        className={cn(
          "h-11 w-full appearance-none rounded-xl border border-neutral-200 bg-white pe-9 ps-3 text-sm text-neutral-900 outline-none focus:border-rose-300 focus:ring-2 focus:ring-rose-100",
          className,
        )}
      />
      <ChevronDown aria-hidden className="pointer-events-none absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
    </div>
  )
}
