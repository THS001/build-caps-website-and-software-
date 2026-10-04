import { serverClient } from "@/lib/supabase/server"
import { MarketTools, CommunityMarketRow } from "@/components/admin/market-tools"

export default async function AdminMarket() {
  const supabase = await serverClient()
  const [{ data: communities }, { count }, { data: latest }] = await Promise.all([
    supabase.from("communities").select("slug, name, dld_areas, est_yield, avg_price_per_sqft, price_change_12m").order("name"),
    supabase.from("dld_transactions").select("*", { count: "exact", head: true }),
    supabase.from("dld_transactions").select("instance_date").order("instance_date", { ascending: false }).limit(1),
  ])

  return (
    <div>
      <h1 className="text-3xl font-semibold text-neutral-900">Market data</h1>
      <p className="mt-2 text-sm text-neutral-600">
        {count ?? 0} DLD sales stored{latest?.[0] ? `, latest ${latest[0].instance_date}` : ""}. Estimates, the Data Room and community figures use these. The weekly Market Intel run
        downloads new data automatically when DLD_TRANSACTIONS_CSV_URL is set.
      </p>
      <MarketTools />
      <h2 className="mt-12 mb-4 text-lg font-semibold text-neutral-900">Communities</h2>
      <p className="mb-4 text-sm text-neutral-500">
        DLD areas: the area names exactly as they appear in the DLD data (comma-separated). Yields need rental data, so they are set here.
      </p>
      <div className="space-y-2">
        {(communities ?? []).map((c) => (
          <CommunityMarketRow
            key={c.slug}
            slug={c.slug}
            name={c.name}
            dldAreas={(c.dld_areas as string[]).join(", ")}
            estYieldPct={c.est_yield ? +(Number(c.est_yield) * 100).toFixed(2) : null}
            stats={`AED ${c.avg_price_per_sqft ?? "—"}/sq ft · 12m ${c.price_change_12m !== null ? `${(Number(c.price_change_12m) * 100).toFixed(1)}%` : "—"}`}
          />
        ))}
      </div>
    </div>
  )
}
