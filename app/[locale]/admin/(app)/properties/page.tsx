import Link from "next/link"
import { FileUp, Plus } from "lucide-react"
import { currentStaff, serverClient } from "@/lib/supabase/server"
import { PortalFeeds } from "@/components/admin/portal-feeds"
import { site } from "@/lib/site"

const PORTALS = ["property-finder", "bayut", "dubizzle"] as const
import { formatMoney } from "@/lib/format"
import { RowActions } from "@/components/admin/row-actions"

export default async function AdminProperties() {
  const supabase = await serverClient()
  const staff = await currentStaff()
  const { data, error } = await supabase
    .from("properties")
    .select("id, slug, title, status, price_aed, community_slug, permit, published, featured, updated_at")
    .order("updated_at", { ascending: false })

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl font-semibold text-neutral-900">Properties</h1>
        <div className="flex gap-2">
          <Link href="/admin/properties/import" className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold text-neutral-900 ring-1 ring-neutral-300">
            <FileUp className="h-4 w-4" />
            Import brochure
          </Link>
          <Link href="/admin/properties/new" className="inline-flex items-center gap-2 rounded-full bg-neutral-900 px-5 py-2.5 text-sm font-semibold text-white">
            <Plus className="h-4 w-4" />
            New listing
          </Link>
        </div>
      </div>
      {error && <p className="mt-6 text-sm text-red-600">{error.message}</p>}
      <div className="mt-8 overflow-x-auto rounded-2xl bg-white ring-1 ring-neutral-200">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="border-b border-neutral-200 text-start text-xs uppercase tracking-wide text-neutral-500">
            <tr>
              <th className="px-4 py-3 text-start font-medium">Listing</th>
              <th className="px-4 py-3 text-start font-medium">Status</th>
              <th className="px-4 py-3 text-start font-medium">Price</th>
              <th className="px-4 py-3 text-start font-medium">Permit</th>
              <th className="px-4 py-3 text-start font-medium">Visibility</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {(data ?? []).map((p) => (
              <tr key={p.id} className="border-b border-neutral-100 last:border-0">
                <td className="px-4 py-3">
                  <Link href={`/admin/properties/${p.id}`} className="font-medium text-neutral-900 hover:underline">
                    {(p.title as { en: string }).en}
                  </Link>
                  <p className="text-xs text-neutral-500">{p.community_slug}</p>
                </td>
                <td className="px-4 py-3">{p.status === "offPlan" ? "Off-plan" : "Ready"}</td>
                <td className="px-4 py-3">{p.price_aed ? formatMoney(Number(p.price_aed), "AED", "en") : "On request"}</td>
                <td className="px-4 py-3 font-mono text-xs">{p.permit}</td>
                <td className="px-4 py-3">
                  <span className={p.published ? "rounded-full bg-emerald-50 px-2.5 py-1 text-xs text-emerald-700" : "rounded-full bg-neutral-100 px-2.5 py-1 text-xs text-neutral-600"}>
                    {p.published ? "Published" : "Draft"}
                  </span>
                  {p.featured && <span className="ms-2 rounded-full bg-rose-50 px-2.5 py-1 text-xs text-rose-700">Featured</span>}
                </td>
                <td className="px-4 py-3 text-end">
                  <RowActions kind="property" id={p.id} published={p.published} viewHref={`/properties/${p.slug}`} />
                </td>
              </tr>
            ))}
            {!data?.length && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-neutral-500">
                  No listings yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {staff && staff.role !== "advisor" && (
        <PortalFeeds base={site.url} token={process.env.FEED_TOKEN ?? null} portals={PORTALS} count={(data ?? []).filter((p) => p.published && !/^(PENDING|SAMPLE)/i.test(p.permit)).length} />
      )}
    </div>
  )
}
