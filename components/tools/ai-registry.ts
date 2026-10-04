import { BarChart3, Compass, Eye, FileSearch, Ghost, LineChart, PieChart, Radar, ShieldCheck, Sun, Telescope, Users, UsersRound } from "lucide-react"

/**
 * Buildcaps Intelligence tools on /tools/[slug]; `key` is their namespace under
 * tools.aiTools (card copy) and intel.<key> (tool copy). "beta" tools run on our
 * models and free public data; "pilot" needs developer agreements before it can
 * deliver terms.
 */
export const aiTools = [
  { key: "estimate", slug: "estimate", icon: LineChart, status: "live" },
  { key: "dataRoom", slug: "data-room", icon: BarChart3, status: "live" },
  { key: "matchMe", slug: "match-me", icon: Compass, status: "live" },
  { key: "wealthTwin", slug: "wealth-twin", icon: Telescope, status: "beta" },
  { key: "regretRadar", slug: "regret-radar", icon: Radar, status: "beta" },
  { key: "portfolioArchitect", slug: "portfolio-architect", icon: PieChart, status: "beta" },
  { key: "dayInYourLife", slug: "day-in-your-life", icon: Sun, status: "beta" },
  { key: "familyRoom", slug: "family-room", icon: Users, status: "beta" },
  { key: "promiseLedger", slug: "promise-ledger", icon: FileSearch, status: "beta" },
  { key: "handoverScore", slug: "handover-score", icon: ShieldCheck, status: "beta" },
  { key: "ghostTenant", slug: "ghost-tenant", icon: Ghost, status: "beta" },
  { key: "futureView", slug: "future-view", icon: Eye, status: "beta" },
  { key: "buyerBloc", slug: "buyer-bloc", icon: UsersRound, status: "pilot" },
] as const

export type AiToolKey = (typeof aiTools)[number]["key"]
