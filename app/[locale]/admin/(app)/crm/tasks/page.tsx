import Link from "next/link"
import { currentStaff, serverClient } from "@/lib/supabase/server"
import { TaskCheck } from "@/components/admin/task-check"
import { relative } from "@/lib/crm"

export default async function CrmTasks({ searchParams }: { searchParams: Promise<{ who?: string; show?: string }> }) {
  const { who, show } = await searchParams
  const supabase = await serverClient()
  const staff = await currentStaff()
  const { data: agents } = await supabase.from("agents").select("slug, name, user_id").order("sort_order")
  const mine = (agents ?? []).find((a) => a.user_id === staff?.id)?.slug
  const names = Object.fromEntries((agents ?? []).map((a) => [a.slug, a.name]))

  let query = supabase.from("contact_tasks").select("id, title, due_at, done_at, assignee, contact_id, contacts(name, email)").order("due_at").limit(300)
  query = show === "done" ? query.not("done_at", "is", null) : query.is("done_at", null)
  if (who === "mine" && mine) query = query.eq("assignee", mine)
  const { data, error } = await query
  const tasks = (data ?? []) as unknown as { id: string; title: string; due_at: string; done_at: string | null; assignee: string | null; contact_id: string; contacts: { name: string | null; email: string } | null }[]

  const endOfToday = new Date()
  endOfToday.setHours(23, 59, 59, 999)
  const groups = show === "done"
    ? [{ title: "Done", items: tasks }]
    : [
        { title: "Overdue", items: tasks.filter((t) => new Date(t.due_at) < new Date()) },
        { title: "Today", items: tasks.filter((t) => new Date(t.due_at) >= new Date() && new Date(t.due_at) <= endOfToday) },
        { title: "Upcoming", items: tasks.filter((t) => new Date(t.due_at) > endOfToday) },
      ]
  const pill = (active: boolean) => `rounded-full px-3 py-1.5 ring-1 ${active ? "bg-neutral-900 text-white ring-neutral-900" : "text-neutral-700 ring-neutral-200"}`

  return (
    <div>
      <Link href="/admin/crm" className="text-sm text-neutral-500 hover:text-neutral-900">
        ← CRM
      </Link>
      <h1 className="mt-2 text-3xl font-semibold text-neutral-900">Tasks</h1>
      <nav className="mt-6 flex flex-wrap gap-2 text-sm">
        <Link href="/admin/crm/tasks" className={pill(!who && show !== "done")}>
          Everyone
        </Link>
        {mine && (
          <Link href="/admin/crm/tasks?who=mine" className={pill(who === "mine" && show !== "done")}>
            Mine
          </Link>
        )}
        <Link href="/admin/crm/tasks?show=done" className={pill(show === "done")}>
          Done
        </Link>
      </nav>
      {error && <p className="mt-6 text-sm text-red-600">{error.message}</p>}
      <div className="mt-6 space-y-8">
        {groups.map((g) => (
          <section key={g.title}>
            <h2 className={`text-sm font-semibold uppercase tracking-wide ${g.title === "Overdue" && g.items.length ? "text-red-600" : "text-neutral-500"}`}>
              {g.title} <span className="font-normal">{g.items.length}</span>
            </h2>
            <ul className="mt-3 divide-y divide-neutral-100 rounded-2xl bg-white ring-1 ring-neutral-200">
              {g.items.map((t) => (
                <li key={t.id} className="flex items-center gap-3 px-4 py-3 text-sm">
                  <TaskCheck id={t.id} done={Boolean(t.done_at)} />
                  <span className="min-w-0 flex-1">
                    <span className={t.done_at ? "text-neutral-400 line-through" : "text-neutral-900"}>{t.title}</span>
                    <Link href={`/admin/crm/${t.contact_id}`} className="block text-xs text-neutral-500 hover:text-rose-700">
                      {t.contacts?.name ?? t.contacts?.email}
                    </Link>
                  </span>
                  <span className="text-xs text-neutral-500">{t.assignee ? names[t.assignee] : "Anyone"}</span>
                  <span className="w-28 text-end text-xs text-neutral-500">{relative(t.due_at)}</span>
                </li>
              ))}
              {!g.items.length && <li className="px-4 py-4 text-sm text-neutral-400">Nothing here.</li>}
            </ul>
          </section>
        ))}
      </div>
    </div>
  )
}
