import "server-only"
import type Anthropic from "@anthropic-ai/sdk"
import { createHash } from "node:crypto"
import { adminClient } from "@/lib/supabase/admin"
import { aiConfigured, logRun, MODELS, structured } from "@/lib/ai/client"

// Verified Listing (our TruCheck): Claude looks at every photo for duplicates,
// watermarks, stock imagery and whether the rooms shown match the listing.
// The result is stored on the listing; an advisor confirms before the badge shows.

export type Verification = {
  checked_at: string
  photo_count: number
  exact_duplicates: number
  verdict: "pass" | "review" | "fail"
  issues: string[]
  rooms_seen: { bedrooms: number | null; bathrooms: number | null }
  watermarks: boolean
  looks_like_stock_or_render: boolean
  quality: "good" | "fair" | "poor"
}

export async function verifyListing(propertyId: string): Promise<Verification> {
  if (!aiConfigured) throw new Error("Photo checks need ANTHROPIC_API_KEY")
  const supabase = adminClient()
  const { data: p, error } = await supabase.from("properties").select("id, slug, beds, baths, type, images").eq("id", propertyId).single()
  if (error || !p) throw new Error(error?.message ?? "Listing not found")
  const images = ((p.images as { src: string }[]) ?? []).slice(0, 20)
  if (!images.length) throw new Error("Add photos first.")

  // Byte-identical duplicates, found without AI.
  const hashes = await Promise.all(
    images.map(async (img) => {
      try {
        const buffer = Buffer.from(await (await fetch(img.src)).arrayBuffer())
        return createHash("sha1").update(buffer).digest("hex")
      } catch {
        return img.src
      }
    }),
  )
  const exactDuplicates = hashes.length - new Set(hashes).size

  const content: Anthropic.ContentBlockParam[] = [
    ...images.map((img) => ({ type: "image" as const, source: { type: "url" as const, url: img.src } })),
    { type: "text", text: `Listing: ${p.type}, ${p.beds} bedrooms, ${p.baths} bathrooms. Check these ${images.length} photos.` },
  ]
  const { value, usage } = await structured<Omit<Verification, "checked_at" | "photo_count" | "exact_duplicates">>({
    model: MODELS.chat,
    system:
      "You verify real-estate listing photos for a Dubai broker. Flag: visible watermarks or other agencies' logos, stock photos or CGI renders presented as the actual unit, near-duplicate photos, rooms that contradict the stated bedroom/bathroom count, and poor quality. Be factual and brief. verdict: pass (publishable), review (a human should look), fail (misleading).",
    messages: [{ role: "user", content }],
    name: "photo_check",
    description: "Result of the listing photo verification",
    schema: {
      type: "object",
      properties: {
        verdict: { type: "string", enum: ["pass", "review", "fail"] },
        issues: { type: "array", items: { type: "string" } },
        rooms_seen: {
          type: "object",
          properties: { bedrooms: { type: ["integer", "null"] }, bathrooms: { type: ["integer", "null"] } },
          required: ["bedrooms", "bathrooms"],
        },
        watermarks: { type: "boolean" },
        looks_like_stock_or_render: { type: "boolean" },
        quality: { type: "string", enum: ["good", "fair", "poor"] },
      },
      required: ["verdict", "issues", "rooms_seen", "watermarks", "looks_like_stock_or_render", "quality"],
    },
    maxTokens: 1500,
  })

  const verification: Verification = {
    ...value,
    checked_at: new Date().toISOString(),
    photo_count: images.length,
    exact_duplicates: exactDuplicates,
    verdict: exactDuplicates > 0 && value.verdict === "pass" ? "review" : value.verdict,
    issues: exactDuplicates ? [`${exactDuplicates} identical photo(s)`, ...value.issues] : value.issues,
  }
  await supabase.from("properties").update({ verification, verified_at: null }).eq("id", propertyId)
  await logRun({ agent: "verified-listing", trigger: "admin", status: "ok", summary: `${p.slug}: ${verification.verdict}`, output: verification, usage })
  return verification
}
