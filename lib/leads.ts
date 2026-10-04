import "server-only"
import { after } from "next/server"
import { supabaseConfigured } from "@/lib/supabase/config"
import { publicWriteClient } from "@/lib/supabase/public"
import { adminClient, adminConfigured } from "@/lib/supabase/admin"

export type LeadInput = {
  kind: "enquiry" | "newsletter" | "guide" | "report" | "bloc" | "valuation" | "match"
  email: string
  name?: string
  phone?: string
  interest?: string
  message?: string
  country?: string
  locale?: string
  source?: string
}

/**
 * Stores a lead and, after the response is sent, lets the Lead Nurture agent draft
 * a follow-up. Without Supabase there is nowhere to store it, so it reports success
 * in development and failure in production, where a lost lead must never look sent.
 */
export async function saveLead(lead: LeadInput) {
  if (!supabaseConfigured) return process.env.NODE_ENV !== "production"

  if (adminConfigured) {
    const { data, error } = await adminClient().from("leads").insert(lead).select("id").single()
    if (error) {
      console.error("Lead insert failed:", error.message)
      return false
    }
    after(async () => {
      const { nurtureLead } = await import("@/lib/ai/agents/nurture")
      await nurtureLead(data.id)
    })
    return true
  }

  // Anonymous insert (RLS allows insert, never read back).
  const { error } = await publicWriteClient().from("leads").insert(lead)
  if (error) console.error("Lead insert failed:", error.message)
  return !error
}

/** Logs an Opportunities click before the redirect. Never blocks the visitor on failure. */
export async function logFunnelClick(click: { funnelId: string; source?: string; locale?: string; utm: Record<string, string>; referrer?: string }) {
  if (!supabaseConfigured) return
  const { error } = await publicWriteClient()
    .from("funnel_clicks")
    .insert({ funnel_id: click.funnelId, source: click.source?.slice(0, 120), locale: click.locale?.slice(0, 8), utm: click.utm, referrer: click.referrer?.slice(0, 500) })
  if (error) console.error("Click log failed:", error.message)
}
