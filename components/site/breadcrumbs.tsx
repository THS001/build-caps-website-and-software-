import { ChevronRight } from "lucide-react"
import { getLocale } from "next-intl/server"
import type { Locale } from "@/i18n/locales"
import { Link } from "@/i18n/navigation"
import { localizedPath } from "@/lib/seo"
import { site } from "@/lib/site"
import { JsonLd } from "@/components/site/json-ld"
import { cn } from "@/lib/utils"

export type Crumb = { label: string; href: string }

/** Visible breadcrumb trail plus BreadcrumbList structured data. The last crumb is the current page. */
export async function Breadcrumbs({ items, tone = "light", className }: { items: Crumb[]; tone?: "light" | "dark"; className?: string }) {
  const locale = (await getLocale()) as Locale

  return (
    <>
      <nav aria-label="Breadcrumb" className={cn("text-sm", className)}>
        <ol className={cn("flex flex-wrap items-center gap-1.5", tone === "dark" ? "text-white/70" : "text-neutral-500")}>
          {items.map((item, i) => (
            <li key={item.href} className="flex items-center gap-1.5">
              {i > 0 && <ChevronRight className="h-3.5 w-3.5 opacity-60 rtl:rotate-180" />}
              {i === items.length - 1 ? (
                <span aria-current="page" className={tone === "dark" ? "text-white" : "text-neutral-900"}>
                  {item.label}
                </span>
              ) : (
                <Link href={item.href} className="hover:underline">
                  {item.label}
                </Link>
              )}
            </li>
          ))}
        </ol>
      </nav>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: items.map((item, i) => ({
            "@type": "ListItem",
            position: i + 1,
            name: item.label,
            item: new URL(localizedPath(item.href, locale), site.url).toString(),
          })),
        }}
      />
    </>
  )
}
