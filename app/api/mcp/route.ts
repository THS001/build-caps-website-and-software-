import { hasLocale } from "next-intl"
import { routing } from "@/i18n/routing"
import type { Locale } from "@/i18n/locales"
import { runTool, tools } from "@/lib/ai/tools"
import { rateLimited } from "@/lib/security"

// Buildcaps as an MCP server ("connector") for Claude, ChatGPT and other assistants.
// Stateless Streamable HTTP: every POST carries a JSON-RPC message and gets a JSON
// reply; no server-initiated stream (GET returns 405, as the spec allows).
// Add it in Claude → Settings → Connectors with the URL https://buildcaps.com/api/mcp.

export const dynamic = "force-dynamic"

const PUBLIC_TOOLS = ["search_properties", "get_property", "list_communities", "buying_costs", "mortgage_payment", "check_availability", "booking_link", "faq"]
const SUPPORTED = ["2025-11-25", "2025-06-18", "2025-03-26"]
const cors = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "POST, OPTIONS",
  "access-control-allow-headers": "content-type, mcp-protocol-version, mcp-session-id, authorization",
}

type RpcRequest = { jsonrpc: "2.0"; id?: string | number | null; method: string; params?: Record<string, unknown> }

const result = (id: RpcRequest["id"], value: unknown) => ({ jsonrpc: "2.0", id, result: value })
const failure = (id: RpcRequest["id"], code: number, message: string) => ({ jsonrpc: "2.0", id: id ?? null, error: { code, message } })

async function handle(message: RpcRequest, locale: Locale) {
  switch (message.method) {
    case "initialize": {
      const requested = String(message.params?.protocolVersion ?? "")
      return result(message.id, {
        protocolVersion: SUPPORTED.includes(requested) ? requested : SUPPORTED[0],
        capabilities: { tools: { listChanged: false } },
        serverInfo: { name: "buildcaps", title: "Buildcaps Real Estate", version: "1.0.0" },
        instructions:
          "Search Dubai properties listed by Buildcaps Real Estate (prices in AED), see full details and buying costs, check advisor availability and get a booking link. Yields are estimates, not financial advice.",
      })
    }
    case "ping":
      return result(message.id, {})
    case "tools/list":
      return result(message.id, {
        tools: tools
          .filter((t) => PUBLIC_TOOLS.includes(t.name))
          .map((t) => ({ name: t.name, description: t.description, inputSchema: t.input_schema, annotations: { readOnlyHint: true, openWorldHint: false } })),
      })
    case "tools/call": {
      const name = String(message.params?.name ?? "")
      if (!PUBLIC_TOOLS.includes(name)) return failure(message.id, -32602, `Unknown tool: ${name}`)
      const output = await runTool(name, message.params?.arguments ?? {}, { locale })
      const isError = Boolean(output && typeof output === "object" && "error" in (output as object))
      return result(message.id, {
        content: [{ type: "text", text: JSON.stringify(output) }],
        structuredContent: Array.isArray(output) ? { items: output } : output,
        isError,
      })
    }
    default:
      return failure(message.id, -32601, `Method not found: ${message.method}`)
  }
}

export async function POST(request: Request) {
  if (await rateLimited("mcp", 120, 10 * 60_000)) return Response.json(failure(null, -32000, "Rate limited"), { status: 429, headers: cors })
  const lang = new URL(request.url).searchParams.get("lang") ?? request.headers.get("accept-language")?.slice(0, 2) ?? "en"
  const locale: Locale = hasLocale(routing.locales, lang) ? lang : "en"

  let body: RpcRequest | RpcRequest[]
  try {
    body = await request.json()
  } catch {
    return Response.json(failure(null, -32700, "Parse error"), { status: 400, headers: cors })
  }
  const batch = Array.isArray(body) ? body : [body]
  // Notifications (no id) get no reply.
  const replies = (await Promise.all(batch.map((m) => (m.id === undefined ? null : handle(m, locale))))).filter(Boolean)
  if (!replies.length) return new Response(null, { status: 202, headers: cors })
  return Response.json(Array.isArray(body) ? replies : replies[0], { headers: cors })
}

export function GET() {
  return new Response("Method Not Allowed", { status: 405, headers: { ...cors, allow: "POST, OPTIONS" } })
}

export function OPTIONS() {
  return new Response(null, { status: 204, headers: cors })
}
