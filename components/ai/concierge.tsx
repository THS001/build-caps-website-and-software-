"use client"

import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { CalendarCheck, Mic, MicOff, Send, Sparkles, Volume2, VolumeX, X, MessageCircle } from "lucide-react"
import { useLocale, useTranslations } from "next-intl"
import { localeTags, type Locale } from "@/i18n/locales"
import { usePathname } from "@/i18n/navigation"
import { formatMoney } from "@/lib/format"
import { cn } from "@/lib/utils"
import { useHeroClear } from "@/hooks/use-hero-clear"
import { ASKS, BuddyBubble, BuddyFace, useBuddyTalk, type LineKey } from "@/components/ai/buddy"

type PropertyItem = { slug: string; title: string; price_aed: number | null; beds: number; size_sqft: number; community: string; url: string }
type Action = { kind: "booking" | "whatsapp"; url: string }
type Msg = { role: "user" | "assistant"; content: string; properties?: PropertyItem[]; actions?: Action[] }

const STORAGE = "bc-concierge"

/** Minimal, safe rendering of the assistant's text: paragraphs, bullet lines, **bold** and links. */
export function RichText({ text }: { text: string }) {
  const inline = (line: string, key: string): ReactNode[] =>
    line.split(/(\*\*[^*]+\*\*|https?:\/\/[^\s)]+)/g).map((part, i) =>
      part.startsWith("**") ? (
        <strong key={`${key}-${i}`}>{part.slice(2, -2)}</strong>
      ) : /^https?:\/\//.test(part) ? (
        <a key={`${key}-${i}`} href={part} className="break-all underline" target={part.includes(location.host) ? undefined : "_blank"} rel="noopener noreferrer">
          {part}
        </a>
      ) : (
        part
      ),
    )
  const blocks = text.trim().split(/\n{2,}/)
  return (
    <>
      {blocks.map((block, b) => {
        const lines = block.split("\n")
        return lines.every((l) => /^\s*[-•*]\s+/.test(l)) ? (
          <ul key={b} className="my-1 list-disc space-y-1 ps-5">
            {lines.map((l, i) => (
              <li key={i}>{inline(l.replace(/^\s*[-•*]\s+/, ""), `${b}-${i}`)}</li>
            ))}
          </ul>
        ) : (
          <p key={b} className="my-1 whitespace-pre-line">
            {inline(block, String(b))}
          </p>
        )
      })}
    </>
  )
}

type SpeechRecognitionLike = { lang: string; interimResults: boolean; start: () => void; stop: () => void; onresult: ((e: { results: { 0: { transcript: string } }[] }) => void) | null; onend: (() => void) | null }

/** The chat, behind an advisor's face that follows the pointer and comments on the visit. `talkative` is off where his lines aren't translated yet. */
export function Concierge({ talkative = true }: { talkative?: boolean }) {
  const t = useTranslations("ai.concierge")
  const ta = useTranslations("ai")
  const locale = useLocale() as Locale
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Msg[]>([])
  const [input, setInput] = useState("")
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState<string>()
  const [listening, setListening] = useState(false)
  const [speak, setSpeak] = useState(false)
  const recognition = useRef<SpeechRecognitionLike | null>(null)
  const scroller = useRef<HTMLDivElement>(null)
  const suggestions = t.raw("suggestions") as string[]
  const heroClear = useHeroClear()
  const tb = useTranslations("ai.buddy")
  const tc = useTranslations("common")
  const launcher = useRef<HTMLButtonElement>(null)
  const talk = useBuddyTalk({ active: talkative && !heroClear && !open })

  const closePanel = () => {
    setOpen(false)
    launcher.current?.focus()
  }

  // Escape closes the chat, as it does the search window.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || document.querySelector('[role="dialog"][aria-modal="true"]')) return
      setOpen(false)
      launcher.current?.focus()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open])

  useEffect(() => {
    const onChat = (e: Event) => {
      const d = (e as CustomEvent<{ question: string; answer: string; properties?: PropertyItem[]; actions?: Action[] }>).detail
      if (!d?.question) return
      setMessages((all) => [...all, { role: "user", content: d.question }, { role: "assistant", content: d.answer, properties: d.properties, actions: d.actions }])
      setOpen(true)
    }
    window.addEventListener("buildcaps:chat", onChat)
    return () => window.removeEventListener("buildcaps:chat", onChat)
  }, [])

  const askRef = useRef<(text: string) => void>(() => {})
  useEffect(() => {
    const onAsk = (e: Event) => {
      const q = (e as CustomEvent<{ question?: string }>).detail?.question
      setOpen(true)
      if (q) setTimeout(() => askRef.current(q), 50)
    }
    window.addEventListener("buildcaps:ask", onAsk)
    return () => window.removeEventListener("buildcaps:ask", onAsk)
  }, [])

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE)
      if (saved) setMessages(JSON.parse(saved))
    } catch {}
  }, [])
  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE, JSON.stringify(messages.slice(-24)))
    } catch {}
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" })
  }, [messages])

  const say = (text: string) => {
    if (!speak || typeof speechSynthesis === "undefined") return
    speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text.replace(/\*\*/g, "").replace(/https?:\/\/\S+/g, ""))
    utterance.lang = localeTags[locale]
    speechSynthesis.speak(utterance)
  }

  const ask = async (text: string) => {
    const question = text.trim()
    if (!question || busy) return
    const history: Msg[] = [...messages, { role: "user", content: question }]
    setMessages([...history, { role: "assistant", content: "" }])
    setInput("")
    setBusy(true)
    setStatus(ta("generating"))

    const update = (fn: (m: Msg) => Msg) => setMessages((all) => [...all.slice(0, -1), fn(all[all.length - 1])])
    let full = ""
    try {
      const res = await fetch("/api/ai/concierge", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ locale, page: pathname, messages: history.map(({ role, content }) => ({ role, content: content || "…" })) }),
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
          if (event.type === "text") {
            full += event.text
            update((m) => ({ ...m, content: m.content + event.text }))
            setStatus(undefined)
          } else if (event.type === "tool") setStatus(ta("generating"))
          else if (event.type === "properties") update((m) => ({ ...m, properties: event.items }))
          else if (event.type === "action") update((m) => ({ ...m, actions: [...(m.actions ?? []).filter((a) => a.kind !== event.kind), { kind: event.kind, url: event.url }] }))
          else if (event.type === "error") throw new Error(event.message)
        }
      }
      say(full)
    } catch {
      update((m) => ({ ...m, content: m.content || ta("error") }))
    } finally {
      setBusy(false)
      setStatus(undefined)
    }
  }

  askRef.current = ask

  const fromBubble = (key: LineKey) => {
    talk.clear()
    setOpen(true)
    const prompt = ASKS[key]
    if (prompt) ask(tb(`prompts.${prompt}`))
  }

  const toggleVoice = () => {
    const Recognition = (window as unknown as { SpeechRecognition?: new () => SpeechRecognitionLike; webkitSpeechRecognition?: new () => SpeechRecognitionLike }).SpeechRecognition ??
      (window as unknown as { webkitSpeechRecognition?: new () => SpeechRecognitionLike }).webkitSpeechRecognition
    if (!Recognition) return
    if (listening) return recognition.current?.stop()
    const r = new Recognition()
    r.lang = localeTags[locale]
    r.interimResults = false
    r.onresult = (e) => ask(e.results[0][0].transcript)
    r.onend = () => setListening(false)
    recognition.current = r
    setListening(true)
    r.start()
  }

  const submit = (e: FormEvent) => {
    e.preventDefault()
    ask(input)
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        ref={launcher}
        aria-expanded={open}
        aria-label={tb("label")}
        tabIndex={heroClear && !open ? -1 : undefined}
        onPointerEnter={() => talk.setMood("happy", 1800)}
        className={cn(
          // Centred over the WhatsApp button below it (56px at end-5 / md:end-8).
          "fixed end-3 bottom-24 z-40 h-[72px] w-[72px] overflow-hidden rounded-full shadow-[0_14px_40px_-10px_rgb(0_23_63/0.6)] transition-all duration-500 hover:scale-105 md:end-4 md:bottom-28 md:h-[88px] md:w-[88px]",
          heroClear && !open && "pointer-events-none translate-y-4 opacity-0",
        )}
      >
        {open ? (
          <span className="flex h-full w-full items-center justify-center bg-navy-900 text-white">
            <X className="h-7 w-7" />
          </span>
        ) : (
          <BuddyFace mood={talk.mood} target={launcher} />
        )}
      </button>
      <BuddyBubble line={talk.line} onAsk={fromBubble} onDismiss={talk.dismiss} />

      <AnimatePresence>
        {open && (
          <motion.section
            role="dialog"
            aria-label={t("title")}
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ duration: 0.2 }}
            // Phones: between the header and the launcher. Larger screens: beside the launcher and
            // WhatsApp column, bottom-aligned with the WhatsApp button and 16px under the header, up to
            // 640px tall (mt-auto keeps it low when capped), so it never covers either button.
            className="fixed inset-x-3 bottom-44 top-20 z-40 flex flex-col overflow-hidden rounded-3xl bg-white shadow-[0_30px_100px_-30px_rgb(0_23_63/0.5)] ring-1 ring-neutral-200 sm:inset-x-auto sm:end-24 sm:bottom-5 sm:mt-auto sm:max-h-[640px] sm:w-[400px] md:end-[120px] md:bottom-8 lg:top-24"
            data-lenis-prevent
          >
            <header className="flex items-center justify-between gap-3 bg-navy-900 px-5 py-4 text-white">
              <div>
                <p className="font-semibold">{t("title")}</p>
                <p className="text-xs text-white/60">{t("subtitle")}</p>
              </div>
              <div className="flex items-center gap-1">
                <button type="button" onClick={() => setSpeak((s) => !s)} aria-pressed={speak} aria-label={t("readAloud")} className="rounded-full p-2 hover:bg-white/10">
                  {speak ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                </button>
                <button type="button" onClick={closePanel} aria-label={tc("close")} className="rounded-full p-2 hover:bg-white/10">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </header>

            <div ref={scroller} className="flex-1 space-y-4 overflow-y-auto p-4 text-sm">
              <div className="rounded-2xl rounded-ss-sm bg-sand-100 p-3 text-neutral-800">{t("greeting")}</div>
              {messages.length === 0 && (
                <div className="flex flex-wrap gap-2">
                  {suggestions.map((s) => (
                    <button key={s} type="button" onClick={() => ask(s)} className="rounded-full border border-neutral-200 px-3 py-1.5 text-xs text-neutral-700 hover:border-rose-300">
                      {s}
                    </button>
                  ))}
                </div>
              )}
              {messages.map((m, i) => (
                <div key={i} className={cn("flex flex-col gap-2", m.role === "user" ? "items-end" : "items-start")}>
                  {(m.content || m.role === "user") && (
                    <div className={cn("max-w-[88%] rounded-2xl p-3", m.role === "user" ? "rounded-se-sm bg-neutral-900 text-white" : "rounded-ss-sm bg-sand-100 text-neutral-800")}>
                      {m.role === "assistant" ? <RichText text={m.content} /> : m.content}
                    </div>
                  )}
                  {m.properties?.map((p) => (
                    <a key={p.slug} href={p.url} className="block w-[88%] rounded-2xl p-3 ring-1 ring-neutral-200 hover:ring-rose-300">
                      <p className="font-semibold text-neutral-900">{p.price_aed ? formatMoney(p.price_aed, "AED", locale) : ""}</p>
                      <p className="line-clamp-2 text-neutral-700">{p.title}</p>
                      <p className="text-xs text-neutral-500">{p.community}</p>
                    </a>
                  ))}
                  {m.actions && (
                    <div className="flex flex-wrap gap-2">
                      {m.actions.map((a) => (
                        <a
                          key={a.kind}
                          href={a.url}
                          target={a.kind === "whatsapp" ? "_blank" : undefined}
                          rel="noopener noreferrer"
                          className={cn(
                            "inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold",
                            a.kind === "booking" ? "bg-neutral-900 text-white" : "bg-[#25D366] text-white",
                          )}
                        >
                          {a.kind === "booking" ? <CalendarCheck className="h-3.5 w-3.5" /> : <MessageCircle className="h-3.5 w-3.5" />}
                          {a.kind === "booking" ? t("bookCta") : t("whatsappCta")}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              {status && <p className="animate-pulse text-xs text-neutral-500">{status}</p>}
            </div>

            <form onSubmit={submit} className="border-t border-neutral-200 p-3">
              <div className="flex items-end gap-2">
                <label htmlFor="concierge-input" className="sr-only">
                  {t("placeholder")}
                </label>
                <textarea
                  id="concierge-input"
                  rows={1}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault()
                      ask(input)
                    }
                  }}
                  placeholder={t("placeholder")}
                  maxLength={2000}
                  className="max-h-32 min-h-11 flex-1 resize-none rounded-2xl border border-neutral-200 px-3 py-2.5 text-sm outline-none focus:border-rose-300"
                />
                <button type="button" onClick={toggleVoice} aria-pressed={listening} aria-label={t("voice")} className={cn("rounded-full p-2.5", listening ? "bg-rose-500 text-white" : "text-neutral-600 hover:bg-neutral-100")}>
                  {listening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                </button>
                <button type="submit" disabled={busy || !input.trim()} aria-label={t("send")} className="rounded-full bg-neutral-900 p-2.5 text-white disabled:opacity-40">
                  <Send className="h-4 w-4 rtl:-scale-x-100" />
                </button>
              </div>
              <p className="mt-2 text-[11px] text-neutral-400">{t("disclaimer")}</p>
            </form>
          </motion.section>
        )}
      </AnimatePresence>
    </>
  )
}
