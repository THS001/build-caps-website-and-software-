"use client"

import { browserClient } from "@/lib/supabase/browser"

/**
 * Big files (brochures, DLD exports) go straight from the browser to the private
 * `documents` bucket: the hosting platform caps request bodies at 4.5 MB, so they
 * can't be posted to a server action. The action then reads the file by its path.
 */
export async function uploadForImport(file: File, folder: "brochures" | "dld") {
  const safe = file.name.toLowerCase().replace(/[^a-z0-9.]+/g, "-").slice(-80)
  const path = `imports/${folder}/${Date.now()}-${safe}`
  const { error } = await browserClient().storage.from("documents").upload(path, file, { contentType: file.type || "application/octet-stream" })
  if (error) throw new Error(/exceeded|too large|413/i.test(error.message) ? "The file is too large to upload (50 MB at most)." : error.message)
  return path
}
