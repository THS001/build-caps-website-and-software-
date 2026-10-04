import "server-only"
import Anthropic from "@anthropic-ai/sdk"
import { adminClient, adminConfigured } from "@/lib/supabase/admin"

// Claude is the only paid service in the stack (ANTHROPIC_API_KEY).
export const aiConfigured = Boolean(process.env.ANTHROPIC_API_KEY)

export const MODELS = {
  /** Chat, search parsing, SEO, listing copy. */
  chat: process.env.AI_MODEL_CHAT ?? "claude-sonnet-5-5",
  /** Deep analysis (market reports, feature explanations). */
  deep: process.env.AI_MODEL_DEEP ?? "claude-opus-5-5",
  /** Classification, translation drafts, scoring. */
  fast: process.env.AI_MODEL_FAST ?? "claude-haiku-4-5-20251001",
} as const

export const WEB_SEARCH_TOOL = { type: "web_search_20260318", name: "web_search", max_uses: 5 } as const

/**
 * Current models think before answering by default, and that thinking is paid
 * from max_tokens, so a short writing task can come back empty or cut off.
 * Spread this into short tasks to answer straight away (with tools, Claude may
 * still reason between tool calls). Older models don't think unless asked.
 */
export function quick(model: string): { thinking?: Anthropic.ThinkingConfigParam } {
  return /^claude-[a-z]+-5-\d/.test(model) ? { thinking: { type: "between_tools" } } : {}
}

let instance: Anthropic | null = null
export function claude() {
  if (!aiConfigured) throw new Error("ANTHROPIC_API_KEY is not configured")
  instance ??= new Anthropic({ maxRetries: 2, timeout: 120_000 })
  return instance
}

/** Text of a response, ignoring tool-use and server-tool blocks. */
export function textOf(message: Anthropic.Message) {
  return message.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("")
    .trim()
}

/**
 * Structured output: the reply is JSON matching `schema` (Claude's native
 * structured outputs). Current models don't accept forcing a specific tool, so
 * that is only the fallback, with the tool offered and the model asked to call it.
 */
export async function structured<T>({
  model = MODELS.chat,
  system,
  messages,
  name,
  description,
  schema,
  maxTokens = 4000,
  think = false,
}: {
  model?: string
  system: string
  messages: Anthropic.MessageParam[]
  name: string
  description: string
  schema: Anthropic.Tool.InputSchema
  maxTokens?: number
  /** Let the model think first (analysis); off by default so the budget goes to the answer. */
  think?: boolean
}): Promise<{ value: T; usage: Anthropic.Usage }> {
  const thinking = think ? {} : quick(model)
  try {
    const response = await claude().messages.create({
      model,
      max_tokens: maxTokens,
      system: `${system}\n\nReply with the ${description.toLowerCase()} as JSON.`,
      messages,
      output_config: { format: { type: "json_schema", schema: strictSchema(schema) } },
      ...thinking,
    })
    if (response.stop_reason === "max_tokens") throw new Error(`${name}: reply cut off at ${maxTokens} tokens`)
    return { value: JSON.parse(textOf(response)) as T, usage: response.usage }
  } catch (error) {
    // Unsupported schema or model: offer the tool and ask for it explicitly.
    if (!(error instanceof Anthropic.BadRequestError)) throw error
    const response = await claude().messages.create({
      model,
      max_tokens: maxTokens,
      system: `${system}\n\nAnswer only by calling the ${name} tool.`,
      messages,
      tools: [{ name, description, input_schema: schema }],
      tool_choice: { type: "auto" },
      ...thinking,
    })
    const block = response.content.find((b): b is Anthropic.ToolUseBlock => b.type === "tool_use" && b.name === name)
    if (!block) throw new Error(`Claude did not return ${name}`)
    return { value: block.input as T, usage: response.usage }
  }
}

const UNSUPPORTED = ["minimum", "maximum", "exclusiveMinimum", "exclusiveMaximum", "multipleOf", "minLength", "maxLength", "pattern", "format", "minItems", "maxItems", "uniqueItems"] as const

/**
 * Structured outputs need closed objects and don't support numeric, length or
 * item-count limits; those limits move into the description so Claude still
 * respects them (callers clamp anything critical).
 */
function strictSchema(node: unknown): Record<string, unknown> {
  if (!node || typeof node !== "object" || Array.isArray(node)) return node as Record<string, unknown>
  const out: Record<string, unknown> = {}
  const limits: string[] = []
  for (const [key, value] of Object.entries(node)) {
    if ((UNSUPPORTED as readonly string[]).includes(key)) limits.push(`${key} ${JSON.stringify(value)}`)
    else if (key === "properties" && value && typeof value === "object") out.properties = Object.fromEntries(Object.entries(value).map(([k, v]) => [k, strictSchema(v)]))
    else if (key === "items") out.items = strictSchema(value)
    else if (key === "anyOf" || key === "oneOf" || key === "allOf") out[key] = (value as unknown[]).map(strictSchema)
    else out[key] = value
  }
  const types = ([] as unknown[]).concat(out.type ?? [])
  // A nullable enum must be written as anyOf: the API checks enum values against every declared type.
  if (Array.isArray(out.type) && Array.isArray(out.enum)) {
    const { type, enum: values, ...rest } = out
    return { ...rest, anyOf: (type as string[]).map((t) => (t === "null" ? { type: "null" } : { type: t, enum: (values as unknown[]).filter((v) => v !== null) })) }
  }
  if (types.includes("object") || out.properties) out.additionalProperties = false
  if (limits.length) out.description = [out.description, `Constraints: ${limits.join(", ")}.`].filter(Boolean).join(" ")
  return out
}

/** Records an agent run (who, why, result, tokens) in agent_runs. Never throws. */
export async function logRun(run: {
  agent: string
  trigger: string
  status: "ok" | "error" | "skipped"
  summary?: string
  input?: unknown
  output?: unknown
  usage?: { input_tokens: number; output_tokens: number }
  error?: string
}) {
  if (!adminConfigured) return
  try {
    await adminClient()
      .from("agent_runs")
      .insert({
        agent: run.agent,
        trigger: run.trigger,
        status: run.status,
        summary: run.summary?.slice(0, 500),
        input: run.input ?? null,
        output: run.output ?? null,
        input_tokens: run.usage?.input_tokens,
        output_tokens: run.usage?.output_tokens,
        error: run.error?.slice(0, 2000),
      })
  } catch {
    // Logging must never break the feature it describes.
  }
}

export const DISCLAIMER =
  "Estimates and explanations are for information only and are not financial, legal or tax advice. Figures come from public data and models and can be wrong."
