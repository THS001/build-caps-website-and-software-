import { Suspense, type ReactNode } from "react"
import { getTranslations } from "next-intl/server"
import type { Locale } from "@/i18n/locales"
import { getCommunities, getDevelopers, getProjectProgress, getProjects, getPromises, localize } from "@/lib/data"
import { getMarketModel, getToolProperties } from "@/lib/market/model"
import { handoverScore } from "@/lib/insights/handover"
import { formatPercent } from "@/lib/format"
import { supabaseConfigured } from "@/lib/supabase/config"
import { publicClient } from "@/lib/supabase/public"
import type { AiToolKey } from "@/components/tools/ai-registry"
import { EstimateTool } from "./estimate"
import { DataRoom, type Transaction } from "./data-room"
import { MatchMe } from "./match-me"
import { WealthTwin } from "./wealth-twin"
import { RegretRadar } from "./regret-radar"
import { PortfolioArchitect } from "./portfolio-architect"
import { DayInLife } from "./day-in-life"
import { FamilyRoom } from "./family-room"
import { DocumentCheck } from "./document-check"
import { HandoverCard } from "./handover-card"
import { GhostTenant } from "./ghost-tenant"
import { FutureView } from "./future-view"
import { BuyerBloc, type BlocLaunch } from "./buyer-bloc"
import { ToolEmpty } from "./tool-empty"

/** Investors needed before Buildcaps approaches a developer for block terms. */
const BLOC_TARGET = Number(process.env.BUYER_BLOC_TARGET ?? 10)

async function latestTransactions(): Promise<Transaction[]> {
  if (!supabaseConfigured) return []
  const { data } = await publicClient().from("dld_transactions").select("instance_date, area_name, rooms, area_sqm, worth_aed, price_per_sqm, project_name").order("instance_date", { ascending: false }).limit(25)
  return (data ?? []).map((r) => ({ date: r.instance_date, area: r.area_name, rooms: r.rooms, sqm: Number(r.area_sqm), worth: Number(r.worth_aed), ppsm: Number(r.price_per_sqm), project: r.project_name }))
}

async function blocCount(slug: string) {
  if (!supabaseConfigured) return 0
  const { data } = await publicClient().rpc("bloc_interest", { p_project: slug })
  return Number(data ?? 0)
}

/** Loads what each tool needs on the server and renders it. Client tools sit in Suspense for their URL parameters. */
export async function AiToolBody({ tool, locale }: { tool: AiToolKey; locale: Locale }) {
  const wrap = (node: ReactNode) => <Suspense fallback={<div className="h-96 animate-pulse rounded-3xl bg-sand-100" />}>{node}</Suspense>

  switch (tool) {
    case "estimate": {
      const communities = await getCommunities()
      if (!communities.length) return <ToolEmpty slug="estimate" interest="valuation" />
      return wrap(<EstimateTool communities={communities.map((c) => ({ slug: c.slug, name: c.name }))} />)
    }
    case "dataRoom": {
      const [model, transactions] = await Promise.all([getMarketModel(), latestTransactions()])
      if (!model.length) return <ToolEmpty slug="data-room" />
      return <DataRoom model={model} transactions={transactions} />
    }
    case "matchMe":
      return <MatchMe />
    case "wealthTwin": {
      const [model, properties] = await Promise.all([getMarketModel(), getToolProperties(locale)])
      if (!model.length) return <ToolEmpty slug="wealth-twin" />
      return wrap(<WealthTwin model={model} properties={properties} />)
    }
    case "regretRadar": {
      const model = await getMarketModel()
      if (!model.length) return <ToolEmpty slug="regret-radar" />
      return <RegretRadar model={model} />
    }
    case "portfolioArchitect": {
      const [model, properties] = await Promise.all([getMarketModel(), getToolProperties(locale)])
      if (!model.length || !properties.length) return <ToolEmpty slug="portfolio-architect" />
      return <PortfolioArchitect model={model} properties={properties} />
    }
    case "dayInYourLife": {
      const [communities, properties] = await Promise.all([getCommunities(), getToolProperties(locale)])
      if (!communities.length) return <ToolEmpty slug="day-in-your-life" />
      return wrap(<DayInLife communities={communities.map((c) => ({ slug: c.slug, name: c.name, geo: c.geo }))} properties={properties} />)
    }
    case "familyRoom": {
      const forSale = (await getToolProperties(locale)).filter((p) => p.listing === "sale")
      if (!forSale.length) return <ToolEmpty slug="family-room" />
      return wrap(<FamilyRoom properties={forSale} />)
    }
    case "promiseLedger":
      return <PromiseLedger locale={locale} />
    case "handoverScore":
      return <HandoverList locale={locale} />
    case "ghostTenant": {
      const [model, properties] = await Promise.all([getMarketModel(), getToolProperties(locale)])
      if (!model.length) return <ToolEmpty slug="ghost-tenant" />
      return wrap(<GhostTenant model={model} properties={properties} />)
    }
    case "futureView": {
      const properties = await getToolProperties(locale)
      if (!properties.length) return <ToolEmpty slug="future-view" />
      return wrap(<FutureView properties={properties} />)
    }
    case "buyerBloc": {
      const [projects, communities] = await Promise.all([getProjects(), getCommunities()])
      const names = new Map(communities.map((c) => [c.slug, c.name]))
      const upcoming = projects.filter((p) => new Date(p.handover) > new Date())
      const launches: BlocLaunch[] = await Promise.all(
        upcoming.map(async (p) => ({ slug: p.slug, name: p.name, community: names.get(p.communitySlug) ?? p.communitySlug, handover: p.handover, launchPriceAed: p.launchPriceAed, joined: await blocCount(p.slug) })),
      )
      return <BuyerBloc launches={launches} target={BLOC_TARGET} />
    }
  }
}

async function HandoverList({ locale }: { locale: Locale }) {
  const [projects, developers, communities] = await Promise.all([getProjects(), getDevelopers(), getCommunities()])
  const devs = new Map(developers.map((d) => [d.slug, d]))
  const names = new Map(communities.map((c) => [c.slug, c.name]))
  const rows = await Promise.all(
    projects
      .filter((p) => new Date(p.handover) > new Date(Date.now() - 365 * 86_400_000))
      .map(async (p) => {
        const progress = await getProjectProgress(p.slug)
        return { p, progress, score: handoverScore(p, devs.get(p.developerSlug) ?? null, progress) }
      }),
  )
  if (!rows.length) return <ToolEmpty slug="handover-score" />
  rows.sort((a, b) => b.score.probability - a.score.probability)
  const prefix = locale === "en" ? "" : `/${locale}`
  return (
    <div className="grid gap-6 md:grid-cols-2">
      {rows.map(({ p, progress, score }) => (
        <HandoverCard key={p.slug} name={p.name} href={`${prefix}/off-plan/${p.slug}`} meta={`${devs.get(p.developerSlug)?.name ?? ""} · ${names.get(p.communitySlug) ?? ""}`} handover={p.handover} score={score} progress={progress} />
      ))}
    </div>
  )
}

async function PromiseLedger({ locale }: { locale: Locale }) {
  const t = await getTranslations("intel.promiseLedger")
  const [developers, promises] = await Promise.all([getDevelopers(), getPromises()])
  const score = (slug: string) => {
    const settled = promises.filter((p) => p.developerSlug === slug && p.status !== "pending")
    if (!settled.length) return null
    return settled.reduce((s, p) => s + (p.status === "delivered" ? 1 : p.status === "partly" ? 0.5 : 0), 0) / settled.length
  }
  const tone = { delivered: "text-emerald-700", partly: "text-amber-700", broken: "text-red-600", pending: "text-neutral-500" } as const

  return (
    <div className="space-y-12">
      <section>
        <h2 className="text-2xl font-semibold text-neutral-900">{t("ledgerTitle")}</h2>
        <p className="mt-2 max-w-2xl text-neutral-600">{t("ledgerBody")}</p>
        {!developers.length && <p className="mt-8 rounded-3xl bg-sand-100 p-6 text-neutral-700">{t("noDevelopers")}</p>}
        <div className="mt-8 grid gap-6 md:grid-cols-2">
          {developers.map((d) => {
            const own = promises.filter((p) => p.developerSlug === d.slug)
            const kept = score(d.slug) ?? d.promisesKept
            return (
              <article key={d.slug} className="rounded-3xl bg-white p-6 ring-1 ring-neutral-200">
                <div className="flex items-baseline justify-between gap-4">
                  <h3 className="text-lg font-semibold text-neutral-900">{d.name}</h3>
                  <span className="text-2xl font-bold text-neutral-900">{kept === null ? "—" : formatPercent(kept, locale, 0)}</span>
                </div>
                <p className="text-sm text-neutral-500">{kept === null ? t("noRecord") : t("kept")}</p>
                {own.length > 0 && (
                  <ul className="mt-4 space-y-2 text-sm">
                    {own.slice(0, 8).map((p) => (
                      <li key={p.id} className="flex justify-between gap-4 border-b border-neutral-100 pb-2">
                        <span className="text-neutral-700">
                          {localize(p.promise, locale)}
                          {p.evidenceUrl && (
                            <a href={p.evidenceUrl} target="_blank" rel="noopener noreferrer" className="ms-2 text-xs text-rose-700 underline">
                              {t("evidence")}
                            </a>
                          )}
                        </span>
                        <span className={`shrink-0 font-medium ${tone[p.status]}`}>{t(`status.${p.status}`)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </article>
            )
          })}
        </div>
      </section>
      <DocumentCheck />
    </div>
  )
}
