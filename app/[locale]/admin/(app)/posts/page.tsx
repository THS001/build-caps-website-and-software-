import Link from "next/link"
import { Plus } from "lucide-react"
import { serverClient } from "@/lib/supabase/server"

export default async function AdminPosts() {
  const supabase = await serverClient()
  const { data, error } = await supabase.from("posts").select("slug, title, category, published, published_at, updated_at, author").order("updated_at", { ascending: false })

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl font-semibold text-neutral-900">Insights</h1>
        <Link href="/admin/posts/new" className="inline-flex items-center gap-2 rounded-full bg-neutral-900 px-5 py-2.5 text-sm font-semibold text-white">
          <Plus className="h-4 w-4" /> New article
        </Link>
      </div>
      <p className="mt-2 text-sm text-neutral-500">Market Intel and the SEO agent save their drafts here, unpublished. Review, edit and publish.</p>
      {error && <p className="mt-6 text-sm text-red-600">{error.message}</p>}
      <ul className="mt-8 divide-y divide-neutral-100 overflow-hidden rounded-2xl bg-white ring-1 ring-neutral-200">
        {(data ?? []).map((p) => (
          <li key={p.slug} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
            <div>
              <Link href={`/admin/posts/${p.slug}`} className="font-medium text-neutral-900 hover:underline">
                {(p.title as { en: string }).en}
              </Link>
              <p className="text-xs text-neutral-500">
                {p.category} · {p.author} · updated {new Date(p.updated_at).toLocaleDateString("en-GB")}
              </p>
            </div>
            <span className={p.published ? "rounded-full bg-emerald-50 px-2.5 py-1 text-xs text-emerald-700" : "rounded-full bg-amber-50 px-2.5 py-1 text-xs text-amber-700"}>
              {p.published ? "Published" : "Draft"}
            </span>
          </li>
        ))}
        {!data?.length && <li className="px-5 py-10 text-center text-neutral-500">No articles yet.</li>}
      </ul>
    </div>
  )
}
