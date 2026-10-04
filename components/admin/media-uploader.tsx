"use client"

import { useState } from "react"
import { ImagePlus, Trash2, ArrowUp } from "lucide-react"
import { browserClient } from "@/lib/supabase/browser"

export type MediaItem = { src: string; alt: { en: string } }

const MAX_BYTES = 8 * 1024 * 1024
const TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif"]

/**
 * Uploads straight from the browser to the public `media` bucket (storage RLS
 * only lets editors write). The list is submitted with the form as JSON.
 */
export function MediaUploader({ name, folder, initial = [], single }: { name: string; folder: string; initial?: MediaItem[]; single?: boolean }) {
  const [items, setItems] = useState<MediaItem[]>(initial)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string>()

  const upload = async (files: FileList | null) => {
    if (!files?.length) return
    setBusy(true)
    setError(undefined)
    const supabase = browserClient()
    const added: MediaItem[] = []
    for (const file of Array.from(files)) {
      if (!TYPES.includes(file.type)) {
        setError("Use JPEG, PNG, WebP or AVIF images.")
        continue
      }
      if (file.size > MAX_BYTES) {
        setError("Images must be 8 MB or smaller.")
        continue
      }
      const safe = file.name.toLowerCase().replace(/[^a-z0-9.]+/g, "-")
      const path = `${folder}/${Date.now()}-${safe}`
      const { error: uploadError } = await supabase.storage.from("media").upload(path, file, { contentType: file.type, cacheControl: "31536000" })
      if (uploadError) {
        setError(uploadError.message)
        continue
      }
      const { data } = supabase.storage.from("media").getPublicUrl(path)
      added.push({ src: data.publicUrl, alt: { en: "" } })
    }
    setItems((current) => (single ? added.slice(-1) : [...current, ...added]))
    setBusy(false)
  }

  const move = (i: number) => setItems((current) => (i === 0 ? current : [current[i], ...current.filter((_, j) => j !== i)]))

  return (
    <div>
      <input type="hidden" name={name} value={single ? (items[0]?.src ?? "") : JSON.stringify(items)} />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {items.map((item, i) => (
          <div key={item.src} className="overflow-hidden rounded-xl ring-1 ring-neutral-200">
            <img src={item.src} alt="" className="aspect-[4/3] w-full object-cover" />
            {!single && (
              <input
                value={item.alt.en}
                onChange={(e) => setItems((current) => current.map((c, j) => (j === i ? { ...c, alt: { en: e.target.value } } : c)))}
                placeholder="Alt text (what's in the photo)"
                className="w-full border-t border-neutral-200 px-2 py-1.5 text-xs outline-none"
              />
            )}
            <div className="flex justify-between border-t border-neutral-200 px-2 py-1.5 text-xs">
              {!single && i > 0 ? (
                <button type="button" onClick={() => move(i)} className="flex items-center gap-1 text-neutral-600">
                  <ArrowUp className="h-3 w-3" /> Cover
                </button>
              ) : (
                <span className="text-neutral-400">{single ? "" : "Cover"}</span>
              )}
              <button type="button" onClick={() => setItems((current) => current.filter((_, j) => j !== i))} className="text-red-600" aria-label="Remove">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ))}
        <label className="flex aspect-[4/3] cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-neutral-300 text-sm text-neutral-500 hover:border-rose-300">
          <ImagePlus className="h-6 w-6" />
          {busy ? "Uploading…" : single ? "Upload image" : "Add photos"}
          <input type="file" accept={TYPES.join(",")} multiple={!single} className="sr-only" onChange={(e) => upload(e.target.files)} disabled={busy} />
        </label>
      </div>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  )
}
