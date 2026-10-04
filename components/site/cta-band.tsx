import { MessageCircle } from "lucide-react"
import { useTranslations } from "next-intl"
import { Magnetic } from "@/components/motion/magnetic"
import { Ripple } from "@/components/motion/ripple"
import { TransitionLink } from "@/components/motion/view-transitions"
import { Photo } from "@/components/media/photo"
import { photos } from "@/lib/media"
import { whatsappUrl } from "@/lib/site"

type CtaBandProps = {
  title?: string
  body?: string
  /** Pre-fills the booking flow, e.g. "?purpose=valuation". */
  bookQuery?: string
}

/** Closing call to action on every page: book a call, or WhatsApp. */
export function CtaBand({ title, body, bookQuery = "" }: CtaBandProps) {
  const t = useTranslations("home.finalCta")
  const tc = useTranslations("booking")
  const tw = useTranslations("whatsapp")

  return (
    <section className="container-custom py-20 md:py-28">
      <div className="relative overflow-hidden rounded-[2rem] bg-navy-900 px-6 py-16 text-center text-white md:px-16 md:py-24">
        <div className="absolute inset-0 opacity-60">
          <Photo photo={photos.marinaNight} sizes="100vw" />
        </div>
        <div className="absolute inset-0 bg-gradient-to-b from-navy-900/30 via-navy-900/60 to-navy-900" />
        <div className="relative mx-auto max-w-2xl">
          <h2 className="text-3xl font-semibold leading-tight md:text-5xl">{title ?? t("title")}</h2>
          <p className="mt-5 text-lg text-white/80">{body ?? t("body")}</p>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Magnetic>
              <TransitionLink
                href={`/book${bookQuery}`}
                className="relative inline-flex overflow-hidden rounded-full bg-white px-8 py-4 font-semibold text-neutral-900 shadow-[0_20px_60px_-20px_rgb(183_110_121/0.8)]"
              >
                {t("cta")}
                <Ripple color="rgb(183 110 121 / 0.3)" />
              </TransitionLink>
            </Magnetic>
            <a
              href={whatsappUrl(tw("prefill"))}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm font-medium text-white/85 hover:text-white"
            >
              <MessageCircle className="h-4 w-4" />
              {t("secondary")}
            </a>
          </div>
          <p className="mt-8 text-xs text-white/60">{tc("trust")}</p>
        </div>
      </div>
    </section>
  )
}
