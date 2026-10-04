import Link from "next/link"
import { CheckCircle2, Database } from "lucide-react"
import { supabaseConfigured } from "@/lib/supabase/config"

// The middleware sends every admin URL here until Supabase keys are configured.
export default function AdminSetupPage() {
  return (
    <main className="flex min-h-svh items-center justify-center p-6">
      <div className="max-w-lg rounded-3xl bg-white p-8 ring-1 ring-neutral-200">
        {supabaseConfigured ? (
          <>
            <CheckCircle2 className="h-8 w-8 text-emerald-600" />
            <h1 className="mt-4 text-2xl font-semibold text-neutral-900">Supabase is connected</h1>
            <Link href="/admin" className="mt-6 inline-flex rounded-full bg-neutral-900 px-5 py-2.5 text-sm font-semibold text-white">
              Open the admin
            </Link>
          </>
        ) : (
          <>
            <Database className="h-8 w-8 text-rose-500" />
            <h1 className="mt-4 text-2xl font-semibold text-neutral-900">Connect Supabase to use the admin</h1>
            <ol className="mt-4 list-decimal space-y-2 ps-5 text-sm text-neutral-700">
              <li>Create a Supabase project and run the SQL in supabase/migrations.</li>
              <li>
                Add <code>NEXT_PUBLIC_SUPABASE_URL</code> and <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> to <code>.env.local</code>, then restart.
              </li>
              <li>Create your staff user in Supabase Auth and set its role to admin in the profiles table.</li>
            </ol>
            <p className="mt-4 text-sm text-neutral-500">The full checklist is in docs/supabase-setup.md.</p>
          </>
        )}
      </div>
    </main>
  )
}
