import Image from "next/image"
import { LoginForm } from "@/components/admin/login-form"

export default function AdminLoginPage() {
  return (
    <main className="flex min-h-svh items-center justify-center p-6">
      <div className="w-full max-w-sm rounded-3xl bg-white p-8 shadow-sm ring-1 ring-neutral-200">
        <Image src="/brand/logo-color.png" alt="Buildcaps" width={170} height={32} className="h-8 w-auto" />
        <h1 className="mt-8 text-2xl font-semibold text-neutral-900">Staff sign in</h1>
        <p className="mt-1 text-sm text-neutral-500">Properties, opportunities and leads.</p>
        <LoginForm />
      </div>
    </main>
  )
}
