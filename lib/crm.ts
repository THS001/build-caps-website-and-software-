// CRM vocabulary shared by the admin pages (client-safe).

export const STAGES = [
  { key: "new", label: "New", tone: "bg-sky-50 text-sky-800 ring-sky-200" },
  { key: "contacted", label: "Contacted", tone: "bg-indigo-50 text-indigo-800 ring-indigo-200" },
  { key: "qualified", label: "Qualified", tone: "bg-violet-50 text-violet-800 ring-violet-200" },
  { key: "meeting", label: "Meeting", tone: "bg-amber-50 text-amber-800 ring-amber-200" },
  { key: "negotiation", label: "Negotiation", tone: "bg-rose-50 text-rose-800 ring-rose-200" },
  { key: "won", label: "Won", tone: "bg-emerald-50 text-emerald-800 ring-emerald-200" },
  { key: "lost", label: "Lost", tone: "bg-neutral-100 text-neutral-600 ring-neutral-200" },
] as const

export type Stage = (typeof STAGES)[number]["key"]
export const stageLabel = (s: string) => STAGES.find((x) => x.key === s)?.label ?? s
export const stageTone = (s: string) => STAGES.find((x) => x.key === s)?.tone ?? "bg-neutral-100 text-neutral-700 ring-neutral-200"

export const ACTIVITY_LABELS: Record<string, string> = {
  lead: "Enquiry",
  booking: "Booked",
  meeting: "Meeting",
  note: "Note",
  call: "Call",
  email: "Email",
  whatsapp: "WhatsApp",
  stage: "Stage",
  task: "Task done",
  system: "System",
}

export const PURPOSES = [
  { key: "strategy", label: "Strategy call" },
  { key: "viewing", label: "Viewing" },
  { key: "valuation", label: "Valuation" },
  { key: "mortgage", label: "Mortgage" },
  { key: "goldenVisa", label: "Golden Visa" },
] as const

export const MODES = [
  { key: "office", label: "At the office" },
  { key: "video", label: "Video call" },
  { key: "onsite", label: "On site" },
  { key: "whatsapp", label: "WhatsApp call" },
] as const

export const SOURCES = ["manual", "phone", "walk-in", "referral", "event", "portal", "social", "whatsapp"] as const

/** A stable colour per advisor for the calendar. */
const PALETTE = ["#b76e79", "#004274", "#2f855a", "#b7791f", "#6b46c1", "#c05621", "#2c7a7b", "#97266d"]
export function advisorColor(slug: string, all: string[]) {
  const i = Math.max(0, all.indexOf(slug))
  return PALETTE[i % PALETTE.length]
}

/** The Dubai calendar date (YYYY-MM-DD) of an instant; Dubai is UTC+4 all year. */
export const dubaiDate = (iso: string) => new Date(new Date(iso).getTime() + 4 * 3600_000).toISOString().slice(0, 10)

export const dubaiFormat = (iso: string, opts: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Dubai", ...opts }).format(new Date(iso))

/** "3h ago", "in 2 days". */
export function relative(iso: string, now = Date.now()) {
  const diff = new Date(iso).getTime() - now
  const abs = Math.abs(diff)
  const unit = abs < 3600_000 ? [Math.round(abs / 60_000), "min"] : abs < 86_400_000 ? [Math.round(abs / 3600_000), "h"] : [Math.round(abs / 86_400_000), abs < 2 * 86_400_000 ? "day" : "days"]
  return diff < 0 ? `${unit[0]} ${unit[1]} ago` : `in ${unit[0]} ${unit[1]}`
}
