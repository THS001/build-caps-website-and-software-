import { getTranslations } from "next-intl/server"
import { Link } from "@/i18n/navigation"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"

// Lives outside the (site) group so every unknown path gets it; it brings its own chrome.
export default async function NotFound() {
  const t = await getTranslations("notFound")

  return (
    <>
      <Header />
      <main id="main" className="bg-aurora flex min-h-screen items-center justify-center px-6 text-center">
        <div className="max-w-xl">
          <p className="text-rose-metal shine mb-6 text-8xl font-bold">404</p>
          <h1 className="mb-4 text-3xl font-semibold text-neutral-900 md:text-4xl">{t("title")}</h1>
          <p className="mb-10 text-neutral-600">{t("body")}</p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link href="/" className="rounded-full bg-neutral-900 px-6 py-3 text-sm font-medium text-white">
              {t("home")}
            </Link>
            <Link href="/properties" className="border-gradient rounded-full px-6 py-3 text-sm font-medium text-neutral-900">
              {t("search")}
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
