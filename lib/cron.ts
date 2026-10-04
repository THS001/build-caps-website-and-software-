import "server-only"
import type { NextRequest } from "next/server"

/**
 * Scheduled jobs are plain GET endpoints guarded by CRON_SECRET, so any scheduler
 * can call them (Vercel Cron sends "Authorization: Bearer <CRON_SECRET>").
 */
export function authorizedCron(request: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret) return process.env.NODE_ENV !== "production"
  return request.headers.get("authorization") === `Bearer ${secret}` || request.nextUrl.searchParams.get("secret") === secret
}
