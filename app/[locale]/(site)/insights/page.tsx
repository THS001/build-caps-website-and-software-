import type { Metadata } from "next"
import { getTranslations, setRequestLocale } from "next-intl/server"
import type { Locale } from "@/i18n/locales"
import { pageMetadata } from "@/lib/seo"
import { getPosts, type PostCategory } from "@/lib/data"
import { PageHero } from "@/components/site/page-hero"
import { PostCard } from "@/components/cards/post-card"
import { SampleNote } from "@/components/site/sample-note"
import { LeadMagnet } from "@/components/site/lead-magnet"
import { Link } from "@/i18n/navigation"
import { cn } from "@/lib/utils"

type Props = {
  params: Promise<{ locale: Locale }>
  searchParams: Promise<{ category?: string }>
}

const categories: PostCategory[] = ["market", "guides", "offPlan", "communities", "news"]

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: "insights" })
  return pageMetadata({ locale, pathname: "/insights", title: t("title"), description: t("subtitle") })
}

export default async function InsightsPage({ params, searchParams }: Props) {
  const { locale } = await params
  setRequestLocale(locale)
  const { category } = await searchParams
  const active = categories.find((c) => c === category)
  const t = await getTranslations("insights")
  const posts = await getPosts(active)
  const [lead, ...rest] = posts

  return (
    <main id="main">
      <PageHero title={t("title")} subtitle={t("subtitle")} art="insights" />
      <section className="container-custom py-12 md:py-16">
        <nav aria-label={t("title")} className="mb-10 flex flex-wrap gap-2">
          {[undefined, ...categories].map((c) => (
            <Link
              key={c ?? "all"}
              href={c ? `/insights?category=${c}` : "/insights"}
              aria-current={c === active ? "page" : undefined}
              className={cn(
                "rounded-full border px-4 py-2 text-sm transition-colors",
                c === active ? "border-rose-500 bg-rose-50 text-rose-700" : "border-neutral-200 text-neutral-700 hover:border-rose-300",
              )}
            >
              {t(`categories.${c ?? "all"}`)}
            </Link>
          ))}
        </nav>
        <SampleNote className="mb-8" />
        {lead ? (
          <>
            <div className="mb-14 max-w-4xl">
              <PostCard post={lead} />
            </div>
            <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-3">
              {rest.map((post) => (
                <PostCard key={post.slug} post={post} />
              ))}
            </div>
          </>
        ) : (
          <p className="text-neutral-600">{t("empty")}</p>
        )}
      </section>
      <LeadMagnet source="insights" />
    </main>
  )
}
