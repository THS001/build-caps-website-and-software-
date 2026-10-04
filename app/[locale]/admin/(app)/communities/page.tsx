import Link from "next/link"
import { Plus } from "lucide-react"
import { serverClient } from "@/lib/supabase/server"

export default async function AdminCommunityList() {
  const supabase = await serverClient()
  const { data, error } = await supabase.from("communities").select("slug, name, published, avg_price_per_sqft, dld_areas").order("name")

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl font-semibold text-neutral-900">Communities</h1>
        <Link href="/admin/communities/new" className="inline-flex items-center gap-2 rounded-full bg-neutral-900 px-5 py-2.5 text-sm font-semibold text-white">
          <Plus className="h-4 w-4" /> Add community
        </Link>
      </div>
      <p className="mt-2 max-w-3xl text-sm text-neutral-500">Areas listings and projects belong to. Their market figures come from Dubai Land Department data once DLD area names are set.</p>
      {error && <p className="mt-6 text-sm text-red-600">{error.message}</p>}
      <ul className="mt-8 divide-y divide-neutral-100 overflow-hidden rounded-2xl bg-white ring-1 ring-neutral-200">
        {(data ?? []).map((row) => (
          <li key={row.slug} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
            <div>
              <Link href={`/admin/communities/${row.slug}`} className="font-medium text-neutral-900 hover:underline">
                {row.name}
              </Link>
              <p className="text-xs text-neutral-500">{`${(row.dld_areas as string[]).length ? `DLD: ${(row.dld_areas as string[]).join(", ")}` : "No DLD areas yet"}${row.avg_price_per_sqft ? ` · AED ${row.avg_price_per_sqft}/sq ft` : ""}`}</p>
            </div>
            <span className={row.published ? "rounded-full bg-emerald-50 px-2.5 py-1 text-xs text-emerald-700" : "rounded-full bg-amber-50 px-2.5 py-1 text-xs text-amber-700"}>{row.published ? "Published" : "Hidden"}</span>
          </li>
        ))}
        {!data?.length && <li className="px-5 py-10 text-center text-neutral-500">Nothing yet.</li>}
      </ul>
    </div>
  )
}
