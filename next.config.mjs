import path from "node:path"
import { legacyRedirects } from "./lib/redirects.mjs"

// next-intl's own plugin (createNextIntlPlugin) eagerly loads @swc/core for its
// optional message extractor, and that native binary refuses to run on this
// machine's folder permissions. All we need from the plugin is this alias.
const requestConfig = "./i18n/request.ts"
const dev = process.env.NODE_ENV !== "production"

// Content Security Policy: exactly the third parties the site uses. Analytics and
// pixels only load after cookie consent, but their hosts are allowed here.
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${dev ? " 'unsafe-eval'" : ""} https://www.googletagmanager.com https://www.clarity.ms https://scripts.clarity.ms https://connect.facebook.net https://analytics.tiktok.com https://challenges.cloudflare.com https://unpkg.com https://va.vercel-scripts.com`,
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  "img-src 'self' data: blob: https:",
  "media-src 'self' blob: https:",
  `connect-src 'self'${dev ? " ws: http://localhost:*" : ""} https://*.supabase.co wss://*.supabase.co https://tiles.openfreemap.org https://unpkg.com https://www.google-analytics.com https://*.google-analytics.com https://*.analytics.google.com https://www.googletagmanager.com https://*.clarity.ms https://c.bing.com https://connect.facebook.net https://www.facebook.com https://analytics.tiktok.com https://*.tiktok.com https://challenges.cloudflare.com https://vitals.vercel-insights.com`,
  "worker-src 'self' blob:",
  "frame-src https://challenges.cloudflare.com https://www.youtube-nocookie.com",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
  ...(dev ? [] : ["upgrade-insecure-requests"]),
].join("; ")

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Microphone stays available to the site itself for the Concierge's voice input.
  { key: "Permissions-Policy", value: "camera=(), geolocation=(), microphone=(self), payment=(), usb=(), browsing-topics=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  ...(dev ? [] : [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" }]),
]

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Brochure PDFs (Listing Ops) are uploaded through a server action.
    serverActions: { bodySizeLimit: "26mb" },
    // Lower peak memory while compiling (this machine has 6 GB of RAM).
    webpackMemoryOptimizations: true,
    // NEXT_BUILD_CPUS=1 builds with a single worker on low-memory machines.
    ...(process.env.NEXT_BUILD_CPUS ? { cpus: Number(process.env.NEXT_BUILD_CPUS) } : {}),
  },
  // Dev server: drop compiled pages that haven't been opened for a while
  // instead of keeping every visited route in memory.
  onDemandEntries: { maxInactiveAge: 20_000, pagesBufferLength: 2 },
  poweredByHeader: false,
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      // Listing photos, floor plans and QR codes uploaded through the admin.
      { protocol: "https", hostname: "*.supabase.co", pathname: "/storage/v1/object/public/**" },
    ],
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }]
  },
  // Old buildcaps.com (WordPress) URLs → their new homes, so rankings carry over.
  async redirects() {
    return legacyRedirects
  },
  turbopack: {
    resolveAlias: { "next-intl/config": requestConfig },
  },
  webpack(config) {
    config.resolve.alias["next-intl/config"] = path.resolve(requestConfig)
    return config
  },
}

export default nextConfig
