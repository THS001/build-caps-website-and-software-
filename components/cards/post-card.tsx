import { useLocale, useTranslations } from "next-intl"
import type { Locale } from "@/i18n/locales"
import { localize } from "@/lib/data/shared"
import type { Post } from "@/lib/data/types"
import { formatDate } from "@/lib/format"
import Image from "next/image"
import { Photo } from "@/components/media/photo"
import { categoryPhoto } from "@/lib/media"
import { TransitionLink } from "@/components/motion/view-transitions"

export function PostCard({ post }: { post: Post }) {
  const locale = useLocale() as Locale
  const t = useTranslations("insights")

  return (
    <TransitionLink href={`/insights/${post.slug}`} className="group block">
      <div className="relative aspect-[16/10] overflow-hidden rounded-3xl" style={{ viewTransitionName: `post-${post.slug}` }}>
        {post.coverUrl ? (
          <Image src={post.coverUrl} alt="" fill sizes="(min-width: 1024px) 33vw, 100vw" className="object-cover transition-transform duration-700 group-hover:scale-105" />
        ) : (
          <Photo photo={categoryPhoto(post.category, post.slug)} sizes="(min-width: 1024px) 33vw, 100vw" className="transition-transform duration-700 group-hover:scale-105" />
        )}
        <span className="absolute start-4 top-4 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-neutral-900">
          {t(`categories.${post.category}`)}
        </span>
      </div>
      <p className="mt-4 text-xs text-neutral-500">
        {formatDate(post.publishedAt, locale)} · {t("readTime", { minutes: post.minutes })}
      </p>
      <h3 className="mt-2 text-xl font-semibold leading-snug text-neutral-900 group-hover:underline">{localize(post.title, locale)}</h3>
      <p className="mt-2 line-clamp-2 text-neutral-600">{localize(post.excerpt, locale)}</p>
    </TransitionLink>
  )
}
