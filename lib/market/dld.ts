import "server-only"
import { adminClient } from "@/lib/supabase/admin"

// Dubai Land Department open transactions (Dubai Pulse "dld_transactions").
// Source: DLD_TRANSACTIONS_CSV_URL (download link of the open-data CSV) or an
// admin upload. Raw sales from the last 24 months are kept; monthly medians per
// area are kept for the whole history (dld_area_monthly).

const SQM_PER_SQFT = 0.09290304
const KEEP_MONTHS = 24

/** Splits one CSV line, honouring quoted fields with commas and doubled quotes. */
export function csvFields(line: string) {
  const out: string[] = []
  let field = ""
  let quoted = false
  for (let i = 0; i < line.length; i++) {
    const c = line[i]
    if (quoted) {
      if (c === '"' && line[i + 1] === '"') {
        field += '"'
        i++
      } else if (c === '"') quoted = false
      else field += c
    } else if (c === '"') quoted = true
    else if (c === ",") {
      out.push(field)
      field = ""
    } else field += c
  }
  out.push(field)
  return out
}

function parseDate(value: string) {
  const v = value.trim().slice(0, 10)
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v
  const m = v.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/)
  return m ? `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}` : null
}

type Row = {
  transaction_id: string | null
  instance_date: string
  trans_group: string | null
  reg_type: string | null
  area_name: string
  property_type: string | null
  property_sub_type: string | null
  rooms: string | null
  area_sqm: number | null
  worth_aed: number | null
  price_per_sqm: number | null
  project_name: string | null
  building_name: string | null
}

/** Ingests CSV text arriving in chunks (a fetch stream or an uploaded file). */
export async function ingestDld(chunks: AsyncIterable<string>) {
  const since = new Date()
  since.setUTCMonth(since.getUTCMonth() - KEEP_MONTHS)
  const sinceIso = since.toISOString().slice(0, 10)
  const supabase = adminClient()

  let header: string[] | null = null
  let col: Record<string, number> = {}
  let rest = ""
  let batch: Row[] = []
  const stats = { read: 0, kept: 0, inserted: 0, months: 0 }
  // area|YYYY-MM-01 → price per sqm of every sale that month (all years).
  const monthly = new Map<string, number[]>()

  const flush = async () => {
    if (!batch.length) return
    const { error, count } = await supabase.from("dld_transactions").upsert(batch, { onConflict: "transaction_id", ignoreDuplicates: true, count: "exact" })
    if (error) throw new Error(`DLD insert: ${error.message}`)
    stats.inserted += count ?? 0
    batch = []
  }

  const handle = async (line: string) => {
    if (!line.trim()) return
    const f = csvFields(line.replace(/\r$/, ""))
    if (!header) {
      header = f.map((h) => h.trim().toLowerCase().replace(new RegExp("^" + String.fromCharCode(0xfeff)), ""))
      col = Object.fromEntries(header.map((h, i) => [h, i]))
      if (col.instance_date === undefined || col.area_name_en === undefined) throw new Error("Unexpected CSV: needs instance_date and area_name_en columns")
      return
    }
    stats.read++
    const get = (name: string) => (col[name] === undefined ? null : f[col[name]]?.trim() || null)
    const date = parseDate(get("instance_date") ?? "")
    const group = get("trans_group_en")
    if (!date || (group && group !== "Sales")) return
    const sqm = Number(get("procedure_area"))
    const worth = Number(get("actual_worth"))
    const perSqm = Number(get("meter_sale_price")) || (sqm > 0 ? worth / sqm : 0)
    if (!(sqm > 0 && worth > 0 && perSqm > 0)) return
    const area = get("area_name_en")
    if (area) {
      const key = `${area}|${date.slice(0, 7)}-01`
      const list = monthly.get(key)
      if (list) list.push(perSqm)
      else monthly.set(key, [perSqm])
    }
    if (date < sinceIso) return
    stats.kept++
    batch.push({
      transaction_id: get("transaction_id"),
      instance_date: date,
      trans_group: group,
      reg_type: get("reg_type_en"),
      area_name: get("area_name_en") ?? "",
      property_type: get("property_type_en"),
      property_sub_type: get("property_sub_type_en"),
      rooms: get("rooms_en"),
      area_sqm: sqm,
      worth_aed: worth,
      price_per_sqm: perSqm,
      project_name: get("project_name_en"),
      building_name: get("building_name_en"),
    })
    if (batch.length >= 1000) await flush()
  }

  for await (const chunk of chunks) {
    const lines = (rest + chunk).split("\n")
    rest = lines.pop() ?? ""
    for (const line of lines) await handle(line)
  }
  if (rest) await handle(rest)
  await flush()
  stats.months = await saveMonthly(monthly)
  return stats
}

const median = (values: number[]) => {
  const v = [...values].sort((a, b) => a - b)
  const mid = v.length >> 1
  return v.length % 2 ? v[mid] : (v[mid - 1] + v[mid]) / 2
}

/** Upserts one median per area and month, replacing months the file covers. */
async function saveMonthly(monthly: Map<string, number[]>) {
  const rows = [...monthly].map(([key, values]) => {
    const [area_name, month] = key.split("|")
    return { area_name, month, sales: values.length, median_ppsm: Math.round(median(values)) }
  })
  const supabase = adminClient()
  for (let i = 0; i < rows.length; i += 1000) {
    const { error } = await supabase.from("dld_area_monthly").upsert(rows.slice(i, i + 1000), { onConflict: "area_name,month" })
    if (error) throw new Error(`DLD monthly: ${error.message}`)
  }
  return rows.length
}

export async function* streamText(body: ReadableStream<Uint8Array>) {
  const reader = body.getReader()
  const decoder = new TextDecoder()
  for (;;) {
    const { value, done } = await reader.read()
    if (done) break
    yield decoder.decode(value, { stream: true })
  }
}

/** Recomputes each community's average price per sq ft and 12-month change from DLD sales. */
export async function refreshCommunityStats() {
  const supabase = adminClient()
  const { data: communities } = await supabase.from("communities").select("slug, dld_areas")
  const since = new Date()
  since.setUTCMonth(since.getUTCMonth() - 15)
  const updated: { slug: string; avgPricePerSqft: number; change: number | null; sales: number }[] = []

  for (const c of communities ?? []) {
    const areas = (c.dld_areas as string[]) ?? []
    if (!areas.length) continue
    const { data: months } = await supabase.rpc("dld_monthly", { p_areas: areas, p_since: since.toISOString().slice(0, 10) })
    const series = (months ?? []) as { month: string; median: number; sales: number }[]
    if (!series.length) continue
    const recent = series.slice(-3)
    const yearAgo = series.filter((m) => {
      const d = new Date(m.month)
      const last = new Date(recent[0].month)
      return d >= new Date(Date.UTC(last.getUTCFullYear() - 1, last.getUTCMonth(), 1)) && d < new Date(Date.UTC(last.getUTCFullYear() - 1, last.getUTCMonth() + 3, 1))
    })
    const weighted = (list: typeof series) => list.reduce((s, m) => s + Number(m.median) * Number(m.sales), 0) / Math.max(1, list.reduce((s, m) => s + Number(m.sales), 0))
    const nowPerSqm = weighted(recent)
    const change = yearAgo.length ? nowPerSqm / weighted(yearAgo) - 1 : null
    const avgPricePerSqft = Math.round(nowPerSqm * SQM_PER_SQFT)
    await supabase
      .from("communities")
      .update({ avg_price_per_sqft: avgPricePerSqft, ...(change !== null ? { price_change_12m: Math.round(change * 10_000) / 10_000 } : {}) })
      .eq("slug", c.slug)
    updated.push({ slug: c.slug, avgPricePerSqft, change, sales: recent.reduce((s, m) => s + Number(m.sales), 0) })
  }
  return updated
}
