"use client"

import { useMemo, useState, type ReactNode } from "react"
import { BadgeCheck, CircleAlert } from "lucide-react"
import { useLocale, useTranslations } from "next-intl"
import type { Locale } from "@/i18n/locales"
import { buyingCosts, GOLDEN_VISA_MIN, maxLtv, monthlyPayment, paymentSchedule, roi } from "@/lib/calc"
import { aedPer, currencies, formatDate, formatMoney, formatPercent, intlLocale, type Currency } from "@/lib/format"
import { NativeSelect } from "@/components/site/native-select"
import { TransitionLink } from "@/components/motion/view-transitions"
import type { CalculatorKey } from "@/components/tools/registry"
import { cn } from "@/lib/utils"
import { Big, Layout, NumberField, Row, Toggle } from "@/components/tools/ui"

const aed = (n: number, locale: Locale) => formatMoney(n, "AED", locale, { compact: false })

/* ── ROI ───────────────────────────────────────────────────────────────── */

function RoiCalculator() {
  const t = useTranslations("calc.roi")
  const locale = useLocale() as Locale
  const [price, setPrice] = useState(1_800_000)
  const [rent, setRent] = useState(125_000)
  const [costs, setCosts] = useState(18_000)
  const [growth, setGrowth] = useState(4)
  const [years, setYears] = useState(5)
  const r = useMemo(() => roi({ price, annualRent: rent, annualCosts: costs, appreciationPct: growth, years }), [price, rent, costs, growth, years])

  return (
    <Layout
      inputs={
        <>
          <NumberField label={t("price")} value={price} onChange={setPrice} step={50_000} />
          <NumberField label={t("rent")} value={rent} onChange={setRent} step={5_000} />
          <NumberField label={t("costs")} value={costs} onChange={setCosts} step={1_000} />
          <NumberField label={t("appreciation")} value={growth} onChange={setGrowth} step={0.5} min={-10} max={20} suffix="%" />
          <NumberField label={t("years")} value={years} onChange={setYears} min={1} max={30} />
        </>
      }
      results={
        <div className="space-y-8">
          <div className="grid gap-6 sm:grid-cols-2">
            <Big label={t("grossYield")} value={formatPercent(r.grossYield, locale)} accent />
            <Big label={t("netYield")} value={formatPercent(r.netYield, locale)} />
          </div>
          <div>
            <Row label={t("netIncome")} value={aed(r.netIncome, locale)} />
            <Row label={t("futureValue", { years })} value={aed(r.futureValue, locale)} />
            <Row label={t("totalReturn")} value={`${aed(r.totalReturn, locale)} (${formatPercent(r.totalReturnPct, locale)})`} />
          </div>
        </div>
      }
    />
  )
}

/* ── Mortgage ──────────────────────────────────────────────────────────── */

function MortgageCalculator() {
  const t = useTranslations("calc.mortgage")
  const locale = useLocale() as Locale
  const [price, setPrice] = useState(2_000_000)
  const [down, setDown] = useState(40)
  const [rate, setRate] = useState(4.5)
  const [term, setTerm] = useState(25)
  const [resident, setResident] = useState(false)

  const loan = price * (1 - down / 100)
  const monthly = monthlyPayment(loan, rate, term)
  const totalInterest = monthly * term * 12 - loan
  const cap = maxLtv(price, resident)
  const overCap = loan / price > cap + 1e-9

  return (
    <Layout
      inputs={
        <>
          <NumberField label={t("price")} value={price} onChange={setPrice} step={50_000} />
          <NumberField label={t("downPayment")} value={down} onChange={setDown} min={0} max={100} suffix="%" />
          <NumberField label={t("rate")} value={rate} onChange={setRate} step={0.1} min={0} max={15} suffix="%" />
          <NumberField label={t("term")} value={term} onChange={setTerm} min={1} max={25} />
          <div>
            <span className="mb-1.5 block text-sm font-medium text-neutral-700">{t("residency")}</span>
            <div className="grid grid-cols-2 gap-2">
              {[true, false].map((value) => (
                <button
                  key={String(value)}
                  type="button"
                  aria-pressed={resident === value}
                  onClick={() => setResident(value)}
                  className={cn("h-11 rounded-xl border text-sm", resident === value ? "border-rose-500 bg-rose-50 text-rose-700" : "border-neutral-200 text-neutral-700")}
                >
                  {value ? t("resident") : t("nonResident")}
                </button>
              ))}
            </div>
          </div>
        </>
      }
      results={
        <div className="space-y-8">
          <Big label={t("monthly")} value={aed(monthly, locale)} accent />
          <div>
            <Row label={t("loan")} value={aed(loan, locale)} />
            <Row label={t("totalInterest")} value={aed(totalInterest, locale)} />
          </div>
          {overCap && (
            <p className="flex gap-2 rounded-2xl bg-white/10 p-4 text-sm text-rose-100">
              <CircleAlert className="h-5 w-5 shrink-0" />
              {t("ltvWarning", { max: formatPercent(cap, locale, 0), who: resident ? t("ltvResident") : t("ltvNonResident") })}
            </p>
          )}
        </div>
      }
    />
  )
}

/* ── Payment plan ──────────────────────────────────────────────────────── */

function PaymentPlanCalculator() {
  const t = useTranslations("calc.plan")
  const locale = useLocale() as Locale
  const [price, setPrice] = useState(1_800_000)
  const [booking, setBooking] = useState(10)
  const [during, setDuring] = useState(50)
  const [handover, setHandover] = useState(10)
  const [post, setPost] = useState(30)
  const [months, setMonths] = useState(30)
  const [postMonths, setPostMonths] = useState(24)
  const [every, setEvery] = useState<1 | 3>(3)

  const total = booking + during + handover + post
  const schedule = useMemo(
    () => paymentSchedule({ price, onBooking: booking, duringConstruction: during, onHandover: handover, postHandover: post, monthsToHandover: months, postHandoverMonths: postMonths, everyMonths: every }),
    [price, booking, during, handover, post, months, postMonths, every],
  )
  const start = useMemo(() => new Date(), [])
  const dateAt = (month: number) => {
    const d = new Date(start)
    d.setMonth(d.getMonth() + month)
    return formatDate(d, locale, { month: "short", year: "numeric" })
  }
  let paid = 0

  return (
    <Layout
      inputs={
        <>
          <NumberField label={t("price")} value={price} onChange={setPrice} step={50_000} />
          <div className="grid grid-cols-2 gap-3">
            <NumberField label={t("onBooking")} value={booking} onChange={setBooking} max={100} suffix="%" />
            <NumberField label={t("during")} value={during} onChange={setDuring} max={100} suffix="%" />
            <NumberField label={t("onHandover")} value={handover} onChange={setHandover} max={100} suffix="%" />
            <NumberField label={t("postHandover")} value={post} onChange={setPost} max={100} suffix="%" />
          </div>
          <NumberField label={t("months")} value={months} onChange={setMonths} min={1} max={84} />
          <NumberField label={t("postMonths")} value={postMonths} onChange={setPostMonths} min={0} max={120} />
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-neutral-700">{t("frequency")}</span>
            <NativeSelect value={every} onChange={(e) => setEvery(Number(e.target.value) as 1 | 3)} className="h-12">
              <option value={1}>{t("monthly")}</option>
              <option value={3}>{t("quarterly")}</option>
            </NativeSelect>
          </label>
        </>
      }
      results={
        <div>
          {total !== 100 && (
            <p className="mb-6 flex gap-2 rounded-2xl bg-white/10 p-4 text-sm text-rose-100">
              <CircleAlert className="h-5 w-5 shrink-0" />
              {t("sumWarning", { total })}
            </p>
          )}
          <p className="mb-3 font-semibold">{t("schedule")}</p>
          <div className="max-h-[28rem] overflow-y-auto pe-2" data-lenis-prevent>
            <table className="w-full text-sm">
              <thead className="text-start text-white/60">
                <tr>
                  <th className="py-2 text-start font-normal">{t("date")}</th>
                  <th className="py-2 text-start font-normal">{t("stage.label")}</th>
                  <th className="py-2 text-end font-normal">{t("amount")}</th>
                  <th className="py-2 text-end font-normal">{t("paid")}</th>
                </tr>
              </thead>
              <tbody>
                {schedule.map((row, i) => {
                  paid += row.amount
                  return (
                    <tr key={i} className="border-t border-white/10">
                      <td className="py-2">{dateAt(row.month)}</td>
                      <td className="py-2 text-white/80">{t(`stage.${row.stage}`)}</td>
                      <td className="py-2 text-end font-medium">{aed(row.amount, locale)}</td>
                      <td className="py-2 text-end text-white/70">{formatPercent(price ? paid / price : 0, locale, 0)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      }
    />
  )
}

/* ── Buying costs ──────────────────────────────────────────────────────── */

function FeesCalculator() {
  const t = useTranslations("calc.fees")
  const locale = useLocale() as Locale
  const [price, setPrice] = useState(2_000_000)
  const [offPlan, setOffPlan] = useState(false)
  const [resale, setResale] = useState(true)
  const [withMortgage, setWithMortgage] = useState(false)
  const [loan, setLoan] = useState(1_200_000)

  const items = buyingCosts({ price, offPlan, resale, loan: withMortgage ? loan : 0 })
  const total = items.reduce((sum, i) => sum + i.amount, 0)

  return (
    <Layout
      inputs={
        <>
          <NumberField label={t("price")} value={price} onChange={setPrice} step={50_000} />
          <Toggle label={t("offPlan")} checked={offPlan} onChange={setOffPlan} />
          {!offPlan && <Toggle label={t("resale")} checked={resale} onChange={setResale} />}
          <Toggle label={t("mortgage")} checked={withMortgage} onChange={setWithMortgage} />
          {withMortgage && <NumberField label={t("loan")} value={loan} onChange={setLoan} step={50_000} />}
        </>
      }
      results={
        <div className="space-y-6">
          <Big label={t("total")} value={aed(total, locale)} accent />
          <p className="text-sm text-white/60">{t("share", { value: formatPercent(price ? total / price : 0, locale) })}</p>
          <div>
            {items.map((item) => (
              <Row key={item.key} label={t(`items.${item.key}`)} value={aed(item.amount, locale)} />
            ))}
          </div>
        </div>
      }
    />
  )
}

/* ── Golden Visa ───────────────────────────────────────────────────────── */

function GoldenVisaCalculator() {
  const t = useTranslations("calc.goldenVisa")
  const locale = useLocale() as Locale
  const [value, setValue] = useState(1_500_000)
  const [offPlan, setOffPlan] = useState(false)
  const [mortgaged, setMortgaged] = useState(false)
  const eligible = value >= GOLDEN_VISA_MIN

  return (
    <Layout
      inputs={
        <>
          <NumberField label={t("value")} value={value} onChange={setValue} step={100_000} />
          <Toggle label={t("offPlan")} checked={offPlan} onChange={setOffPlan} />
          <Toggle label={t("mortgaged")} checked={mortgaged} onChange={setMortgaged} />
        </>
      }
      results={
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            {eligible ? <BadgeCheck className="h-10 w-10 text-rose-300" /> : <CircleAlert className="h-10 w-10 text-white/60" />}
            <p className={cn("text-3xl font-bold md:text-4xl", eligible && "text-rose-metal")}>{eligible ? t("eligible") : t("notYet")}</p>
          </div>
          <p className="text-white/80">{eligible ? t("eligibleBody") : t("notYetBody", { amount: formatMoney(GOLDEN_VISA_MIN - value, "AED", locale) })}</p>
          {(offPlan || mortgaged) && <p className="rounded-2xl bg-white/10 p-4 text-sm text-white/80">{t("conditions")}</p>}
          <TransitionLink href="/book?purpose=goldenVisa" className="inline-flex rounded-full bg-white px-6 py-3 font-semibold text-neutral-900">
            {t("cta")}
          </TransitionLink>
        </div>
      }
    />
  )
}

/* ── Currency ──────────────────────────────────────────────────────────── */

function CurrencyCalculator() {
  const t = useTranslations("calc.currency")
  const locale = useLocale() as Locale
  const [amount, setAmount] = useState(2_000_000)
  const [from, setFrom] = useState<Currency>("AED")
  const names = useMemo(() => new Intl.DisplayNames(intlLocale(locale), { type: "currency" }), [locale])
  const inAed = amount * aedPer[from]

  return (
    <Layout
      inputs={
        <>
          <NumberField label={t("amount")} value={amount} onChange={setAmount} step={1_000} />
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-neutral-700">{t("from")}</span>
            <NativeSelect value={from} onChange={(e) => setFrom(e.target.value as Currency)} className="h-12">
              {currencies.map((c) => (
                <option key={c} value={c}>
                  {c} · {names.of(c)}
                </option>
              ))}
            </NativeSelect>
          </label>
        </>
      }
      results={
        <div>
          {currencies
            .filter((c) => c !== from)
            .map((c) => (
              <Row key={c} label={`${c} · ${names.of(c)}`} value={formatMoney(inAed / aedPer[c], c, locale, { compact: false })} />
            ))}
          <p className="mt-6 text-xs text-white/50">{t("rates")}</p>
        </div>
      }
    />
  )
}

const registry: Record<CalculatorKey, () => ReactNode> = {
  roi: RoiCalculator,
  mortgage: MortgageCalculator,
  paymentPlan: PaymentPlanCalculator,
  fees: FeesCalculator,
  goldenVisa: GoldenVisaCalculator,
  currency: CurrencyCalculator,
}

export function CalculatorView({ calculator }: { calculator: CalculatorKey }) {
  const Calculator = registry[calculator]
  return <Calculator />
}
