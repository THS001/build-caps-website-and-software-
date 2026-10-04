import { PostForm } from "@/components/admin/post-form"

export default function NewPostPage() {
  return (
    <div>
      <h1 className="mb-8 text-3xl font-semibold text-neutral-900">New article</h1>
      <PostForm />
    </div>
  )
}
