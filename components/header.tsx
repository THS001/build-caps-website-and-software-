"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import { motion } from "framer-motion"
import { Menu, Search } from "lucide-react"
import { useLocale, useTranslations } from "next-intl"
import { usePathname } from "@/i18n/navigation"
import { isRtl } from "@/i18n/locales"
import { PreferencesMenu } from "@/components/preferences-menu"
import { TransitionLink as Link } from "@/components/motion/view-transitions"
import { ScrollProgress } from "@/components/motion/scroll-progress"
import { Sheet, SheetClose, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { cn } from "@/lib/utils"
import { openSearch } from "@/components/search/search-palette"

const primaryLinks = [
  { href: "/properties", key: "properties" },
  { href: "/off-plan", key: "offPlan" },
  { href: "/opportunities", key: "opportunities" },
  { href: "/communities", key: "communities" },
  { href: "/invest", key: "invest" },
  { href: "/tools", key: "tools" },
  // Shown in the top bar only on very wide screens; always in the mobile menu and footer.
  { href: "/insights", key: "insights", wide: true },
  { href: "/about", key: "about", wide: true },
] as const

const mobileGroups = [
  {
    key: "buy",
    links: [
      { href: "/properties", key: "properties" },
      { href: "/off-plan", key: "offPlan" },
      { href: "/opportunities", key: "opportunities" },
      { href: "/communities", key: "communities" },
      { href: "/developers", key: "developers" },
    ],
  },
  {
    key: "learn",
    links: [
      { href: "/invest", key: "invest" },
      { href: "/tools", key: "tools" },
      { href: "/insights", key: "insights" },
    ],
  },
  {
    key: "company",
    links: [
      { href: "/about", key: "about" },
      { href: "/team", key: "team" },
      { href: "/contact", key: "contact" },
    ],
  },
] as const

export function Header() {
  const t = useTranslations("nav")
  const tsearch = useTranslations("search")
  const locale = useLocale()
  const pathname = usePathname()
  const [isScrolled, setIsScrolled] = useState(false)

  // Only the home page opens on a full-bleed dark hero; everywhere else the header starts solid.
  const overHero = pathname === "/" && !isScrolled

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20)
    handleScroll()
    window.addEventListener("scroll", handleScroll, { passive: true })
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  return (
    <motion.header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-[background-color,box-shadow,color] duration-300 [view-transition-name:site-header]",
        overHero
          ? "bg-transparent text-white"
          : "bg-white/80 text-neutral-900 shadow-[0_1px_0_rgb(0_0_0/0.05)] backdrop-blur-xl",
      )}
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.6, ease: [0.21, 0.47, 0.32, 0.98] }}
    >
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:start-4 focus:top-4 focus:rounded-full focus:bg-white focus:px-4 focus:py-2 focus:text-neutral-900"
      >
        {t("skipToContent")}
      </a>
      <div
        className={cn(
          "container-custom flex items-center justify-between gap-6 transition-[height] duration-300",
          isScrolled ? "h-14 lg:h-16" : "h-16 lg:h-20",
        )}
      >
        <Link href="/" aria-label="Buildcaps Real Estate" className="shrink-0">
          <Image
            src="/brand/logo-color.png"
            alt="Buildcaps"
            width={170}
            height={32}
            priority
            className={cn("h-7 w-auto transition-[filter] duration-300 lg:h-8", overHero && "brightness-0 invert")}
          />
        </Link>

        <nav className="hidden items-center gap-1 xl:flex" aria-label="Main">
          {primaryLinks.map((link) => {
            const { href, key } = link
            const active = pathname === href || pathname.startsWith(`${href}/`)
            return (
              <Link
                key={key}
                href={href}
                className={cn(
                  "group relative whitespace-nowrap rounded-full px-2.5 py-2 text-sm font-medium transition-opacity 2xl:px-3",
                  active ? "opacity-100" : "opacity-80 hover:opacity-100",
                  "wide" in link && "hidden 2xl:block",
                )}
              >
                {t(key)}
                <span
                  className={cn(
                    "absolute inset-x-3 -bottom-0.5 h-px origin-center bg-gradient-to-r from-rose-300 via-rose-500 to-rose-300 transition-transform duration-300",
                    active ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100",
                  )}
                />
              </Link>
            )
          })}
        </nav>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => openSearch()}
            aria-label={tsearch("open")}
            title={`${tsearch("open")} (Ctrl K)`}
            className={cn("rounded-full p-2 transition-colors", overHero ? "hover:bg-white/10" : "hover:bg-neutral-100")}
          >
            <Search className="h-5 w-5" />
          </button>
          <PreferencesMenu className={overHero ? "hover:bg-white/10" : "hover:bg-neutral-100"} />
          <Link
            href="/book"
            className={cn(
              "hidden rounded-full px-5 py-2.5 text-sm font-semibold transition-all hover:scale-[1.03] sm:inline-flex",
              overHero ? "bg-white text-neutral-900" : "glow-rose bg-neutral-900 text-white",
            )}
          >
            {t("book")}
          </Link>

          <Sheet>
            <SheetTrigger
              className={cn("rounded-full p-2 xl:hidden", overHero ? "hover:bg-white/10" : "hover:bg-neutral-100")}
              aria-label={t("menu")}
            >
              <Menu className="h-5 w-5" />
            </SheetTrigger>
            <SheetContent side={isRtl(locale) ? "left" : "right"} className="bg-aurora w-full max-w-sm overflow-y-auto p-8">
              <SheetTitle className="sr-only">{t("menu")}</SheetTitle>
              <nav className="mt-8 space-y-8" aria-label="Mobile">
                {mobileGroups.map((group) => (
                  <div key={group.key}>
                    <p className="text-label mb-3 text-rose-700">{t(`groups.${group.key}`)}</p>
                    <ul className="space-y-1">
                      {group.links.map(({ href, key }) => (
                        <li key={key}>
                          <SheetClose asChild>
                            <Link href={href} className="block py-1.5 text-2xl font-medium text-neutral-900">
                              {t(key)}
                            </Link>
                          </SheetClose>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
                <SheetClose asChild>
                  <Link
                    href="/book"
                    className="glow-rose block rounded-full bg-neutral-900 px-6 py-4 text-center text-base font-semibold text-white"
                  >
                    {t("book")}
                  </Link>
                </SheetClose>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
      {!overHero && <ScrollProgress className="absolute inset-x-0 bottom-0" />}
    </motion.header>
  )
}
