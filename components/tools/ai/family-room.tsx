"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Copy, Languages, Loader2, Plus, Send, Sparkles, ThumbsDown, ThumbsUp, Users } from "lucide-react"
import { useLocale, useTranslations } from "next-intl"
import { localeNames, type Locale } from "@/i18n/locales"
import { familySummaryAction, translateAction } from "@/app/actions/intel"
import { supabaseConfigured } from "@/lib/supabase/config"
import { browserClient } from "@/lib/supabase/browser"
import type { ToolProperty } from "@/lib/insights/types"
import { formatMoney } from "@/lib/format"
import { TransitionLink } from "@/components/motion/view-transitions"
import { cn } from "@/lib/utils"

// Family Decision Room: a live room for relatives in different countries. Each
// person writes in their own language and reads everyone else translated; they
// list must-haves, shortlist and vote, then ask for a fair compromise. Rooms run
// over Supabase Realtime broadcast and are never stored: when everyone leaves,
// the room is gone. Without Supabase it works across tabs of one browser (demo).

type Member = { id: string; name: string; locale: Locale; mustHaves: string[]; seen: number }
type Message = { id: string; from: string; name: string; locale: Locale; text: string; at: number; summary?: boolean }
type Pick = { slug: string; by: string; votes: Record<string, 1 | -1> }
type Event =
  | { type: "member"; member: Member; hello?: boolean }
  | { type: "state"; messages: Message[]; picks: Pick[] }
  | { type: "msg"; message: Message }
  | { type: "pick"; pick: Pick }
  | { type: "vote"; slug: string; member: string; vote: 1 | -1 | 0 }
  | { type: "leave"; id: string }

const MUST_HAVES = ["schools", "sea", "metro", "quiet", "family", "yield", "budget", "handover", "parking", "pets"] as const

const randomId = (n = 10) => Array.from(crypto.getRandomValues(new Uint8Array(n)), (b) => "abcdefghjkmnpqrstuvwxyz23456789"[b % 31]).join("")

function connect(room: string, onEvent: (e: Event) => void) {
  if (supabaseConfigured) {
    const supabase = browserClient()
    const channel = supabase.channel(`family-${room}`, { config: { broadcast: { self: false } } })
    channel.on("broadcast", { event: "room" }, ({ payload }) => onEvent(payload as Event))
    const ready = new Promise<void>((resolve) => channel.subscribe((status) => status === "SUBSCRIBED" && resolve()))
    return {
      ready,
      send: (e: Event) => void ready.then(() => channel.send({ type: "broadcast", event: "room", payload: e })),
      close: () => void supabase.removeChannel(channel),
    }
  }
  const channel = new BroadcastChannel(`family-${room}`)
  channel.onmessage = (m) => onEvent(m.data as Event)
  return { ready: Promise.resolve(), send: (e: Event) => channel.postMessage(e), close: () => channel.close() }
}

export function FamilyRoom({ properties }: { properties: ToolProperty[] }) {
  const t = useTranslations("intel.familyRoom")
  const locale = useLocale() as Locale
  const router = useRouter()
  const params = useSearchParams()
  const room = params.get("room")
  const [code, setCode] = useState("")
  // The room reads this browser's saved name and the page URL, so it renders after mount.
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  if (!room) {
    return (
      <div className="mx-auto grid max-w-3xl gap-6 md:grid-cols-2">
        <div className="rounded-3xl bg-navy-900 p-8 text-white">
          <Users className="h-8 w-8 text-rose-300" />
          <h2 className="mt-4 text-2xl font-semibold">{t("startTitle")}</h2>
          <p className="mt-2 text-white/75">{t("startBody")}</p>
          <button type="button" onClick={() => router.replace(`?room=${randomId(8)}`)} className="mt-6 rounded-full bg-white px-5 py-3 font-semibold text-neutral-900">
            {t("start")}
          </button>
        </div>
        <form
          className="rounded-3xl bg-white p-8 ring-1 ring-neutral-200"
          onSubmit={(e) => {
            e.preventDefault()
            if (/^[a-z0-9]{6,12}$/.test(code)) router.replace(`?room=${code}`)
          }}
        >
          <h2 className="text-2xl font-semibold text-neutral-900">{t("joinTitle")}</h2>
          <input value={code} onChange={(e) => setCode(e.target.value.trim().toLowerCase())} placeholder={t("code")} aria-label={t("code")} className="mt-6 h-12 w-full rounded-xl border border-neutral-200 px-4" dir="ltr" />
          <button className="mt-4 rounded-full bg-neutral-900 px-5 py-3 font-semibold text-white">{t("join")}</button>
          {!supabaseConfigured && <p className="mt-4 text-xs text-neutral-500">{t("demo")}</p>}
        </form>
      </div>
    )
  }
  if (!mounted) return <div className="h-96 animate-pulse rounded-3xl bg-sand-100" />
  return <Room room={room} locale={locale} properties={properties} />
}

function Room({ room, locale, properties }: { room: string; locale: Locale; properties: ToolProperty[] }) {
  const t = useTranslations("intel.familyRoom")
  const storageKey = `family:${room}`
  const [me, setMe] = useState<Member>(() => {
    // Name and must-haves are remembered per browser; the member id per tab, so
    // two tabs of one browser count as two people.
    let saved: Partial<Member> = {}
    let id: string | null = null
    try {
      saved = JSON.parse(localStorage.getItem(storageKey) ?? "{}")
      id = sessionStorage.getItem(storageKey)
      if (!id) sessionStorage.setItem(storageKey, (id = randomId()))
    } catch {}
    return { id: id ?? randomId(), name: saved.name ?? "", locale, mustHaves: saved.mustHaves ?? [], seen: Date.now() }
  })
  const [members, setMembers] = useState<Record<string, Member>>({})
  const [messages, setMessages] = useState<Message[]>([])
  const [picks, setPicks] = useState<Record<string, Pick>>({})
  // Per message: null while translating, false when translation isn't available.
  const [translated, setTranslated] = useState<Record<string, string | null | false>>({})
  const [original, setOriginal] = useState<Record<string, boolean>>({})
  const [draft, setDraft] = useState("")
  const [toAdd, setToAdd] = useState("")
  const [summary, setSummary] = useState<{ summary: string; suggest: string[] } | null | "loading" | "error">(null)
  const transport = useRef<ReturnType<typeof connect> | null>(null)
  const meRef = useRef(me)
  meRef.current = me
  const stateRef = useRef({ messages, picks })
  stateRef.current = { messages, picks }

  const mergeMessages = useCallback((incoming: Message[]) => setMessages((m) => {
    const ids = new Set(m.map((x) => x.id))
    return [...m, ...incoming.filter((x) => !ids.has(x.id))].sort((a, b) => a.at - b.at).slice(-150)
  }), [])

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify({ name: me.name, mustHaves: me.mustHaves }))
    } catch {}
  }, [me, storageKey])

  useEffect(() => {
    const tr = connect(room, (e) => {
      if (e.type === "member") {
        setMembers((m) => ({ ...m, [e.member.id]: { ...e.member, seen: Date.now() } }))
        if (e.hello) {
          tr.send({ type: "member", member: meRef.current })
          tr.send({ type: "state", messages: stateRef.current.messages.slice(-50), picks: Object.values(stateRef.current.picks) })
        }
      } else if (e.type === "state") {
        mergeMessages(e.messages)
        setPicks((p) => {
          const next = { ...p }
          for (const pick of e.picks) next[pick.slug] = { ...pick, votes: { ...pick.votes, ...(next[pick.slug]?.votes ?? {}) } }
          return next
        })
      } else if (e.type === "msg") mergeMessages([e.message])
      else if (e.type === "pick") setPicks((p) => (p[e.pick.slug] ? p : { ...p, [e.pick.slug]: e.pick }))
      else if (e.type === "vote") setPicks((p) => (p[e.slug] ? { ...p, [e.slug]: { ...p[e.slug], votes: voteFor(p[e.slug].votes, e.member, e.vote) } } : p))
      else if (e.type === "leave") setMembers((m) => Object.fromEntries(Object.entries(m).filter(([id]) => id !== e.id)))
    })
    transport.current = tr
    tr.send({ type: "member", member: meRef.current, hello: true })
    const beat = setInterval(() => {
      tr.send({ type: "member", member: meRef.current })
      setMembers((m) => Object.fromEntries(Object.entries(m).filter(([, x]) => Date.now() - x.seen < 45_000)))
    }, 15_000)
    const bye = () => tr.send({ type: "leave", id: meRef.current.id })
    window.addEventListener("pagehide", bye)
    return () => {
      clearInterval(beat)
      window.removeEventListener("pagehide", bye)
      bye()
      tr.close()
    }
  }, [room, mergeMessages])

  // Messages written in another language are translated into mine, once each.
  useEffect(() => {
    for (const m of messages) {
      if (m.locale === locale || m.id in translated) continue
      setTranslated((x) => ({ ...x, [m.id]: null }))
      translateAction(m.text, locale)
        .then((text) => setTranslated((x) => ({ ...x, [m.id]: text ?? false })))
        .catch(() => setTranslated((x) => ({ ...x, [m.id]: false })))
    }
  }, [messages, locale, translated])

  const updateMe = (patch: Partial<Member>) => {
    const next = { ...me, ...patch }
    setMe(next)
    transport.current?.send({ type: "member", member: next })
  }
  const send = (text: string, isSummary = false) => {
    if (!text.trim() || !me.name) return
    const message: Message = { id: randomId(), from: me.id, name: me.name, locale, text: text.trim().slice(0, 1000), at: Date.now(), summary: isSummary }
    mergeMessages([message])
    transport.current?.send({ type: "msg", message })
  }
  const addPick = () => {
    if (!toAdd || picks[toAdd]) return
    const pick: Pick = { slug: toAdd, by: me.id, votes: { [me.id]: 1 } }
    setPicks((p) => ({ ...p, [toAdd]: pick }))
    transport.current?.send({ type: "pick", pick })
    setToAdd("")
  }
  const vote = (slug: string, v: 1 | -1) => {
    const current = picks[slug]?.votes[me.id]
    const next = current === v ? 0 : v
    setPicks((p) => ({ ...p, [slug]: { ...p[slug], votes: voteFor(p[slug].votes, me.id, next) } }))
    transport.current?.send({ type: "vote", slug, member: me.id, vote: next })
  }

  const everyone = useMemo(() => ({ ...members, [me.id]: me }), [members, me])
  const byId = new Map(properties.map((p) => [p.slug, p]))
  const ranked = Object.values(picks)
    .map((p) => ({ ...p, score: Object.values(p.votes).reduce((s: number, v) => s + v, 0), property: byId.get(p.slug) }))
    .filter((p) => p.property)
    .sort((a, b) => b.score - a.score)

  const askSummary = async () => {
    setSummary("loading")
    const result = await familySummaryAction(
      {
        members: Object.values(everyone).map((m) => ({ name: m.name || "?", locale: m.locale, mustHaves: m.mustHaves, budget: null })),
        shortlist: ranked.map((r) => ({ slug: r.slug, title: r.property!.title, score: r.score })),
      },
      locale,
    ).catch(() => null)
    setSummary(result ?? "error")
  }
  const link = typeof window !== "undefined" ? window.location.href : ""

  return (
    <div className="grid gap-6 lg:grid-cols-12">
      <aside className="space-y-5 rounded-3xl bg-white p-6 ring-1 ring-neutral-200 lg:col-span-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">{t("roomCode")}</p>
          <p className="mt-1 font-mono text-lg" dir="ltr">{room}</p>
          <div className="mt-2 flex gap-2 text-sm">
            <button type="button" onClick={() => navigator.clipboard?.writeText(link)} className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 ring-1 ring-neutral-200">
              <Copy className="h-3.5 w-3.5" /> {t("copy")}
            </button>
            <a href={`https://wa.me/?text=${encodeURIComponent(`${t("inviteText")} ${link}`)}`} target="_blank" rel="noopener noreferrer" className="rounded-full px-3 py-1.5 ring-1 ring-neutral-200">
              WhatsApp
            </a>
          </div>
        </div>
        <label className="block text-sm font-medium text-neutral-700">
          {t("yourName")}
          <input value={me.name} onChange={(e) => updateMe({ name: e.target.value.slice(0, 40) })} className="mt-1 h-11 w-full rounded-xl border border-neutral-200 px-3" />
        </label>
        <fieldset>
          <legend className="mb-2 text-sm font-medium text-neutral-700">{t("mustHaves")}</legend>
          <div className="flex flex-wrap gap-1.5">
            {MUST_HAVES.map((k) => {
              const on = me.mustHaves.includes(k)
              return (
                <button key={k} type="button" aria-pressed={on} onClick={() => updateMe({ mustHaves: on ? me.mustHaves.filter((x) => x !== k) : [...me.mustHaves, k] })} className={cn("rounded-full border px-2.5 py-1 text-xs", on ? "border-rose-500 bg-rose-50 text-rose-700" : "border-neutral-200 text-neutral-700")}>
                  {t(`must.${k}`)}
                </button>
              )
            })}
          </div>
        </fieldset>
        <div>
          <p className="text-sm font-medium text-neutral-700">{t("here", { count: Object.keys(everyone).length })}</p>
          <ul className="mt-2 space-y-2 text-sm">
            {Object.values(everyone).map((m) => (
              <li key={m.id}>
                <span className="font-medium text-neutral-900">{m.name || t("guest")}</span>
                <span className="text-neutral-500"> · {localeNames[m.locale]}</span>
                {m.mustHaves.length > 0 && <span className="block text-xs text-neutral-500">{m.mustHaves.map((k) => t(`must.${k}`)).join(", ")}</span>}
              </li>
            ))}
          </ul>
        </div>
        {!supabaseConfigured && <p className="text-xs text-neutral-500">{t("demo")}</p>}
      </aside>

      <section className="flex min-h-[480px] flex-col rounded-3xl bg-white ring-1 ring-neutral-200 lg:col-span-5">
        <ol className="flex-1 space-y-3 overflow-y-auto p-6" aria-live="polite">
          {!messages.length && <li className="text-sm text-neutral-500">{t("emptyChat")}</li>}
          {messages.map((m) => {
            const mine = m.from === me.id
            const tr = translated[m.id]
            const showOriginal = original[m.id] || !tr
            return (
              <li key={m.id} className={cn("max-w-[85%] rounded-2xl px-4 py-2.5 text-sm", mine ? "ms-auto bg-neutral-900 text-white" : m.summary ? "bg-rose-50 text-neutral-800 ring-1 ring-rose-100" : "bg-sand-100 text-neutral-800")}>
                <p className={cn("text-xs", mine ? "text-white/60" : "text-neutral-500")}>
                  {m.name} · {localeNames[m.locale]}
                </p>
                <p className="mt-1 whitespace-pre-line">{showOriginal ? m.text : tr}</p>
                {!mine && m.locale !== locale && tr !== false && (
                  <button type="button" onClick={() => setOriginal((o) => ({ ...o, [m.id]: !o[m.id] }))} className="mt-1 inline-flex items-center gap-1 text-xs text-neutral-500 hover:text-neutral-800">
                    <Languages className="h-3 w-3" />
                    {tr === undefined || tr === null ? t("translating") : showOriginal ? t("showTranslation") : t("showOriginal")}
                  </button>
                )}
              </li>
            )
          })}
        </ol>
        <form
          className="flex gap-2 border-t border-neutral-100 p-4"
          onSubmit={(e) => {
            e.preventDefault()
            send(draft)
            setDraft("")
          }}
        >
          <input value={draft} onChange={(e) => setDraft(e.target.value)} disabled={!me.name} placeholder={me.name ? t("placeholder") : t("nameFirst")} aria-label={t("placeholder")} className="h-11 flex-1 rounded-full border border-neutral-200 px-4 text-sm" />
          <button disabled={!me.name || !draft.trim()} aria-label={t("send")} className="flex h-11 w-11 items-center justify-center rounded-full bg-neutral-900 text-white disabled:opacity-50">
            <Send className="h-4 w-4 rtl:rotate-180" />
          </button>
        </form>
      </section>

      <section className="space-y-5 rounded-3xl bg-white p-6 ring-1 ring-neutral-200 lg:col-span-4">
        <h2 className="text-lg font-semibold text-neutral-900">{t("shortlist")}</h2>
        <div className="flex gap-2">
          <select value={toAdd} onChange={(e) => setToAdd(e.target.value)} aria-label={t("addListing")} className="h-11 min-w-0 flex-1 rounded-xl border border-neutral-200 px-3 text-sm">
            <option value="">{t("addListing")}</option>
            {properties.filter((p) => !picks[p.slug]).map((p) => (
              <option key={p.slug} value={p.slug}>
                {p.title}
              </option>
            ))}
          </select>
          <button type="button" onClick={addPick} disabled={!toAdd} aria-label={t("add")} className="flex h-11 w-11 items-center justify-center rounded-full bg-neutral-900 text-white disabled:opacity-50">
            <Plus className="h-4 w-4" />
          </button>
        </div>
        <ul className="space-y-3">
          {ranked.map((r) => (
            <li key={r.slug} className="rounded-2xl p-4 ring-1 ring-neutral-200">
              <TransitionLink href={`/properties/${r.slug}`} className="font-medium text-neutral-900 hover:text-rose-700">
                {r.property!.title}
              </TransitionLink>
              <p className="text-xs text-neutral-500">
                <bdi>{r.property!.priceAed ? formatMoney(r.property!.priceAed, "AED", locale) : "—"}</bdi>
              </p>
              <div className="mt-3 flex items-center gap-2 text-sm">
                <button type="button" onClick={() => vote(r.slug, 1)} aria-pressed={r.votes[me.id] === 1} aria-label={t("like")} className={cn("rounded-full p-2 ring-1", r.votes[me.id] === 1 ? "bg-emerald-50 text-emerald-700 ring-emerald-200" : "ring-neutral-200")}>
                  <ThumbsUp className="h-4 w-4" />
                </button>
                <button type="button" onClick={() => vote(r.slug, -1)} aria-pressed={r.votes[me.id] === -1} aria-label={t("dislike")} className={cn("rounded-full p-2 ring-1", r.votes[me.id] === -1 ? "bg-red-50 text-red-700 ring-red-200" : "ring-neutral-200")}>
                  <ThumbsDown className="h-4 w-4" />
                </button>
                <span className="ms-auto font-semibold text-neutral-900">{r.score > 0 ? `+${r.score}` : r.score}</span>
              </div>
            </li>
          ))}
        </ul>
        <button type="button" onClick={askSummary} disabled={summary === "loading"} className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-navy-900 px-4 py-3 text-sm font-semibold text-white disabled:opacity-60">
          {summary === "loading" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4 text-rose-300" />}
          {t("compromise")}
        </button>
        {summary === "error" && <p className="text-sm text-neutral-500">{t("compromiseUnavailable")}</p>}
        {summary && typeof summary === "object" && (
          <div className="rounded-2xl bg-sand-100 p-4 text-sm text-neutral-800">
            <p className="whitespace-pre-line">{summary.summary}</p>
            {summary.suggest.length > 0 && (
              <ul className="mt-3 space-y-1">
                {summary.suggest.map((s) => (
                  <li key={s}>
                    <TransitionLink href={`/properties/${s}`} className="font-medium text-rose-700 hover:underline">
                      {byId.get(s)?.title ?? s}
                    </TransitionLink>
                  </li>
                ))}
              </ul>
            )}
            <button type="button" onClick={() => send(summary.summary, true)} className="mt-3 text-sm font-semibold text-neutral-900 underline">
              {t("share")}
            </button>
          </div>
        )}
        {ranked[0] && (
          <TransitionLink href={`/book?purpose=viewing&property=${ranked[0].slug}`} className="block rounded-full px-4 py-3 text-center text-sm font-semibold text-neutral-900 ring-1 ring-neutral-200">
            {t("book", { title: ranked[0].property!.title })}
          </TransitionLink>
        )}
      </section>
    </div>
  )
}

function voteFor(votes: Record<string, 1 | -1>, member: string, vote: 1 | -1 | 0) {
  const next = { ...votes }
  if (vote === 0) delete next[member]
  else next[member] = vote
  return next
}
