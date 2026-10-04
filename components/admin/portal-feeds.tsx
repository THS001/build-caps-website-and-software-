"use client"

import { useState } from "react"
import { Check, Copy, Rss } from "lucide-react"

const NAMES: Record<string, string> = { "property-finder": "Property Finder", bayut: "Bayut", dubizzle: "dubizzle" }

/** The private XML feed URLs to give each portal's onboarding team. */
export function PortalFeeds({ base, token, portals, count }: { base: string; token: string | null; portals: readonly string[]; count: number }) {
  const [copied, setCopied] = useState<string | null>(null)
  return (
    <section className="mt-10 rounded-2xl bg-white p-5 ring-1 ring-neutral-200">
      <h2 className="flex items-center gap-2 font-semibold text-neutral-900">
        <Rss className="h-4 w-4 text-rose-500" /> Portal feeds
      </h2>
      <p className="mt-1 max-w-3xl text-sm text-neutral-500">
        List once here: Property Finder, Bayut and dubizzle import these XML feeds and refresh on their own schedule. Only published listings with a real DLD permit are included ({count} now). Send each portal only its own link, and ask their onboarding team to confirm the community mapping.
      </p>
      {token ? (
        <ul className="mt-4 space-y-2">
          {portals.map((p) => {
            const url = `${base}/api/feeds/${p}?token=${token}`
            return (
              <li key={p} className="flex flex-wrap items-center gap-3 text-sm">
                <span className="w-32 shrink-0 font-medium text-neutral-900">{NAMES[p] ?? p}</span>
                <code className="min-w-0 flex-1 truncate rounded-lg bg-neutral-50 px-3 py-1.5 text-xs text-neutral-700">{url.replace(token, "••••••")}</code>
                <button
                  type="button"
                  onClick={() => navigator.clipboard.writeText(url).then(() => (setCopied(p), setTimeout(() => setCopied(null), 1500)))}
                  className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs ring-1 ring-neutral-200 hover:bg-neutral-50"
                >
                  {copied === p ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />} {copied === p ? "Copied" : "Copy link"}
                </button>
              </li>
            )
          })}
        </ul>
      ) : (
        <p className="mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">Feeds are off. Set FEED_TOKEN (any long random string) in the hosting environment to switch them on.</p>
      )}
    </section>
  )
}
