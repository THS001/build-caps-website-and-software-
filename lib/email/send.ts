import "server-only"

// Outgoing email: Resend (RESEND_API_KEY) or any SMTP server (SMTP_HOST, SMTP_PORT,
// SMTP_USER, SMTP_PASS). Sender: EMAIL_FROM, e.g. "Buildcaps <bookings@buildcaps.com>".

export type Attachment = { filename: string; content: string; contentType: string }
export type Email = { to: string | string[]; subject: string; html: string; text: string; replyTo?: string; attachments?: Attachment[] }

const from = process.env.EMAIL_FROM ?? "Buildcaps Real Estate <info@buildcaps.com>"
/** Internal notifications (new bookings, leads). */
export const teamInbox = process.env.EMAIL_TEAM ?? "info@buildcaps.com"

export const emailConfigured = Boolean(process.env.RESEND_API_KEY || process.env.SMTP_HOST)

export async function sendEmail(email: Email): Promise<boolean> {
  try {
    if (process.env.RESEND_API_KEY) return await viaResend(email)
    if (process.env.SMTP_HOST) return await viaSmtp(email)
  } catch (error) {
    console.error("Email failed:", error instanceof Error ? error.message : error)
    return false
  }
  // Not configured: show the email in the dev console, and report failure in production.
  if (process.env.NODE_ENV !== "production") {
    console.info(`[email] to=${String(email.to)} subject="${email.subject}"\n${email.text}`)
    return true
  }
  console.error("Email not sent: no RESEND_API_KEY or SMTP_HOST configured")
  return false
}

async function viaResend(email: Email) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { authorization: `Bearer ${process.env.RESEND_API_KEY}`, "content-type": "application/json" },
    body: JSON.stringify({
      from,
      to: email.to,
      subject: email.subject,
      html: email.html,
      text: email.text,
      reply_to: email.replyTo,
      attachments: email.attachments?.map((a) => ({ filename: a.filename, content: Buffer.from(a.content).toString("base64"), content_type: a.contentType })),
    }),
    cache: "no-store",
  })
  if (!res.ok) throw new Error(`Resend ${res.status}: ${await res.text()}`)
  return true
}

async function viaSmtp(email: Email) {
  const nodemailer = await import("nodemailer")
  const port = Number(process.env.SMTP_PORT ?? 587)
  const transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: port === 465,
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
  })
  await transport.sendMail({
    from,
    to: email.to,
    subject: email.subject,
    html: email.html,
    text: email.text,
    replyTo: email.replyTo,
    attachments: email.attachments?.map((a) => ({ filename: a.filename, content: a.content, contentType: a.contentType })),
  })
  return true
}
