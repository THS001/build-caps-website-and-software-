import { NextResponse, type NextRequest } from "next/server"
import createMiddleware from "next-intl/middleware"
import { routing } from "./i18n/routing"
import { supabaseConfigured } from "./lib/supabase/config"
import { refreshSession } from "./lib/supabase/middleware"

const intl = createMiddleware(routing)
const ADMIN = /^\/(?:[a-z]{2}\/)?admin(?:\/|$)/
const SETUP = /^\/(?:[a-z]{2}\/)?admin\/setup\/?$/

export default async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  if (ADMIN.test(pathname)) {
    // Until Supabase is configured, every admin URL shows the setup checklist instead.
    if (!supabaseConfigured) return SETUP.test(pathname) ? intl(request) : NextResponse.rewrite(new URL("/en/admin/setup", request.url))
    // Only the admin uses auth cookies; public pages stay cookie-free and cacheable.
    return refreshSession(request, intl(request))
  }
  return intl(request)
}

export const config = {
  // Skip API routes, Next internals, the funnel redirector (/go/…) and static files.
  // The trailing "/" or end anchor keeps pages like /golden-visa localised.
  matcher: ["/((?!api(?:/|$)|go/|_next|_vercel|.*\\..*).*)"],
}
