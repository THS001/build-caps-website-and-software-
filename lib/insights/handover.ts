import { clamp } from "./random"
import type { Developer, ProgressPoint, Project } from "@/lib/data/types"

// Handover Truth Score: a transparent logistic model of the chance an off-plan
// project hands over on time. Every factor is listed with its direction so the
// buyer sees why, not just a number.

export type HandoverFactor = { key: "progress" | "track" | "escrow" | "experience" | "pace"; effect: number; detail: Record<string, number | string> }

export type HandoverScore = {
  probability: number
  expectedProgress: number
  actualProgress: number
  /** Likely delay in months if the current gap persists (0 when on or ahead of schedule). */
  delayMonths: number
  confidence: "low" | "medium" | "high"
  factors: HandoverFactor[]
}

const MONTH = 2_629_800_000
// Typical Dubai build time when the launch date isn't recorded.
const DEFAULT_BUILD_MONTHS = 36
// Without a verified delivery record we assume an average developer.
const PRIOR_ON_TIME = 0.55

export function handoverScore(project: Pick<Project, "handover" | "launchedOn" | "constructionProgress" | "escrowRegistered">, developer: Pick<Developer, "onTimeRate" | "deliveredProjects"> | null, progress: ProgressPoint[] = [], now = new Date()): HandoverScore {
  const due = new Date(project.handover).getTime()
  const start = project.launchedOn ? new Date(project.launchedOn).getTime() : due - DEFAULT_BUILD_MONTHS * MONTH
  const elapsed = clamp((now.getTime() - start) / Math.max(due - start, MONTH), 0, 1)
  // Construction is back-loaded: slower at first (piling), faster mid-way.
  const expected = elapsed ** 1.2
  const actual = project.constructionProgress
  const gap = actual - expected

  const onTime = developer?.onTimeRate ?? PRIOR_ON_TIME
  const delivered = developer?.deliveredProjects ?? 0
  const factors: HandoverFactor[] = [
    { key: "progress", effect: 4.5 * gap, detail: { actual: Math.round(actual * 100), expected: Math.round(expected * 100) } },
    { key: "track", effect: 3.2 * (onTime - PRIOR_ON_TIME), detail: { rate: developer?.onTimeRate === null || developer?.onTimeRate === undefined ? "unknown" : Math.round(onTime * 100) } },
    { key: "escrow", effect: project.escrowRegistered ? 0.6 : -0.8, detail: { registered: project.escrowRegistered ? "yes" : "no" } },
    { key: "experience", effect: 0.25 * Math.log1p(delivered), detail: { delivered } },
  ]

  const points = [...progress].sort((a, b) => a.recordedOn.localeCompare(b.recordedOn))
  if (points.length >= 2) {
    const a = points[points.length - 2]
    const b = points[points.length - 1]
    const months = Math.max(0.5, (new Date(b.recordedOn).getTime() - new Date(a.recordedOn).getTime()) / MONTH)
    const pace = (b.progress - a.progress) / months
    const monthsLeft = Math.max(0.5, (due - new Date(b.recordedOn).getTime()) / MONTH)
    const needed = (1 - b.progress) / monthsLeft
    const ratio = needed > 0 ? pace / needed : 2
    factors.push({ key: "pace", effect: 1.2 * clamp(Math.log(Math.max(ratio, 0.05)), -1, 1), detail: { pace: Math.round(pace * 1000) / 10, needed: Math.round(needed * 1000) / 10 } })
  }

  const logit = -0.2 + factors.reduce((s, f) => s + f.effect, 0)
  const probability = clamp(1 / (1 + Math.exp(-logit)), 0.05, 0.95)
  const totalMonths = (due - start) / MONTH
  const known = (developer?.onTimeRate !== null && developer?.onTimeRate !== undefined ? 1 : 0) + (points.length >= 2 ? 1 : 0)
  return {
    probability,
    expectedProgress: expected,
    actualProgress: actual,
    delayMonths: gap < 0 ? Math.round(-gap * totalMonths) : 0,
    confidence: known === 2 ? "high" : known === 1 ? "medium" : "low",
    factors,
  }
}
