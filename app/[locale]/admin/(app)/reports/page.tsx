import Link from "next/link"
import { Plus } from "lucide-react"
import { serverClient } from "@/lib/supabase/server"

export default async function AdminReportList() {
  const supabase = await serverClient()
  const { data, error } = await supabase.from("reports").select("slug, kind, title, quarter, published, file_path").order("updated_at", { ascending: false })

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl font-semibold text-neutral-900">Reports and guide</h1>
        <Link href="/admin/reports/new" className="inline-flex items-center gap-2 rounded-full bg-neutral-900 px-5 py-2.5 text-sm font-semibold text-white">
          <Plus className="h-4 w-4" /> Add report or guide
        </Link>
      </div>
      <p className="mt-2 max-w-3xl text-sm text-neutral-500">Market reports and the investor guide. Visitors get the PDF after leaving their email; every request lands in the CRM.</p>
      {error && <p className="mt-6 text-sm text-red-600">{error.message}</p>}
      <ul className="mt-8 divide-y divide-neutral-100 overflow-hidden rounded-2xl bg-white ring-1 ring-neutral-200">
        {(data ?? []).map((row) => (
          <li key={row.slug} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
            <div>
              <Link href={`/admin/reports/${row.slug}`} className="font-medium text-neutral-900 hover:underline">
                {(row.title as { en: string }).en}
              </Link>
              <p className="text-xs text-neutral-500">{`${row.kind === "guide" ? "Investor guide" : "Market report"} · ${row.quarter}${row.file_path ? "" : " · no PDF yet"}`}</p>
            </div>
            <span className={row.published ? "rounded-full bg-emerald-50 px-2.5 py-1 text-xs text-emerald-700" : "rounded-full bg-amber-50 px-2.5 py-1 text-xs text-amber-700"}>{row.published ? "Published" : "Hidden"}</span>
          </li>
        ))}
        {!data?.length && <li className="px-5 py-10 text-center text-neutral-500">Nothing yet.</li>}
      </ul>
    </div>
  )
}
