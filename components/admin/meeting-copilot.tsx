"use client"

import { useEffect, useRef, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Check, Copy, Loader2, Mail, MessageCircle, Mic, MicOff, Sparkles } from "lucide-react"
import { prepareBrief, saveMeetingOutcome, summariseMeetingNotes } from "@/app/[locale]/admin/crm-actions"
import type { MeetingOutcome } from "@/lib/ai/agents/copilot"
import { STAGES } from "@/lib/crm"
import { cn } from "@/lib/utils"
import { unwrap } from "@/lib/action-result"

type Props = {
  id: string
  status: string
  startsAt: string
  brief: string | null
  outcome: MeetingOutcome | null
  client: { name: string; email: string; phone: string }
}

/** Browser dictation (Chrome, Edge, Safari): free, nothing leaves the browser except the final text. */
type Recognition = { lang: string; continuous: boolean; interimResults: boolean; start(): void; stop(): void; onresult: ((e: { resultIndex: number; results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => void) | null; onend: (() => void) | null; onerror: (() => void) | null }
function speechRecognition(): (new () => Recognition) | null {
  if (typeof window === "undefined") return null
  const w = window as unknown as { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

function CopyButton({ text }: { text: string }) {
  const [done, setDone] = useState(false)
  return (
    <button
      type="button"
      onClick={() => navigator.clipboard.writeText(text).then(() => (setDone(true), setTimeout(() => setDone(false), 1500)))}
      className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs ring-1 ring-neutral-200 hover:bg-neutral-50"
    >
      {done ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />} {done ? "Copied" : "Copy"}
    </button>
  )
}

function SendLinks({ client, subject, body }: { client: Props["client"]; subject: string; body: string }) {
  const wa = client.phone.replace(/\D/g, "")
  return (
    <div className="mt-2 flex flex-wrap gap-2">
      <CopyButton text={body} />
      {wa && (
        <a href={`https://wa.me/${wa}?text=${encodeURIComponent(body)}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white">
          <MessageCircle className="h-3.5 w-3.5" /> Open in WhatsApp
        </a>
      )}
      <a href={`mailto:${client.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`} className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs ring-1 ring-neutral-200 hover:bg-neutral-50">
        <Mail className="h-3.5 w-3.5" /> Open in email
      </a>
    </div>
  )
}

/** Advisor Copilot on an appointment: the brief before, the summary after. */
export function MeetingCopilot({ id, status, startsAt, brief, outcome, client }: Props) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [notes, setNotes] = useState("")
  const [draft, setDraft] = useState<MeetingOutcome | null>(null)
  const [keep, setKeep] = useState<boolean[]>([])
  const [error, setError] = useState<string | null>(null)
  const [listening, setListening] = useState(false)
  const [canDictate, setCanDictate] = useState(false)
  const rec = useRef<Recognition | null>(null)
  useEffect(() => setCanDictate(Boolean(speechRecognition())), [])
  useEffect(() => () => rec.current?.stop(), [])

  const run = (fn: () => Promise<void>) =>
    start(async () => {
      setError(null)
      try {
        await fn()
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong.")
      }
    })

  const dictate = () => {
    if (listening) return rec.current?.stop()
    const Ctor = speechRecognition()
    if (!Ctor) return
    const r = new Ctor()
    r.lang = navigator.language || "en-GB"
    r.continuous = true
    r.interimResults = false
    r.onresult = (e) => {
      let text = ""
      for (let i = e.resultIndex; i < e.results.length; i++) if (e.results[i].isFinal) text += e.results[i][0].transcript
      if (text) setNotes((n) => `${n}${n && !n.endsWith(" ") ? " " : ""}${text.trim()}`)
    }
    r.onend = () => setListening(false)
    r.onerror = () => setListening(false)
    rec.current = r
    r.start()
    setListening(true)
  }

  const started = new Date(startsAt).getTime() <= Date.now() + 15 * 60_000
  const showAfter = !outcome && (status === "completed" || (status === "confirmed" && started))

  return (
    <div className="mt-5 space-y-5 border-t border-neutral-100 pt-5 text-sm">
      {/* Before: the brief */}
      {status !== "cancelled" && (
        <section>
          <div className="flex items-center justify-between gap-2">
            <h3 className="flex items-center gap-1.5 font-semibold text-neutral-900">
              <Sparkles className="h-4 w-4 text-rose-500" /> Meeting brief
            </h3>
            <button type="button" disabled={pending} onClick={() => run(async () => (await unwrap(prepareBrief(id)), router.refresh()))} className="text-xs font-semibold text-rose-700 hover:underline disabled:opacity-50">
              {brief ? "Refresh" : "Prepare brief"}
            </button>
          </div>
          {brief ? <p className="mt-2 whitespace-pre-line rounded-xl bg-sand-100 p-3 text-neutral-800">{brief}</p> : <p className="mt-1 text-xs text-neutral-500">Who they are, what they want, what to watch for and questions to ask. Sent automatically 30 minutes before when email is set up.</p>}
        </section>
      )}

      {/* After: notes → summary */}
      {showAfter && !draft && (
        <section>
          <h3 className="font-semibold text-neutral-900">After the meeting</h3>
          <p className="mt-1 text-xs text-neutral-500">Type or dictate rough notes. Copilot writes the CRM summary, next steps and a follow-up in the client&apos;s language for you to check.</p>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={5} placeholder="e.g. Wants 2-bed in Marina or JLT, cash, around 2.2M, moving in spring. Liked the Marina Gate unit but worried about service charges. Send 3 options with views by Thursday." className="admin-input mt-2 h-auto py-2" />
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {canDictate && (
              <button type="button" onClick={dictate} className={cn("inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs ring-1", listening ? "bg-red-50 text-red-700 ring-red-200" : "ring-neutral-200 hover:bg-neutral-50")}>
                {listening ? <MicOff className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />} {listening ? "Stop dictation" : "Dictate"}
              </button>
            )}
            <button
              type="button"
              disabled={pending || notes.trim().length < 20}
              onClick={() =>
                run(async () => {
                  const result = await unwrap(summariseMeetingNotes(id, notes))
                  setDraft(result)
                  setKeep(result.nextSteps.map(() => true))
                })
              }
              className="inline-flex items-center gap-1.5 rounded-full bg-neutral-900 px-4 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
            >
              {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />} Summarise
            </button>
          </div>
        </section>
      )}

      {draft && (
        <section className="space-y-3 rounded-xl bg-neutral-50 p-3">
          <h3 className="font-semibold text-neutral-900">Check and save</h3>
          <label className="block">
            <span className="text-xs font-medium text-neutral-600">Summary for the timeline</span>
            <textarea value={draft.summary} onChange={(e) => setDraft({ ...draft, summary: e.target.value })} rows={4} className="admin-input mt-1 h-auto py-2" />
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label>
              <span className="text-xs font-medium text-neutral-600">Temperature</span>
              <select value={draft.temperature} onChange={(e) => setDraft({ ...draft, temperature: e.target.value as MeetingOutcome["temperature"] })} className="admin-input mt-1">
                <option value="hot">Hot</option>
                <option value="warm">Warm</option>
                <option value="cold">Cold</option>
              </select>
            </label>
            <label>
              <span className="text-xs font-medium text-neutral-600">Move stage to</span>
              <select value={draft.stage ?? ""} onChange={(e) => setDraft({ ...draft, stage: (e.target.value || null) as MeetingOutcome["stage"] })} className="admin-input mt-1">
                <option value="">Leave as is</option>
                {STAGES.filter((s) => s.key !== "new" && s.key !== "contacted").map((s) => (
                  <option key={s.key} value={s.key}>
                    {s.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {(draft.needs.budgetAed || draft.needs.areas.length > 0 || draft.needs.timing || draft.needs.financing) && (
            <p className="text-xs text-neutral-600">
              Heard: {[draft.needs.budgetAed ? `AED ${draft.needs.budgetAed.toLocaleString("en")}` : null, ...draft.needs.areas, ...draft.needs.propertyTypes, draft.needs.timing, draft.needs.financing].filter(Boolean).join(" · ")}
            </p>
          )}
          {draft.nextSteps.length > 0 && (
            <fieldset>
              <legend className="text-xs font-medium text-neutral-600">Tasks to create</legend>
              <ul className="mt-1 space-y-1.5">
                {draft.nextSteps.map((n, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <input type="checkbox" checked={keep[i] ?? true} onChange={(e) => setKeep(keep.map((k, j) => (j === i ? e.target.checked : k)))} aria-label="Create this task" />
                    <input value={n.title} onChange={(e) => setDraft({ ...draft, nextSteps: draft.nextSteps.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)) })} className="admin-input h-8 flex-1" />
                    <span className="shrink-0 text-xs text-neutral-500">in {n.dueInDays}d</span>
                  </li>
                ))}
              </ul>
            </fieldset>
          )}
          <label className="block">
            <span className="text-xs font-medium text-neutral-600">Follow-up to the client (sent by you, not automatically)</span>
            <input value={draft.followup.subject} onChange={(e) => setDraft({ ...draft, followup: { ...draft.followup, subject: e.target.value } })} className="admin-input mt-1" aria-label="Subject" />
            <textarea value={draft.followup.body} onChange={(e) => setDraft({ ...draft, followup: { ...draft.followup, body: e.target.value } })} rows={6} className="admin-input mt-1 h-auto py-2" />
          </label>
          <SendLinks client={client} subject={draft.followup.subject} body={draft.followup.body} />
          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              disabled={pending}
              onClick={() =>
                run(async () => {
                  await unwrap(saveMeetingOutcome(id, { ...draft, nextSteps: draft.nextSteps.filter((_, i) => keep[i] ?? true) }))
                  setDraft(null)
                  setNotes("")
                  router.refresh()
                })
              }
              className="inline-flex items-center gap-1.5 rounded-full bg-neutral-900 px-4 py-2 text-xs font-semibold text-white disabled:opacity-50"
            >
              {pending && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Save to CRM
            </button>
            <button type="button" onClick={() => setDraft(null)} className="text-xs text-neutral-500 hover:text-neutral-900">
              Back to notes
            </button>
          </div>
        </section>
      )}

      {outcome && (
        <section>
          <h3 className="font-semibold text-neutral-900">
            Outcome <span className="ms-1 rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-normal capitalize">{outcome.temperature}</span>
          </h3>
          <p className="mt-2 whitespace-pre-line text-neutral-800">{outcome.summary}</p>
          <details className="mt-2">
            <summary className="cursor-pointer text-xs font-semibold text-neutral-700">Follow-up message</summary>
            <p className="mt-2 text-xs font-medium text-neutral-600">{outcome.followup.subject}</p>
            <p className="mt-1 whitespace-pre-line rounded-xl bg-sand-100 p-3 text-neutral-800">{outcome.followup.body}</p>
            <SendLinks client={client} subject={outcome.followup.subject} body={outcome.followup.body} />
          </details>
        </section>
      )}

      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
}
