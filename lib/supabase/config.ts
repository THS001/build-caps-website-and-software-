// Supabase is optional until the project's keys are added (.env.local); the site
// then runs on the sample data in lib/data/mock.ts.

export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ""
export const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ""

export const supabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey)

/** Cache tag for every public content query; admin mutations revalidate it. */
export const CONTENT_TAG = "content"
