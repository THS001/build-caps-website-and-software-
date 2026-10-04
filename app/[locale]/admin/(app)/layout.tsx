import type React from "react"
import Image from "next/image"
import Link from "next/link"
import { redirect } from "next/navigation"
import { BarChart3, Bot, Briefcase, Building2, CalendarDays, Clock, ExternalLink, FileText, HardHat, KeyRound, Landmark, Languages, LayoutDashboard, LogOut, MapPinned, Megaphone, Newspaper, SearchCheck, ShieldCheck, UserRound, Users } from "lucide-react"
import { currentStaff } from "@/lib/supabase/server"
import { signOut } from "../actions"

const groups = [
  {
    title: "Sales",
    items: [
      { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
      { href: "/admin/crm", label: "CRM", icon: Users },
      { href: "/admin/calendar", label: "Calendar", icon: CalendarDays },
      { href: "/admin/availability", label: "Availability", icon: Clock },
      { href: "/admin/team", label: "Team", icon: UserRound },
    ],
  },
  {
    title: "Content",
    items: [
      { href: "/admin/properties", label: "Properties", icon: Building2 },
      { href: "/admin/projects", label: "Off-plan projects", icon: HardHat },
      { href: "/admin/communities", label: "Communities", icon: MapPinned },
      { href: "/admin/developers", label: "Developers", icon: Landmark },
      { href: "/admin/funnels", label: "Opportunities", icon: Megaphone },
      { href: "/admin/posts", label: "Insights", icon: Newspaper },
      { href: "/admin/reports", label: "Reports and guide", icon: FileText },
      { href: "/admin/jobs", label: "Careers", icon: Briefcase },
    ],
  },
  {
    title: "Intelligence",
    items: [
      { href: "/admin/market", label: "Market data", icon: BarChart3 },
      { href: "/admin/track-record", label: "Track record", icon: ShieldCheck },
      { href: "/admin/seo", label: "SEO agent", icon: SearchCheck },
      { href: "/admin/translations", label: "Translation QA", icon: Languages },
      { href: "/admin/agents", label: "AI activity", icon: Bot },
    ],
  },
]
const nav = [...groups.flatMap((g) => g.items), { href: "/admin/account", label: "My account", icon: KeyRound }]

export default async function AdminAppLayout({ children }: { children: React.ReactNode }) {
  const staff = await currentStaff()
  if (!staff) redirect("/admin/login")

  return (
    <div className="flex min-h-svh">
      <aside className="sticky top-0 hidden h-svh w-60 shrink-0 flex-col overflow-y-auto border-e border-neutral-200 bg-white p-5 md:flex">
        <Image src="/brand/logo-color.png" alt="Buildcaps" width={170} height={32} className="h-7 w-auto" />
        <nav className="mt-8 space-y-5">
          {groups.map((group) => (
            <div key={group.title}>
              <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-neutral-400">{group.title}</p>
              {group.items.map(({ href, label, icon: Icon }) => (
                <Link key={href} href={href} className="flex items-center gap-3 rounded-xl px-3 py-1.5 text-sm text-neutral-700 hover:bg-neutral-100">
                  <Icon className="h-4 w-4" />
                  {label}
                </Link>
              ))}
            </div>
          ))}
        </nav>
        <div className="mt-auto space-y-3 pt-6 text-sm">
          <a href="/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-neutral-500 hover:text-neutral-900">
            <ExternalLink className="h-4 w-4" />
            View site
          </a>
          <Link href="/admin/account" className="block rounded-xl px-3 py-2 hover:bg-neutral-100">
            <span className="block truncate text-neutral-900">{staff.name}</span>
            <span className="block text-xs uppercase tracking-wide text-rose-700">{staff.role}</span>
            <span className="block text-xs text-neutral-500">My account and password</span>
          </Link>
          <form action={signOut}>
            <button className="flex items-center gap-2 text-neutral-500 hover:text-neutral-900">
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          </form>
        </div>
      </aside>
      <div className="min-w-0 flex-1">
        <nav className="flex gap-2 overflow-x-auto border-b border-neutral-200 bg-white p-3 md:hidden">
          {nav.map(({ href, label }) => (
            <Link key={href} href={href} className="shrink-0 rounded-full px-3 py-1.5 text-sm text-neutral-700 ring-1 ring-neutral-200">
              {label}
            </Link>
          ))}
        </nav>
        <main className="mx-auto max-w-6xl p-6 md:p-10">{children}</main>
      </div>
    </div>
  )
}
