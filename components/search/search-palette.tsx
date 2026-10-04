"use client"

import { useCallback, useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { ArrowUpRight, Building2, CalendarCheck, CornerDownLeft, FileText, Hammer, Landmark, Loader2, MapPin, MessageCircle, Search, SlidersHorizontal, Sparkles, Wrench, X } from "lucide-react"
import { useLocale, useTranslations } from "next-intl"
import { usePathname } from "@/i18n/navigation"
import { askBuildcaps } from "@/app/actions/ai"
import { useTransitionRouter } from "@/components/motion/view-transitions"
import { RichText } from "@/components/ai/concierge"
import { formatMoney } from "@/lib/format"
import type { SearchGroup, SearchGroupKey } from "@/lib/search/site-search"
import { cn } from "@/lib/utils"

// Site-wide search: instant results across listings, areas, projects, articles,
// tools and pages, plus "Ask Buildcaps AI" (a streamed answer from the Concierge)
// and "Find listings that match" (plain words → listing filters).
// Open it from anywhere: ⌘K / Ctrl+K, "/", or window.dispatchEvent(new CustomEvent("buildcaps:search", { detail: { q } })).

export function openSearch(q = "", ask = false) {
  window.dispatchEvent(new CustomEvent("buildcaps:search", { detail: { q, ask } }))
}

type AiProperty = { slug: string; title: string; price_aed: number | null; beds: number; community: string; url: string }
type AiState = { question: string; text: string; status: "streaming" | "done" | "error"; properties: AiProperty[]; actions: { kind: "booking" | "whatsapp"; url: string }[] }
type Item = { id: string; kind: "ask" | "find" | "hit"; href?: string }

const GROUP_ICON: Record<SearchGroupKey, typeof Search> = { listings: Building2, areas: MapPin, projects: Hammer, developers: Landmark, articles: FileText, tools: Wrench, pages: ArrowUpRight }

function Kbd({ children }: { children: ReactNode }) {
  return <kbd className="rounded-md border border-neutral-200 bg-neutral-50 px-1.5 py-0.5 font-sans text-[11px] text-neutral-500">{children}</kbd>
}

export function SearchPalette() {
  const t = useTranslations("search")
  const th = useTranslations("home.search")
  const tn = useTranslations("nav")
  const locale = useLocale()
  const pathname = usePathname()
  const router = useTransitionRouter()
  const listId = useId()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [groups, setGroups] = useState<SearchGroup[]>([])
  const [loading, setLoading] = useState(false)
  const [active, setActive] = useState(0)
  const [ai, setAi] = useState<AiState | null>(null)
  const [finding, setFinding] = useState(false)
  const [pendingAsk, setPendingAsk] = useState<string | null>(null)
  const input = useRef<HTMLInputElement>(null)
  const lastFocus = useRef<HTMLElement | null>(null)
  const aiAbort = useRef<AbortController | null>(null)
  const typed = useRef("")
  const navigated = useRef(false)
  const examples = th.raw("examples") as string[]

  const close = useCallback(() => {
    aiAbort.current?.abort()
    if (typed.current.trim() && !navigated.current) window.dispatchEvent(new CustomEvent("buildcaps:search-closed", { detail: { hadQuery: true } }))
    typed.current = ""
    setOpen(false)
    lastFocus.current?.focus?.()
  }, [])

  // Open from the hero bar, the header button, ⌘K / Ctrl+K or "/".
  useEffect(() => {
    const show = (q = "", ask = false) => {
      lastFocus.current = document.activeElement as HTMLElement
      navigated.current = false
      typed.current = q
      setQuery(q)
      setAi(null)
      setActive(0)
      setOpen(true)
      if (ask && q.trim()) setPendingAsk(q.trim())
    }
    const onEvent = (e: Event) => {
      const detail = (e as CustomEvent<{ q?: string; ask?: boolean }>).detail
      show(detail?.q ?? "", Boolean(detail?.ask))
    }
    const onKey = (e: KeyboardEvent) => {
      const typing = e.target instanceof HTMLElement && (e.target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName))
      if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        show()
      } else if (e.key === "/" && !typing) {
        e.preventDefault()
        show()
      }
    }
    window.addEventListener("buildcaps:search", onEvent)
    window.addEventListener("keydown", onKey)
    return () => {
      window.removeEventListener("buildcaps:search", onEvent)
      window.removeEventListener("keydown", onKey)
    }
  }, [])

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    // The input mounts in the same commit, so focus it now: keys typed straight after ⌘K land in it.
    input.current?.focus({ preventScroll: true })
    const len = input.current?.value.length ?? 0
    input.current?.setSelectionRange(len, len)
    // Escape closes from anywhere in the window, not only from the input.
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return
      e.preventDefault()
      close()
    }
    window.addEventListener("keydown", onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener("keydown", onKey)
    }
  }, [open, close])

  useEffect(() => close(), [pathname, close])

  // Instant results, debounced; the previous request is cancelled.
  useEffect(() => {
    if (!open) return
    const q = query.trim()
    if (q.length < 2) {
      setGroups([])
      setLoading(false)
      return
    }
    const ctrl = new AbortController()
    setLoading(true)
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}&locale=${locale}`, { signal: ctrl.signal })
        const data = (await res.json()) as { groups: SearchGroup[] }
        setGroups(data.groups)
        setActive(0)
      } catch {
        if (!ctrl.signal.aborted) setGroups([])
      } finally {
        if (!ctrl.signal.aborted) setLoading(false)
      }
    }, 140)
    return () => {
      clearTimeout(timer)
      ctrl.abort()
    }
  }, [query, open, locale])

  const items: Item[] = useMemo(() => {
    if (query.trim().length < 2) return []
    return [{ id: "ask", kind: "ask" }, { id: "find", kind: "find" }, ...groups.flatMap((g) => g.items.map((h, i) => ({ id: `${g.key}-${i}`, kind: "hit" as const, href: h.href })))]
  }, [groups, query])

  const go = (href: string) => {
    navigated.current = true
    router.push(href)
  }

  const askAi = async (question: string) => {
    aiAbort.current?.abort()
    const ctrl = new AbortController()
    aiAbort.current = ctrl
    setAi({ question, text: "", status: "streaming", properties: [], actions: [] })
    try {
      const res = await fetch("/api/ai/concierge", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ locale, page: pathname, messages: [{ role: "user", content: question }] }),
        signal: ctrl.signal,
      })
      if (!res.ok || !res.body) throw new Error(String(res.status))
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ""
      for (;;) {
        const { value, done } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split("\n")
        buffer = lines.pop() ?? ""
        for (const line of lines.filter(Boolean)) {
          const event = JSON.parse(line)
          if (event.type === "text") setAi((s) => s && { ...s, text: s.text + event.text })
          else if (event.type === "properties") setAi((s) => s && { ...s, properties: event.items })
          else if (event.type === "action") setAi((s) => s && { ...s, actions: [...s.actions.filter((a) => a.kind !== event.kind), { kind: event.kind, url: event.url }] })
          else if (event.type === "error") throw new Error(event.message)
        }
      }
      setAi((s) => s && { ...s, status: "done" })
    } catch {
      if (!ctrl.signal.aborted) setAi((s) => s && { ...s, status: "error" })
    }
  }

  useEffect(() => {
    if (!open || !pendingAsk) return
    setPendingAsk(null)
    askAi(pendingAsk)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, pendingAsk])

  const findListings = async (q: string) => {
    setFinding(true)
    try {
      const params = await askBuildcaps(q, locale)
      go(`/properties${params ? `?${params}` : ""}`)
    } finally {
      setFinding(false)
    }
  }

  const choose = (item: Item | undefined) => {
    const q = query.trim()
    if (!item) {
      if (q) askAi(q)
      return
    }
    if (item.kind === "ask") askAi(q)
    else if (item.kind === "find") findListings(q)
    else if (item.href) go(item.href)
  }

  const continueInChat = () => {
    if (!ai) return
    window.dispatchEvent(new CustomEvent("buildcaps:chat", { detail: { question: ai.question, answer: ai.text, properties: ai.properties, actions: ai.actions } }))
    close()
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault()
      setActive((a) => Math.min(items.length - 1, a + 1))
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setActive((a) => Math.max(0, a - 1))
    } else if (e.key === "Enter") {
      e.preventDefault()
      choose(items[active])
    }
  }

  useEffect(() => {
    document.getElementById(`${listId}-${active}`)?.scrollIntoView({ block: "nearest" })
  }, [active, listId])

  const optionClass = (index: number) =>
    cn("flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-start transition-colors", index === active ? "bg-neutral-100" : "hover:bg-neutral-50")
  const q = query.trim()
  let index = 1

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[90] flex items-start justify-center bg-navy-900/55 px-3 pt-[8vh] backdrop-blur-md sm:pt-[12vh]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onMouseDown={(e) => e.target === e.currentTarget && close()}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={t("open")}
            className="w-full max-w-2xl overflow-hidden rounded-[1.75rem] bg-white shadow-[0_40px_120px_-30px_rgb(0_23_63/0.6)] ring-1 ring-black/5"
            initial={{ opacity: 0, y: 24, scale: 0.97, filter: "blur(6px)" }}
            animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 380, damping: 32 }}
          >
            {/* Input with a slowly turning light ring */}
            <div className="relative p-[1.5px]">
              <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-t-[1.75rem]">
                <div
                  className={cn("absolute -inset-[150%] animate-[spin_7s_linear_infinite]", ai?.status === "streaming" && "animate-[spin_2.4s_linear_infinite]")}
                  style={{ background: "conic-gradient(from 0deg, transparent 0deg, #0b1d3a 70deg, #d8c3a5 140deg, transparent 200deg, #9ab5d6 280deg, transparent 360deg)" }}
                />
              </div>
              <div className="relative flex items-center gap-3 rounded-t-[1.65rem] bg-white px-5">
                {loading || ai?.status === "streaming" ? <Loader2 className="h-5 w-5 shrink-0 animate-spin text-neutral-500" /> : <Sparkles className="h-5 w-5 shrink-0 text-navy-700" />}
                <input
                  ref={input}
                  value={query}
                  onChange={(e) => {
                    typed.current = e.target.value
                    setQuery(e.target.value)
                    setAi(null)
                  }}
                  onKeyDown={onKeyDown}
                  placeholder={t("placeholder")}
                  role="combobox"
                  aria-expanded={items.length > 0}
                  aria-controls={listId}
                  aria-activedescendant={items.length ? `${listId}-${active}` : undefined}
                  aria-autocomplete="list"
                  className="h-16 min-w-0 flex-1 bg-transparent text-lg text-neutral-900 outline-none placeholder:text-neutral-400"
                />
                <button type="button" onClick={close} aria-label={t("close")} className="rounded-full p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div id={listId} role="listbox" aria-label={t("open")} className="max-h-[62vh] overflow-y-auto overscroll-contain border-t border-neutral-100 p-2 sm:max-h-[56vh]">
              {/* AI answer */}
              {ai && (
                <section className="m-1 mb-3 rounded-2xl bg-gradient-to-b from-sand-100/80 to-white p-4 ring-1 ring-neutral-200/70">
                  <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-navy-700">
                    <Sparkles className="h-3.5 w-3.5" /> {t("askAi")}
                  </p>
                  <div className="mt-2 text-[15px] leading-relaxed text-neutral-800">
                    {ai.text ? <RichText text={ai.text} /> : ai.status === "streaming" ? <p className="animate-pulse text-neutral-500">{t("thinking")}</p> : null}
                    {ai.status === "error" && <p className="text-neutral-600">{t("aiError")}</p>}
                  </div>
                  {ai.properties.length > 0 && (
                    <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                      {ai.properties.slice(0, 4).map((p) => (
                        <li key={p.slug}>
                          <a href={p.url} className="block rounded-xl bg-white p-3 text-sm ring-1 ring-neutral-200 hover:ring-neutral-400">
                            <span className="line-clamp-1 font-medium text-neutral-900">{p.title}</span>
                            <span className="text-xs text-neutral-500">
                              {p.community}
                              {p.price_aed ? ` · ${formatMoney(p.price_aed, "AED", locale as never, { compact: true })}` : ""}
                            </span>
                          </a>
                        </li>
                      ))}
                    </ul>
                  )}
                  {ai.status !== "streaming" && (
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      {ai.text && (
                        <button type="button" onClick={continueInChat} className="inline-flex items-center gap-1.5 rounded-full bg-neutral-900 px-3.5 py-1.5 text-xs font-semibold text-white">
                          <MessageCircle className="h-3.5 w-3.5" /> {t("continueChat")}
                        </button>
                      )}
                      {ai.actions.map((a) => (
                        <a key={a.kind} href={a.url} target={a.kind === "whatsapp" ? "_blank" : undefined} rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold text-neutral-800 ring-1 ring-neutral-300">
                          {a.kind === "booking" ? <CalendarCheck className="h-3.5 w-3.5" /> : <MessageCircle className="h-3.5 w-3.5" />}
                          {a.kind === "booking" ? tn("book") : "WhatsApp"}
                        </a>
                      ))}
                      <span className="text-[11px] text-neutral-400">{t("answerNote")}</span>
                    </div>
                  )}
                </section>
              )}

              {/* Nothing typed yet: ideas and shortcuts */}
              {q.length < 2 && (
                <div className="p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">{t("try")}</p>
                  <ul className="mt-2 flex flex-wrap gap-2">
                    {examples.map((ex) => (
                      <li key={ex}>
                        <button type="button" onClick={() => (setQuery(ex), askAi(ex))} className="rounded-full bg-neutral-50 px-3.5 py-2 text-sm text-neutral-700 ring-1 ring-neutral-200 hover:bg-white hover:ring-neutral-400">
                          {ex}
                        </button>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-5 text-xs font-semibold uppercase tracking-wide text-neutral-400">{t("popular")}</p>
                  <ul className="mt-2 grid gap-1 sm:grid-cols-2">
                    {(
                      [
                        ["/properties", tn("properties")],
                        ["/off-plan", tn("offPlan")],
                        ["/communities", tn("communities")],
                        ["/tools", tn("tools")],
                        ["/invest", tn("invest")],
                        ["/book", tn("book")],
                      ] as const
                    ).map(([href, label]) => (
                      <li key={href}>
                        <button type="button" onClick={() => go(href)} className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-50">
                          {label}
                          <ArrowUpRight className="h-4 w-4 text-neutral-400" />
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Typed: AI actions first, then instant matches */}
              {q.length >= 2 && (
                <>
                  <button type="button" id={`${listId}-0`} role="option" aria-selected={active === 0} onMouseEnter={() => setActive(0)} onClick={() => choose(items[0])} className={optionClass(0)}>
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-navy-900 text-white">
                      <Sparkles className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium text-neutral-900">
                        {t("askAi")}: <span className="text-neutral-600">“{q}”</span>
                      </span>
                      <span className="block text-xs text-neutral-500">{t("askAiHint")}</span>
                    </span>
                    {active === 0 && <CornerDownLeft className="h-4 w-4 shrink-0 text-neutral-400" />}
                  </button>
                  <button type="button" id={`${listId}-1`} role="option" aria-selected={active === 1} onMouseEnter={() => setActive(1)} onClick={() => choose(items[1])} className={optionClass(1)}>
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sand-100 text-navy-800">
                      {finding ? <Loader2 className="h-4 w-4 animate-spin" /> : <SlidersHorizontal className="h-4 w-4" />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium text-neutral-900">{t("findListings")}</span>
                      <span className="block text-xs text-neutral-500">{t("findListingsHint")}</span>
                    </span>
                    {active === 1 && <CornerDownLeft className="h-4 w-4 shrink-0 text-neutral-400" />}
                  </button>

                  {groups.map((g) => {
                    const Icon = GROUP_ICON[g.key]
                    return (
                      <div key={g.key} className="mt-2">
                        <p className="px-3 pb-1 pt-2 text-xs font-semibold uppercase tracking-wide text-neutral-400">{t(`groups.${g.key}`)}</p>
                        {g.items.map((hit) => {
                          const i = ++index
                          return (
                            <button key={hit.href} type="button" id={`${listId}-${i}`} role="option" aria-selected={active === i} onMouseEnter={() => setActive(i)} onClick={() => go(hit.href)} className={optionClass(i)}>
                              <span className="relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-neutral-100 text-neutral-600">
                                {hit.image ? <img src={hit.image} alt="" className="absolute inset-0 h-full w-full object-cover" loading="lazy" /> : <Icon className="h-4 w-4" />}
                              </span>
                              <span className="min-w-0 flex-1">
                                <span className="block truncate text-neutral-900">{hit.title}</span>
                                {hit.subtitle && <span className="block truncate text-xs text-neutral-500">{hit.subtitle}</span>}
                              </span>
                              {active === i && <CornerDownLeft className="h-4 w-4 shrink-0 text-neutral-400" />}
                            </button>
                          )
                        })}
                      </div>
                    )
                  })}
                  {!loading && !groups.length && <p className="px-3 py-4 text-sm text-neutral-500">{t("empty")}</p>}
                </>
              )}
            </div>

            <div className="hidden items-center justify-between gap-3 border-t border-neutral-100 px-5 py-3 text-xs text-neutral-400 sm:flex">
              <span className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <Kbd>↑</Kbd>
                  <Kbd>↓</Kbd> {t("keys.navigate")}
                </span>
                <span className="flex items-center gap-1">
                  <Kbd>↵</Kbd> {t("keys.open")}
                </span>
                <span className="flex items-center gap-1">
                  <Kbd>esc</Kbd> {t("keys.close")}
                </span>
              </span>
              <span className="flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5" /> {t("poweredBy")}
              </span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
