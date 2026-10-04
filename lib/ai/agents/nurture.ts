import "server-only"
import { localeNames, locales, type Locale } from "@/i18n/locales"
import { adminClient, adminConfigured } from "@/lib/supabase/admin"
import { aiConfigured, logRun, MODELS, structured } from "@/lib/ai/client"
import { runTool } from "@/lib/ai/tools"

type Draft = { score: number; reasoning: string; subject: string; body: string }

/**
 * Lead Nurture: scores a new lead and drafts a personal follow-up in the lead's
 * language, with matching listings. Drafts wait in the admin for an advisor to
 * edit and send: nothing goes out automatically.
 */
export async function nurtureLead(leadId: string) {
  if (!adminConfigured || !aiConfigured) return
  const supabase = adminClient()
  const { data: lead } = await supabase.from("leads").select("*").eq("id", leadId).single()
  if (!lead || lead.kind === "newsletter") return

  const locale: Locale = (locales as readonly string[]).includes(lead.locale) ? lead.locale : "en"
  const matches = await runTool("search_properties", { sort: "featured", limit: 4 }, { locale })
  try {
    const { value, usage } = await structured<Draft>({
      model: MODELS.chat,
      system: [
        "You are a Buildcaps Real Estate advisor in Dubai drafting a first follow-up to a website lead.",
        `Write in ${localeNames[locale]}. Warm, precise, short (under 150 words). Reference what they asked. Offer one or two relevant listings by name and link, and a free strategy call.`,
        "Never promise returns; yields are estimates. Score 0–100 for intent and fit (budget, timeline, specificity).",
      ].join("\n"),
      messages: [{ role: "user", content: JSON.stringify({ lead, candidate_listings: matches }) }],
      name: "draft_followup",
      description: "Lead score and a follow-up email draft",
      schema: {
        type: "object",
        properties: {
          score: { type: "integer", minimum: 0, maximum: 100 },
          reasoning: { type: "string", description: "One line, English, for the advisor" },
          subject: { type: "string" },
          body: { type: "string" },
        },
        required: ["score", "reasoning", "subject", "body"],
      },
      maxTokens: 1200,
    })
    await supabase.from("lead_followups").insert({ lead_id: leadId, score: value.score, reasoning: value.reasoning, subject: value.subject, body: value.body })
    // The CRM keeps the highest score the person has earned.
    if (lead.contact_id) {
      const { data: contact } = await supabase.from("contacts").select("score").eq("id", lead.contact_id).single()
      if (contact && (contact.score === null || value.score > contact.score)) await supabase.from("contacts").update({ score: value.score }).eq("id", lead.contact_id)
    }
    await logRun({ agent: "lead-nurture", trigger: "new-lead", status: "ok", summary: `${lead.email}: ${value.score}`, usage })
  } catch (error) {
    await logRun({ agent: "lead-nurture", trigger: "new-lead", status: "error", error: String(error) })
  }
}
