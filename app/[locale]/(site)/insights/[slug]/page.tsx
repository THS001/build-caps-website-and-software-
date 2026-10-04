import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { getTranslations, setRequestLocale } from "next-intl/server"
import { locales, type Locale } from "@/i18n/locales"
import { pageMetadata, localizedPath } from "@/lib/seo"
import { site } from "@/lib/site"
import { getPost, getPosts, localize } from "@/lib/data"
import { formatDate } from "@/lib/format"
import Image from "next/image"
import { Photo } from "@/components/media/photo"
import { categoryPhoto } from "@/lib/media"
import { Breadcrumbs } from "@/components/site/breadcrumbs"
import { JsonLd } from "@/components/site/json-ld"
import { SampleNote } from "@/components/site/sample-note"
import { PostCard } from "@/components/cards/post-card"
import { NewsletterForm } from "@/components/newsletter-form"
import { CtaBand } from "@/components/site/cta-band"
import { SeoExtras } from "@/components/site/seo-extras"

type Props = { params: Promise<{ locale: Locale; slug: string }> }

export async function generateStaticParams() {
  const posts = await getPosts()
  return locales.flatMap((locale) => posts.map((p) => ({ locale, slug: p.slug })))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params
  const post = await getPost(slug)
  if (!post) return {}
  return pageMetadata({ locale, pathname: `/insights/${slug}`, title: localize(post.title, locale), description: localize(post.excerpt, locale) })
}

export default async function PostPage({ params }: Props) {
  const { locale, slug } = await params
  setRequestLocale(locale)
  const post = await getPost(slug)
  if (!post) notFound()

  const t = await getTranslations("insights")
  const tf = await getTranslations("footer")
  const related = (await getPosts(post.category)).filter((p) => p.slug !== slug).slice(0, 3)
  const title = localize(post.title, locale)

  return (
    <main id="main" className="pt-24 md:pt-28">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Article",
          headline: title,
          description: localize(post.excerpt, locale),
          datePublished: post.publishedAt,
          author: { "@type": "Organization", name: post.author },
          publisher: { "@type": "Organization", name: site.legalName, logo: { "@type": "ImageObject", url: `${site.url}/brand/logo-color.png` } },
          mainEntityOfPage: new URL(localizedPath(`/insights/${slug}`, locale), site.url).toString(),
          inLanguage: locale,
        }}
      />
      <article className="container-custom max-w-3xl">
        <Breadcrumbs items={[{ label: t("title"), href: "/insights" }, { label: title, href: `/insights/${slug}` }]} />
        <p className="mt-8 text-sm text-neutral-500">
          {t(`categories.${post.category}`)} · {formatDate(post.publishedAt, locale)} · {t("readTime", { minutes: post.minutes })}
        </p>
        <h1 className="mt-3 text-4xl font-semibold leading-tight text-neutral-900 md:text-5xl">{title}</h1>
        <p className="mt-5 text-xl leading-relaxed text-neutral-600">{localize(post.excerpt, locale)}</p>
        <p className="mt-4 text-sm text-neutral-500">{t("by", { author: post.author })}</p>
        <div className="relative mt-10 aspect-[16/9] overflow-hidden rounded-3xl" style={{ viewTransitionName: `post-${slug}` }}>
          {post.coverUrl ? <Image src={post.coverUrl} alt="" fill priority sizes="(min-width: 1024px) 1024px, 100vw" className="object-cover" /> : <Photo photo={categoryPhoto(post.category, slug)} priority sizes="(min-width: 1024px) 1024px, 100vw" />}
        </div>
        <SampleNote className="mt-8" />
        <div className="mt-8 space-y-6 text-lg leading-relaxed text-neutral-800">
          {post.body
            .flatMap((block) => localize(block, locale).split(/\n{2,}/))
            .map((paragraph, i) =>
              // "## " marks a subheading and "• " list lines (posts migrated from the old site).
              paragraph.startsWith("## ") ? (
                <h2 key={i} className="pt-4 text-2xl font-semibold text-neutral-900">
                  {paragraph.slice(3)}
                </h2>
              ) : paragraph.startsWith("• ") ? (
                <ul key={i} className="list-disc space-y-2 ps-6">
                  {paragraph.split("\n").map((item) => (
                    <li key={item}>{item.replace(/^• /, "")}</li>
                  ))}
                </ul>
              ) : (
                <p key={i}>{paragraph}</p>
              ),
            )}
        </div>
        <div className="mt-14 rounded-3xl bg-sand-100/70 p-8">
          <p className="text-lg font-semibold text-neutral-900">{tf("newsletterTitle")}</p>
          <p className="mt-2 text-neutral-600">{tf("newsletterBody")}</p>
          <NewsletterForm className="mt-5" />
        </div>
      </article>

      {related.length > 0 && (
        <section className="container-custom py-20">
          <h2 className="mb-8 text-3xl font-semibold text-neutral-900">{t("related")}</h2>
          <div className="grid gap-10 md:grid-cols-3">
            {related.map((p) => (
              <PostCard key={p.slug} post={p} />
            ))}
          </div>
        </section>
      )}
      <SeoExtras locale={locale} pathname={`/insights/${slug}`} />
      <CtaBand />
    </main>
  )
}
