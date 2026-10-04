import type { Metadata } from "next"
import { getTranslations, setRequestLocale } from "next-intl/server"
import type { Locale } from "@/i18n/locales"
import { pageMetadata } from "@/lib/seo"
import { getAgents, getProject, getProperty, localize } from "@/lib/data"
import { BookingWizard } from "@/components/booking/booking-wizard"
import { getBookingSchedule } from "@/lib/booking/settings"

type Props = {
  params: Promise<{ locale: Locale }>
  searchParams: Promise<Record<string, string | undefined>>
}

const purposes = ["strategy", "viewing", "valuation", "mortgage", "goldenVisa"] as const

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: "booking" })
  return pageMetadata({ locale, pathname: "/book", title: t("title"), description: t("subtitle") })
}

export default async function BookPage({ params, searchParams }: Props) {
  const { locale } = await params
  setRequestLocale(locale)
  const sp = await searchParams
  const t = await getTranslations("booking")

  const [agents, property, project, schedule] = await Promise.all([
    getAgents(),
    sp.property ? getProperty(sp.property) : null,
    sp.project ? getProject(sp.project) : null,
    getBookingSchedule(),
  ])
  const purpose = purposes.find((p) => p === sp.purpose)
  const subject = property ? { slug: property.slug, title: localize(property.title, locale) } : project ? { slug: project.slug, title: project.name } : undefined

  return (
    <main id="main" className="bg-aurora min-h-svh pt-28 pb-20 md:pt-36">
      <div className="container-custom">
        <header className="mb-10 max-w-2xl">
          <h1 className="text-4xl font-semibold text-neutral-900 md:text-5xl">{t("title")}</h1>
          <p className="mt-4 text-lg text-neutral-600">{t("subtitle")}</p>
        </header>
        <BookingWizard
          agents={agents.map(({ slug, name, role, languages }) => ({ slug, name, role, languages }))}
          schedule={{ slotMinutes: schedule.slotMinutes, daysAhead: schedule.daysAhead, openWeekdays: schedule.openWeekdays }}
          initial={{ purpose, property: subject, advisor: agents.some((a) => a.slug === sp.advisor) ? sp.advisor : undefined }}
        />
      </div>
    </main>
  )
}
