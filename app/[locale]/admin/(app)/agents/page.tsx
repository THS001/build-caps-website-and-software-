import { serverClient } from "@/lib/supabase/server"

export default async function AdminAgents() {
  const supabase = await serverClient()
  const { data, error } = await supabase.from("agent_runs").select("id, created_at, agent, trigger, status, summary, error, input_tokens, output_tokens").order("created_at", { ascending: false }).limit(150)
  const tokens = (data ?? []).reduce((s, r) => s + (r.input_tokens ?? 0) + (r.output_tokens ?? 0), 0)

  return (
    <div>
      <h1 className="text-3xl font-semibold text-neutral-900">AI activity</h1>
      <p className="mt-2 text-sm text-neutral-500">Every AI agent run is logged here. Tokens in the last {data?.length ?? 0} runs: {tokens.toLocaleString("en-GB")}.</p>
      {error && <p className="mt-6 text-sm text-red-600">{error.message}</p>}
      <div className="mt-8 overflow-x-auto rounded-2xl bg-white ring-1 ring-neutral-200">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="border-b border-neutral-200 text-xs uppercase tracking-wide text-neutral-500">
            <tr>
              <th className="px-4 py-3 text-start font-medium">When</th>
              <th className="px-4 py-3 text-start font-medium">Agent</th>
              <th className="px-4 py-3 text-start font-medium">Status</th>
              <th className="px-4 py-3 text-start font-medium">Summary</th>
              <th className="px-4 py-3 text-end font-medium">Tokens</th>
            </tr>
          </thead>
          <tbody>
            {(data ?? []).map((r) => (
              <tr key={r.id} className="border-b border-neutral-100 last:border-0 align-top">
                <td className="whitespace-nowrap px-4 py-3 text-neutral-500">{new Date(r.created_at).toLocaleString("en-GB", { timeZone: "Asia/Dubai" })}</td>
                <td className="px-4 py-3">
                  {r.agent}
                  <span className="block text-xs text-neutral-400">{r.trigger}</span>
                </td>
                <td className={`px-4 py-3 ${r.status === "error" ? "text-red-600" : r.status === "ok" ? "text-emerald-700" : "text-neutral-500"}`}>{r.status}</td>
                <td className="px-4 py-3 text-neutral-700">{r.error ?? r.summary}</td>
                <td className="px-4 py-3 text-end text-neutral-500">{(r.input_tokens ?? 0) + (r.output_tokens ?? 0) || ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
