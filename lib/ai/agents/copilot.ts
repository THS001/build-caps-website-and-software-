import "server-only"
import { adminClient, adminConfigured } from "@/lib/supabase/admin"
import { aiConfigured, claude, logRun, MODELS, quick, structured, textOf } from "@/lib/ai/client"
import { localeNames, locales, type Locale } from "@/i18n/locales"
import { runTool } from "@/lib/ai/tools"
import { sendEmail, teamInbox } from "@/lib/email/send"
import { renderEmail } from "@/lib/email/templates"
import type { AdvisorContact, Appointment } from "@/lib/booking/notify"

/**
 * Advisor Copilot: about 30 minutes before each meeting, the advisor gets a brief
 * (who, what they want, the property, past enquiries, suggested questions and
 * listings). Runs from the booking cron. Returns how many briefs were sent.
 */
export async function sendAdvisorBriefs(advisors: Map<string, AdvisorContact>) {
  if (!adminConfigured) return 0
  const supabase = adminClient()
  const now = Date.now()
  const { data } = await supabase
    .from("appointments")
    .select("*")
    .eq("status", "confirmed")
    .is("brief_sent_at", null)
    .gte("starts_at", new Date(now + 20 * 60_000).toISOString())
    .lte("starts_at", new Date(now + 45 * 60_000).toISOString())
    .limit(20)

  let sent = 0
  for (const appt of (data ?? []) as Appointment[]) {
    const { data: claimed } = await supabase.from("appointments").update({ brief_sent_at: new Date().toISOString() }).eq("id", appt.id).is("brief_sent_at", null).select("id")
    if (!claimed?.length) continue
    const advisor = advisors.get(appt.agent_slug)
    const brief = await writeBrief(appt)
    // Kept on the appointment too, so the admin shows it even without email.
    await supabase.from("appointments").update({ brief }).eq("id", appt.id)
    const when = new Intl.DateTimeFormat("en-GB", { timeStyle: "short", timeZone: "Asia/Dubai" }).format(new Date(appt.starts_at))
    const { html, text } = await renderEmail({
      locale: "en",
      preheader: `Brief: ${appt.name} at ${when}`,
      heading: `Your ${when} meeting: ${appt.name}`,
      paragraphs: brief.split(/\n{2,}/),
      details: [
        { label: "Purpose / mode", value: `${appt.purpose} · ${appt.mode}` },
        { label: "Language", value: appt.language },
        { label: "Phone / WhatsApp", value: appt.phone, href: `https://wa.me/${appt.phone.replace(/\D/g, "")}` },
        ...(appt.meeting_url ? [{ label: "Meeting link", value: appt.meeting_url, href: appt.meeting_url }] : []),
      ],
    })
    if (await sendEmail({ to: advisor?.email ?? teamInbox, subject: `Brief: ${appt.name} at ${when} (Dubai)`, html, text })) sent++
  }
  return sent
}

export async function writeBrief(appt: Appointment) {
  const supabase = adminClient()
  const [{ data: leads }, property] = await Promise.all([
    supabase.from("leads").select("created_at, kind, interest, message, source, country").eq("email", appt.email).order("created_at", { ascending: false }).limit(10),
    appt.property_slug ? runTool("get_property", { slug: appt.property_slug }, { locale: "en" }) : Promise.resolve(null),
  ])
  const facts = {
    client: { name: appt.name, language: appt.language, timezone: appt.timezone, notes: appt.notes },
    appointment: { purpose: appt.purpose, mode: appt.mode },
    property_of_interest: property,
    previous_enquiries: leads ?? [],
  }
  const plain = [
    `${appt.name} booked a ${appt.purpose} (${appt.mode}). Language: ${appt.language}.`,
    appt.notes ? `Their note: "${appt.notes}"` : "",
    property && typeof property === "object" && "title" in property
      ? `Property: ${(property as unknown as { title: string; url: string }).title} ${(property as unknown as { title: string; url: string }).url}`
      : "",
    leads?.length ? `Previous enquiries: ${leads.length}.` : "",
  ]
    .filter(Boolean)
    .join("\n\n")
  if (!aiConfigured) return plain

  try {
    const response = await claude().messages.create({
      model: MODELS.chat,
      max_tokens: 700,
      ...quick(MODELS.chat),
      system:
        "You brief a Dubai real estate advisor before a client meeting. Plain text, under 180 words, three short sections: 'Who and why', 'Watch for' (objections, unknowns), 'Suggested questions and listings'. Use only the facts given; never invent numbers.",
      messages: [{ role: "user", content: JSON.stringify(facts) }],
    })
    await logRun({ agent: "advisor-copilot", trigger: "pre-meeting", status: "ok", summary: appt.reference, usage: response.usage })
    return textOf(response) || plain
  } catch (error) {
    await logRun({ agent: "advisor-copilot", trigger: "pre-meeting", status: "error", error: String(error) })
    return plain
  }
}

/* ── After the meeting ────────────────────────────────────────────────── */

export type MeetingOutcome = {
  summary: string
  temperature: "hot" | "warm" | "cold"
  needs: { budgetAed: number | null; areas: string[]; propertyTypes: string[]; timing: string | null; financing: string | null }
  nextSteps: { title: string; dueInDays: number }[]
  stage: "qualified" | "meeting" | "negotiation" | "won" | "lost" | null
  followup: { subject: string; body: string }
}

const outcomeSchema = {
  type: "object",
  properties: {
    summary: { type: "string", description: "What was discussed and agreed, 3 to 5 sentences, for the CRM timeline" },
    temperature: { type: "string", enum: ["hot", "warm", "cold"], description: "How ready the client is to act" },
    needs: {
      type: "object",
      properties: {
        budgetAed: { type: ["number", "null"], description: "Budget in AED if stated, else null" },
        areas: { type: "array", items: { type: "string" }, description: "Communities or areas mentioned" },
        propertyTypes: { type: "array", items: { type: "string" } },
        timing: { type: ["string", "null"] },
        financing: { type: ["string", "null"], description: "Cash, mortgage, payment plan, if mentioned" },
      },
      required: ["budgetAed", "areas", "propertyTypes", "timing", "financing"],
    },
    nextSteps: {
      type: "array",
      maxItems: 5,
      items: { type: "object", properties: { title: { type: "string" }, dueInDays: { type: "integer", minimum: 0, maximum: 60 } }, required: ["title", "dueInDays"] },
      description: "Concrete follow-ups for the advisor, most urgent first",
    },
    stage: { type: ["string", "null"], enum: ["qualified", "meeting", "negotiation", "won", "lost", null], description: "Suggested CRM stage, or null to leave it" },
    followup: {
      type: "object",
      properties: { subject: { type: "string" }, body: { type: "string", description: "Message to the client, plain text, under 150 words, signed with the advisor's first name" } },
      required: ["subject", "body"],
    },
  },
  required: ["summary", "temperature", "needs", "nextSteps", "stage", "followup"],
} as const

/**
 * Advisor Copilot, after the meeting: the advisor's rough notes (typed or
 * dictated) become a CRM summary, next steps and a follow-up message in the
 * client's language. Nothing is saved or sent until the advisor approves.
 */
export async function summariseMeeting(input: { appt: Appointment; notes: string; advisorName: string; contact: { stage: string; budget_aed: number | null; interests: string[] } | null }): Promise<MeetingOutcome> {
  const lang = (locales as readonly string[]).includes(input.appt.language) ? (input.appt.language as Locale) : "en"
  const { value, usage } = await structured<MeetingOutcome>({
    model: MODELS.chat,
    system: [
      "You are the Advisor Copilot at Buildcaps, a Dubai real estate brokerage. Turn an advisor's rough meeting notes into a CRM record.",
      "Use only what the notes and facts say; never invent budgets, names, prices or commitments. Unknowns stay null or empty.",
      `Write the summary and next steps in English. Write the follow-up message in ${localeNames[lang]}, warm and professional, referring to what was discussed, signed "${input.advisorName.split(" ")[0]}".`,
    ].join(" "),
    messages: [
      {
        role: "user",
        content: JSON.stringify({
          meeting: { purpose: input.appt.purpose, mode: input.appt.mode, client: input.appt.name, language: lang, bookingNote: input.appt.notes, property: input.appt.property_slug },
          crm: input.contact,
          advisorNotes: input.notes,
        }),
      },
    ],
    name: "meeting_outcome",
    description: "Meeting summary, needs, next steps and follow-up message",
    schema: outcomeSchema as never,
    maxTokens: 2000,
  })
  await logRun({ agent: "advisor-copilot", trigger: "after-meeting", status: "ok", summary: input.appt.reference, usage })
  return {
    ...value,
    nextSteps: (value.nextSteps ?? []).slice(0, 5).map((n) => ({ title: String(n.title).slice(0, 300), dueInDays: Math.min(60, Math.max(0, Math.round(Number(n.dueInDays) || 0))) })),
  }
}
