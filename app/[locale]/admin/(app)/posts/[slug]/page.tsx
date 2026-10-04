import { notFound } from "next/navigation"
import { serverClient } from "@/lib/supabase/server"
import { PostForm, type PostRow } from "@/components/admin/post-form"

export default async function EditPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const supabase = await serverClient()
  const { data } = await supabase.from("posts").select("*").eq("slug", slug).maybeSingle()
  if (!data) notFound()
  return (
    <div>
      <h1 className="mb-8 text-3xl font-semibold text-neutral-900">Edit article</h1>
      <PostForm post={data as PostRow} />
    </div>
  )
}
