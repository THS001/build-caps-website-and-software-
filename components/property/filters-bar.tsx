"use client"

import { useTransition } from "react"
import { Car, LayoutGrid, Map as MapIcon, RotateCcw, SlidersHorizontal } from "lucide-react"
import { useLocale, useTranslations } from "next-intl"
import { usePathname, useRouter } from "@/i18n/navigation"
import type { Locale } from "@/i18n/locales"
import type { PropertyFilters } from "@/lib/data/types"
import { formatMoney } from "@/lib/format"
import { filtersToParams } from "@/lib/search/parse-query"
import { commuteTargets, MONTHLY } from "@/lib/search/lifestyle"
import { NativeSelect } from "@/components/site/native-select"
import { cn } from "@/lib/utils"

type Option = { value: string; label: string }

type FiltersBarProps = {
  filters: PropertyFilters
  query?: string
  view: "grid" | "map"
  communities: Option[]
  developers: Option[]
  handoverYears: number[]
}

const BUDGETS = [500_000, 1_000_000, 1_500_000, 2_000_000, 3_000_000, 5_000_000, 10_000_000, 20_000_000]
const TYPES = ["apartment", "villa", "townhouse", "penthouse", "duplex"] as const
const MINUTES = [15, 20, 25, 30, 45, 60]
const MONTHLY_BUDGETS = [5_000, 8_000, 10_000, 15_000, 20_000, 30_000, 50_000]

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex min-w-0 flex-col gap-1.5">
      <span className="text-xs font-medium text-neutral-500">{label}</span>
      {children}
    </label>
  )
}

/** Listing filters kept in the URL, so every result set is shareable and crawlable. */
export function FiltersBar({ filters, query, view, communities, developers, handoverYears }: FiltersBarProps) {
  const t = useTranslations("properties")
  const tc = useTranslations("common")
  const tl = useTranslations("properties.lifestyle")
  const tp = useTranslations("intel.dayInLife.places")
  const locale = useLocale() as Locale
  const router = useRouter()
  const pathname = usePathname()
  const [pending, startTransition] = useTransition()

  const update = (patch: Partial<PropertyFilters>, nextView = view) => {
    const params = filtersToParams({ ...filters, ...patch })
    if (query) params.set("q", query)
    if (nextView === "map") params.set("view", "map")
    startTransition(() => router.replace(`${pathname}${params.size ? `?${params}` : ""}`, { scroll: false }))
  }

  const reset = () => startTransition(() => router.replace(view === "map" ? `${pathname}?view=map` : pathname, { scroll: false }))
  const any = t("filters.any")
  const pick = (value: string) => (value === "" ? undefined : value)

  const fields = (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-8">
      <Field label={t("filters.status")}>
        <NativeSelect value={filters.status ?? ""} onChange={(e) => update({ status: pick(e.target.value) as PropertyFilters["status"] })}>
          <option value="">{any}</option>
          <option value="offPlan">{tc("status.offPlan")}</option>
          <option value="ready">{tc("status.ready")}</option>
        </NativeSelect>
      </Field>
      <Field label={t("filters.type")}>
        <NativeSelect value={filters.type ?? ""} onChange={(e) => update({ type: pick(e.target.value) as PropertyFilters["type"] })}>
          <option value="">{any}</option>
          {TYPES.map((type) => (
            <option key={type} value={type}>
              {tc(`types.${type}`)}
            </option>
          ))}
        </NativeSelect>
      </Field>
      <Field label={t("filters.community")}>
        <NativeSelect value={filters.community ?? ""} onChange={(e) => update({ community: pick(e.target.value) })}>
          <option value="">{any}</option>
          {communities.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </NativeSelect>
      </Field>
      <Field label={t("filters.beds")}>
        <NativeSelect value={filters.minBeds ?? ""} onChange={(e) => update({ minBeds: e.target.value === "" ? undefined : Number(e.target.value) })}>
          <option value="">{any}</option>
          {[0, 1, 2, 3, 4, 5].map((n) => (
            <option key={n} value={n}>
              {n === 0 ? tc("beds", { count: 0 }) : `${tc("beds", { count: n })}+`}
            </option>
          ))}
        </NativeSelect>
      </Field>
      <Field label={t("filters.minPrice")}>
        <NativeSelect value={filters.minPrice ?? ""} onChange={(e) => update({ minPrice: e.target.value === "" ? undefined : Number(e.target.value) })}>
          <option value="">{any}</option>
          {BUDGETS.map((b) => (
            <option key={b} value={b}>
              {formatMoney(b, "AED", locale)}
            </option>
          ))}
        </NativeSelect>
      </Field>
      <Field label={t("filters.maxPrice")}>
        <NativeSelect value={filters.maxPrice ?? ""} onChange={(e) => update({ maxPrice: e.target.value === "" ? undefined : Number(e.target.value) })}>
          <option value="">{any}</option>
          {BUDGETS.map((b) => (
            <option key={b} value={b}>
              {formatMoney(b, "AED", locale)}
            </option>
          ))}
        </NativeSelect>
      </Field>
      <Field label={t("filters.handover")}>
        <NativeSelect value={filters.handoverYear ?? ""} onChange={(e) => update({ handoverYear: e.target.value === "" ? undefined : Number(e.target.value) })}>
          <option value="">{any}</option>
          {handoverYears.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </NativeSelect>
      </Field>
      <Field label={t("filters.developer")}>
        <NativeSelect value={filters.developer ?? ""} onChange={(e) => update({ developer: pick(e.target.value) })}>
          <option value="">{any}</option>
          {developers.map((d) => (
            <option key={d.value} value={d.value}>
              {d.label}
            </option>
          ))}
        </NativeSelect>
      </Field>
    </div>
  )

  const lifestyle = (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      <Field label={tl("commuteTo")}>
        <NativeSelect value={filters.commuteTo ?? ""} onChange={(e) => update({ commuteTo: pick(e.target.value) as PropertyFilters["commuteTo"], commuteMax: e.target.value ? (filters.commuteMax ?? 30) : undefined })}>
          <option value="">{any}</option>
          {commuteTargets.map((k) => (
            <option key={k} value={k}>
              {tp(k)}
            </option>
          ))}
        </NativeSelect>
      </Field>
      <Field label={tl("within")}>
        <NativeSelect value={filters.commuteMax ?? ""} disabled={!filters.commuteTo} onChange={(e) => update({ commuteMax: e.target.value === "" ? undefined : Number(e.target.value) })}>
          <option value="">{any}</option>
          {MINUTES.map((m) => (
            <option key={m} value={m}>
              {tl("minutes", { count: m })}
            </option>
          ))}
        </NativeSelect>
      </Field>
      <Field label={tl("monthly")}>
        <NativeSelect value={filters.maxMonthly ?? ""} onChange={(e) => update({ maxMonthly: e.target.value === "" ? undefined : Number(e.target.value) })}>
          <option value="">{any}</option>
          {MONTHLY_BUDGETS.map((b) => (
            <option key={b} value={b}>
              {formatMoney(b, "AED", locale)}
            </option>
          ))}
        </NativeSelect>
      </Field>
      <div className="col-span-2 flex flex-wrap items-end gap-2 md:col-span-1">
        <ToggleChip active={!!filters.nearSchool} onClick={() => update({ nearSchool: filters.nearSchool ? undefined : true })}>
          {tl("school")}
        </ToggleChip>
        <ToggleChip active={!!filters.nearMetro} onClick={() => update({ nearMetro: filters.nearMetro ? undefined : true })}>
          {tl("metro")}
        </ToggleChip>
      </div>
      <p className="col-span-2 text-xs text-neutral-500 md:col-span-4">{tl("note", { rate: MONTHLY.rate, years: MONTHLY.years })}</p>
    </div>
  )
  const lifestyleOpen = Boolean(filters.commuteTo || filters.nearSchool || filters.nearMetro || filters.maxMonthly)

  return (
    <div className={cn("space-y-4 transition-opacity", pending && "opacity-60")}>
      {/* Desktop: always open. Mobile: a disclosure, so results stay above the fold. */}
      <div className="hidden md:block">{fields}</div>
      <details open={lifestyleOpen} className="group rounded-2xl bg-sand-100/60 p-4">
        <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-semibold text-neutral-900">
          <Car className="h-4 w-4 text-rose-500" />
          {tl("title")}
          <span className="font-normal text-neutral-500">{tl("subtitle")}</span>
        </summary>
        <div className="mt-4">{lifestyle}</div>
      </details>
      <details className="rounded-2xl bg-white p-4 ring-1 ring-neutral-200 md:hidden">
        <summary className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-neutral-900">
          <SlidersHorizontal className="h-4 w-4" />
          {t("filters.title")}
        </summary>
        <div className="mt-4">{fields}</div>
      </details>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <ToggleChip active={!!filters.goldenVisa} onClick={() => update({ goldenVisa: filters.goldenVisa ? undefined : true })}>
            {t("filters.goldenVisa")}
          </ToggleChip>
          <ToggleChip active={!!filters.postHandover} onClick={() => update({ postHandover: filters.postHandover ? undefined : true })}>
            {t("filters.paymentPlan")}
          </ToggleChip>
          <button type="button" onClick={reset} className="inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-sm text-neutral-500 hover:text-neutral-900">
            <RotateCcw className="h-3.5 w-3.5" />
            {t("filters.reset")}
          </button>
        </div>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 text-sm text-neutral-500">
            <span className="hidden sm:inline">{t("sort.label")}</span>
            <NativeSelect className="h-10 w-auto" value={filters.sort ?? "featured"} onChange={(e) => update({ sort: e.target.value as PropertyFilters["sort"] })}>
              {(["featured", "priceAsc", "priceDesc", "yieldDesc", "handoverAsc", "newest"] as const).map((s) => (
                <option key={s} value={s}>
                  {t(`sort.${s}`)}
                </option>
              ))}
            </NativeSelect>
          </label>
          <div className="flex rounded-full bg-neutral-100 p-1" role="group" aria-label={`${t("view.grid")} / ${t("view.map")}`}>
            <ViewButton active={view === "grid"} onClick={() => update({}, "grid")} label={t("view.grid")}>
              <LayoutGrid className="h-4 w-4" />
            </ViewButton>
            <ViewButton active={view === "map"} onClick={() => update({}, "map")} label={t("view.map")}>
              <MapIcon className="h-4 w-4" />
            </ViewButton>
          </div>
        </div>
      </div>
    </div>
  )
}

function ToggleChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "rounded-full border px-4 py-2 text-sm transition-colors",
        active ? "border-rose-500 bg-rose-50 text-rose-700" : "border-neutral-200 bg-white text-neutral-700 hover:border-rose-300",
      )}
    >
      {children}
    </button>
  )
}

function ViewButton({ active, onClick, label, children }: { active: boolean; onClick: () => void; label: string; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn("flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm", active ? "bg-white text-neutral-900 shadow-sm" : "text-neutral-500")}
    >
      {children}
      <span className="hidden sm:inline">{label}</span>
    </button>
  )
}
