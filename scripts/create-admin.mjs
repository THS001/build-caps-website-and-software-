#!/usr/bin/env node
// Creates a staff login and gives it a role (default: admin). Run it yourself:
//
//   npm run admin:create -- you@buildcaps.com "Your Name"
//   npm run admin:create -- advisor@buildcaps.com "Advisor Name" editor
//   npm run admin:password -- you@buildcaps.com      (change a password)
//
// The password is typed into this terminal (hidden) and sent straight to
// Supabase; it is never written anywhere. If the email already has a login,
// only its role and name are updated.

import { createInterface } from "node:readline"
import { createClient } from "@supabase/supabase-js"

const changePassword = process.argv.includes("--password")
const [email, name = "", role = "admin"] = process.argv.slice(2).filter((a) => a !== "--password")
const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
  console.error('Usage: npm run admin:create -- you@buildcaps.com "Your Name" [admin|editor|advisor]')
  process.exit(1)
}
if (!["admin", "editor", "advisor"].includes(role)) {
  console.error("Role must be admin, editor or advisor.")
  process.exit(1)
}
if (!url || !key) {
  console.error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set (.env.local).")
  process.exit(1)
}

/** Reads a line without echoing it. */
function hidden(question) {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true })
    rl._writeToOutput = (s) => {
      if (s.includes(question)) rl.output.write(s)
    }
    rl.question(question, (answer) => {
      rl.close()
      process.stdout.write("\n")
      resolve(answer)
    })
  })
}

const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })

// Existing login with this email?
let user = null
for (let page = 1; !user; page++) {
  const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 })
  if (error) throw error
  user = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase()) ?? null
  if (data.users.length < 200) break
}

if (changePassword) {
  if (!user) {
    console.error(`No login found for ${email}.`)
    process.exit(1)
  }
  const password = await hidden(`New password for ${email} (at least 10 characters): `)
  if (password.length < 10 || (await hidden("Type it again: ")) !== password) {
    console.error("Password too short, or the two entries don't match.")
    process.exit(1)
  }
  const { error } = await supabase.auth.admin.updateUserById(user.id, { password })
  if (error) {
    console.error(`Couldn't change the password: ${error.message}`)
    process.exit(1)
  }
  console.log(`Password changed for ${email}.`)
  process.exit(0)
}

if (!user) {
  const password = await hidden(`Choose a password for ${email} (at least 10 characters): `)
  if (password.length < 10) {
    console.error("Password too short.")
    process.exit(1)
  }
  const again = await hidden("Type it again: ")
  if (again !== password) {
    console.error("The passwords don't match.")
    process.exit(1)
  }
  const { data, error } = await supabase.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { full_name: name } })
  if (error) {
    console.error(`Couldn't create the login: ${error.message}`)
    process.exit(1)
  }
  user = data.user
  console.log(`Login created for ${email}.`)
} else {
  console.log(`${email} already has a login; updating its role.`)
}

const { error } = await supabase.from("profiles").upsert({ id: user.id, role, ...(name ? { full_name: name } : {}) }, { onConflict: "id" })
if (error) {
  console.error(`Couldn't set the role: ${error.message}`)
  process.exit(1)
}
console.log(`${email} is now ${role === "admin" ? "an admin" : `an ${role}`}. Sign in at /admin/login.`)
