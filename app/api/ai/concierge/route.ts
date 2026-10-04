import type Anthropic from "@anthropic-ai/sdk"
import { z } from "zod"
import { hasLocale } from "next-intl"
import { routing } from "@/i18n/routing"
import { localeNames, type Locale } from "@/i18n/locales"
import { loadMessages } from "@/i18n/messages"
import { aiConfigured, claude, logRun, MODELS, quick } from "@/lib/ai/client"
import { runTool, toolDefinitions } from "@/lib/ai/tools"
import { SAMPLE_DATA } from "@/lib/data/shared"
import { rateLimited } from "@/lib/security"
import { site, whatsappUrl } from "@/lib/site"

export const dynamic = "force-dynamic"
export const maxDuration = 60

const body = z.object({
  locale: z.string(),
  page: z.string().max(300).optional(),
  messages: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().min(1).max(2000) }))
    .min(1)
    .max(24),
})

function systemPrompt(locale: Locale, page?: string) {
  return [
    `You are the Buildcaps Concierge, the website assistant of Buildcaps Real Estate LLC, a Dubai property investment consultancy (office: Conrad Office Tower, Sheikh Zayed Road; WhatsApp ${site.phones[0].display}).`,
    `Reply in the language the visitor writes in. The site language is ${localeNames[locale]}.`,
    "Voice: precise, calm, warm, like a private banker. Short answers (under 120 words) with short paragraphs or bullet lines. No hype.",
    "Facts: use the tools for listings, prices, costs, availability and FAQs. Never invent a listing, price, yield, permit, developer record or law. If you don't know, say so and offer an advisor.",
    "Money: prices are in AED; you may add an approximate conversion. Yields and returns are always 'estimated' or 'typical', never guaranteed. This is not financial, legal or tax advice; say so when giving numbers.",
    "Goal: understand the visitor's goal, budget, timeline and preferred areas, show matching properties, then offer a free strategy call (booking_link, or check_availability first) or a WhatsApp handoff with a brief (whatsapp_handoff).",
    "Booking: you can't confirm bookings yourself; give the booking link so the visitor picks a time and confirms.",
    "Never ask for passport numbers, card details or passwords.",
    SAMPLE_DATA ? "Note: the site is in preview and listings are sample data; mention this if the visitor asks to buy a specific unit." : "",
    page ? `The visitor is on this page: ${page}` : "",
  ]
    .filter(Boolean)
    .join("\n")
}

type Event =
  | { type: "text"; text: string }
  | { type: "tool"; name: string }
  | { type: "properties"; items: unknown[] }
  | { type: "action"; kind: "booking" | "whatsapp"; url: string }
  | { type: "done" }
  | { type: "error"; message: string }

export async function POST(request: Request) {
  const parsed = body.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return Response.json({ error: "invalid" }, { status: 400 })
  const locale: Locale = hasLocale(routing.locales, parsed.data.locale) ? parsed.data.locale : "en"
  if (await rateLimited("concierge", 30, 10 * 60_000)) return Response.json({ error: "rate_limited" }, { status: 429 })

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      const send = (e: Event) => controller.enqueue(encoder.encode(JSON.stringify(e) + "\n"))

      if (!aiConfigured) {
        // No AI key yet: still useful, never a dead end.
        const m = (await loadMessages(locale)) as { ai: { concierge: { offline: string } }; whatsapp: { prefill: string } }
        send({ type: "text", text: m.ai.concierge.offline })
        send({ type: "action", kind: "booking", url: "/book" })
        send({ type: "action", kind: "whatsapp", url: whatsappUrl(m.whatsapp.prefill) })
        send({ type: "done" })
        controller.close()
        return
      }

      const messages: Anthropic.MessageParam[] = parsed.data.messages.map((m) => ({ role: m.role, content: m.content }))
      const tools = toolDefinitions()
      let usage = { input_tokens: 0, output_tokens: 0 }
      try {
        for (let turn = 0; turn < 6; turn++) {
          const response = claude().messages.stream({
            model: MODELS.chat,
            max_tokens: 1200,
            ...quick(MODELS.chat),
            system: [{ type: "text", text: systemPrompt(locale, parsed.data.page), cache_control: { type: "ephemeral" } }],
            messages,
            tools,
          })
          response.on("text", (text) => send({ type: "text", text }))
          const final = await response.finalMessage()
          usage = { input_tokens: usage.input_tokens + final.usage.input_tokens, output_tokens: usage.output_tokens + final.usage.output_tokens }
          if (final.stop_reason !== "tool_use") break

          messages.push({ role: "assistant", content: final.content })
          const results: Anthropic.ToolResultBlockParam[] = []
          for (const block of final.content) {
            if (block.type !== "tool_use") continue
            send({ type: "tool", name: block.name })
            const result = (await runTool(block.name, block.input, { locale })) as Record<string, unknown>
            if (block.name === "search_properties" && Array.isArray(result.results)) send({ type: "properties", items: result.results.slice(0, 3) })
            if (block.name === "booking_link" && typeof result.url === "string") send({ type: "action", kind: "booking", url: result.url })
            if (block.name === "whatsapp_handoff" && typeof result.url === "string") send({ type: "action", kind: "whatsapp", url: result.url })
            results.push({ type: "tool_result", tool_use_id: block.id, content: JSON.stringify(result).slice(0, 12_000) })
          }
          messages.push({ role: "user", content: results })
          send({ type: "text", text: "\n\n" })
        }
        send({ type: "done" })
        await logRun({ agent: "concierge", trigger: "chat", status: "ok", summary: parsed.data.messages.at(-1)?.content.slice(0, 200), usage })
      } catch (error) {
        const message = error instanceof Error ? error.message : "AI error"
        await logRun({ agent: "concierge", trigger: "chat", status: "error", error: message, usage })
        send({ type: "error", message: "unavailable" })
      }
      controller.close()
    },
  })

  return new Response(stream, { headers: { "content-type": "application/x-ndjson; charset=utf-8", "cache-control": "no-store" } })
}
