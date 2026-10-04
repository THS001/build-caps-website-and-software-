"use client"

import { useState } from "react"
import Link from "next/link"
import { savePost } from "@/app/[locale]/admin/actions"
import { Field, LocalizedField, Section } from "@/components/admin/fields"
import { MediaUploader } from "@/components/admin/media-uploader"
import { useFormAction } from "@/components/admin/use-form-action"

export type PostRow = {
  slug: string
  title: Record<string, string>
  excerpt: Record<string, string>
  body: Record<string, string>[]
  category: string
  author: string
  minutes: number
  cover_url: string | null
  published: boolean
}

export function PostForm({ post }: { post?: PostRow }) {
  const { state, pending, form } = useFormAction(savePost.bind(null, post?.slug ?? null))
  const [slug, setSlug] = useState(post?.slug ?? "")
  const e = state.fieldErrors ?? {}
  // Older posts may hold several paragraph blocks; edit them as one text per language.
  const body = Object.fromEntries(
    Object.keys(post?.body?.[0] ?? { en: "" }).map((l) => [l, (post?.body ?? []).map((b) => b[l] ?? "").filter(Boolean).join("\n\n")]),
  )

  return (
    <form {...form} className="space-y-6">
      {state.status === "error" && state.message && <p className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{state.message}</p>}
      <Section title="Article">
        <LocalizedField name="title" label="Title" value={post?.title} error={e["title.en"]} onEnglishChange={(t) => !post && setSlug(t.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80))} />
        <LocalizedField name="excerpt" label="Excerpt (one sentence)" value={post?.excerpt} multiline error={e["excerpt.en"]} />
        <LocalizedField name="body" label="Text (separate paragraphs with a blank line)" value={body} multiline error={e["body.en"]} />
      </Section>
      <Section title="Details">
        <div className="grid gap-4 sm:grid-cols-4">
          <Field label="URL slug" error={e.slug}>
            <input name="slug" value={slug} onChange={(ev) => setSlug(ev.target.value)} className="admin-input" />
          </Field>
          <Field label="Category">
            <select name="category" defaultValue={post?.category ?? "market"} className="admin-input">
              {["market", "guides", "offPlan", "communities", "news"].map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Author">
            <input name="author" defaultValue={post?.author ?? "Buildcaps Research"} className="admin-input" />
          </Field>
          <Field label="Reading time (min)">
            <input name="minutes" type="number" min={1} max={60} defaultValue={post?.minutes ?? 5} className="admin-input" />
          </Field>
        </div>
        <div>
          <p className="mb-1.5 text-sm font-medium text-neutral-800">Cover image</p>
          <MediaUploader name="cover_url" folder={`posts/${slug || "draft"}`} single initial={post?.cover_url ? [{ src: post.cover_url, alt: { en: "" } }] : []} />
        </div>
        <label className="flex items-center gap-2 text-sm text-neutral-800">
          <input type="checkbox" name="published" defaultChecked={post?.published} className="h-4 w-4 accent-rose-500" />
          Published
        </label>
      </Section>
      <div className="sticky bottom-0 flex justify-end gap-3 border-t border-neutral-200 bg-neutral-50/90 py-4 backdrop-blur">
        <Link href="/admin/posts" className="rounded-full px-5 py-2.5 text-sm font-medium text-neutral-700">
          Cancel
        </Link>
        <button type="submit" disabled={pending} className="rounded-full bg-neutral-900 px-6 py-2.5 text-sm font-semibold text-white disabled:opacity-60">
          {pending ? "Saving…" : "Save article"}
        </button>
      </div>
    </form>
  )
}
