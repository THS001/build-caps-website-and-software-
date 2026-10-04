"use client"

import { useMemo, useTransition } from "react"
import { Globe } from "lucide-react"
import { useLocale, useTranslations } from "next-intl"
import { usePathname, useRouter } from "@/i18n/navigation"
import { localeNames, locales, type Locale } from "@/i18n/locales"
import { areaUnits, currencies, intlLocale, type AreaUnit, type Currency } from "@/lib/format"
import { usePreferences } from "@/components/preferences-provider"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

/** Language, display currency and area unit in one globe menu. */
export function PreferencesMenu({ className }: { className?: string }) {
  const t = useTranslations("common")
  const locale = useLocale() as Locale
  const pathname = usePathname()
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const { currency, unit, setCurrency, setUnit } = usePreferences()

  const currencyNames = useMemo(() => {
    const names = new Intl.DisplayNames(intlLocale(locale), { type: "currency" })
    return Object.fromEntries(currencies.map((c) => [c, names.of(c) ?? c])) as Record<Currency, string>
  }, [locale])

  const changeLocale = (next: string) =>
    startTransition(() => router.replace(`${pathname}${window.location.search}`, { locale: next as Locale }))

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          "flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-rose-300",
          isPending && "opacity-60",
          className,
        )}
        aria-label={`${t("language")}, ${t("currency")}, ${t("unit")}`}
      >
        <Globe className="h-4 w-4" />
        <span className="uppercase">{locale}</span>
        <span className="hidden opacity-50 sm:inline">·</span>
        <span className="hidden sm:inline">{currency}</span>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="max-h-[80vh] min-w-52 rounded-xl p-1.5">
        <DropdownMenuLabel className="text-label text-rose-700">{t("language")}</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={locale} onValueChange={changeLocale}>
          {locales.map((l) => (
            <DropdownMenuRadioItem key={l} value={l} lang={l} className="rounded-lg py-2">
              {localeNames[l]}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>

        <DropdownMenuSeparator />

        <DropdownMenuSub>
          <DropdownMenuSubTrigger className="rounded-lg py-2">
            <span className="flex-1">{t("currency")}</span>
            <span className="text-xs text-neutral-500">{currency}</span>
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="rounded-xl p-1.5">
            <DropdownMenuRadioGroup value={currency} onValueChange={(c) => setCurrency(c as Currency)}>
              {currencies.map((c) => (
                <DropdownMenuRadioItem key={c} value={c} className="gap-3 rounded-lg py-2">
                  <span className="w-9 font-medium">{c}</span>
                  <span className="text-neutral-500">{currencyNames[c]}</span>
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuSubContent>
        </DropdownMenuSub>

        <DropdownMenuSub>
          <DropdownMenuSubTrigger className="rounded-lg py-2">
            <span className="flex-1">{t("unit")}</span>
            <span className="text-xs text-neutral-500">{t(`units.${unit}`)}</span>
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="rounded-xl p-1.5">
            <DropdownMenuRadioGroup value={unit} onValueChange={(u) => setUnit(u as AreaUnit)}>
              {areaUnits.map((u) => (
                <DropdownMenuRadioItem key={u} value={u} className="rounded-lg py-2">
                  {t(`units.${u}`)}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
