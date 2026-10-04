import "server-only"
import { timingSafeEqual } from "node:crypto"
import type { NextRequest } from "next/server"
import { adminClient, adminConfigured } from "@/lib/supabase/admin"

/**
 * Scheduled jobs are plain GET endpoints. A caller proves itself with either
 * CRON_SECRET (Vercel Cron sends "Authorization: Bearer <CRON_SECRET>"), or the
 * token the database generated for its own scheduler, sent as x-scheduler-token:
 * pg_cron calls the booking job every 15 minutes, which Vercel's free plan can't
 * (supabase/migrations/20261004000010_scheduler.sql). No secret is copied anywhere.
 */
export async function authorizedCron(request: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (secret && (request.headers.get("authorization") === `Bearer ${secret}` || request.nextUrl.searchParams.get("secret") === secret)) return true
  const presented = request.headers.get("x-scheduler-token")
  if (presented) {
    const token = await schedulerToken()
    if (token && same(presented, token)) return true
  }
  return !secret && process.env.NODE_ENV !== "production"
}

const same = (a: string, b: string) => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b))

// Read with the service role (the table has no policies), kept for five minutes.
let cached: { token: string | null; at: number } | null = null
async function schedulerToken() {
  if (!adminConfigured) return null
  if (cached && Date.now() - cached.at < 5 * 60_000) return cached.token
  const { data } = await adminClient().from("scheduler_settings").select("token").eq("id", true).maybeSingle()
  cached = { token: (data?.token as string | undefined) ?? null, at: Date.now() }
  return cached.token
}
