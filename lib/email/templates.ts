import "server-only"
import { isRtl, type Locale } from "@/i18n/locales"
import { translator } from "@/i18n/messages"
import { site } from "@/lib/site"

// Branded, table-free HTML that renders in every major client (inline styles only),
// plus a plain-text twin. Right-to-left languages get dir="rtl".

export type EmailContent = {
  locale: Locale
  preheader: string
  heading: string
  paragraphs: string[]
  details?: { label: string; value: string; href?: string }[]
  cta?: { label: string; href: string }
  footnote?: string
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")

export async function emailTranslator(locale: Locale) {
  return translator(locale, "emails")
}

export async function renderEmail(content: EmailContent) {
  const t = await emailTranslator(content.locale)
  const dir = isRtl(content.locale) ? "rtl" : "ltr"
  const align = dir === "rtl" ? "right" : "left"
  const logo = `${site.url}/brand/logo-color.png`

  const details = content.details?.length
    ? `<div style="margin:24px 0;padding:20px;border-radius:16px;background:#f0ede7">${content.details
        .map(
          (d) =>
            `<p style="margin:0 0 10px;font-size:14px;color:#525252">${esc(d.label)}<br><strong style="color:#0b0b0b;font-size:15px">${
              d.href ? `<a href="${esc(d.href)}" style="color:#8f4f5a">${esc(d.value)}</a>` : esc(d.value)
            }</strong></p>`,
        )
        .join("")}</div>`
    : ""

  const html = `<!doctype html><html lang="${content.locale}" dir="${dir}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(content.heading)}</title></head>
<body style="margin:0;padding:0;background:#ffffff;font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#262626">
<span style="display:none;max-height:0;overflow:hidden">${esc(content.preheader)}</span>
<div style="max-width:560px;margin:0 auto;padding:32px 24px;text-align:${align}" dir="${dir}">
  <img src="${logo}" alt="Buildcaps" width="170" height="32" style="display:block;height:32px;width:auto;margin-bottom:32px">
  <div style="height:2px;background:linear-gradient(90deg,#d4a1a8,#b76e79,#004274);margin-bottom:28px"></div>
  <h1 style="margin:0 0 16px;font-size:26px;line-height:1.3;color:#00173f">${esc(content.heading)}</h1>
  ${content.paragraphs.map((p) => `<p style="margin:0 0 14px;font-size:16px;line-height:1.6">${esc(p)}</p>`).join("")}
  ${details}
  ${content.cta ? `<p style="margin:28px 0"><a href="${esc(content.cta.href)}" style="display:inline-block;padding:14px 26px;border-radius:999px;background:#0b0b0b;color:#ffffff;text-decoration:none;font-weight:600">${esc(content.cta.label)}</a></p>` : ""}
  ${content.footnote ? `<p style="margin:16px 0;font-size:13px;color:#737373">${esc(content.footnote)}</p>` : ""}
  <p style="margin:28px 0 0;font-size:15px">${esc(t("signoff"))}</p>
  <p style="margin:32px 0 0;font-size:12px;color:#a3a3a3">${esc(t("footer"))}</p>
</div></body></html>`

  const text = [
    content.heading,
    "",
    ...content.paragraphs,
    "",
    ...(content.details ?? []).map((d) => `${d.label}: ${d.value}${d.href && d.href !== d.value ? ` (${d.href})` : ""}`),
    ...(content.cta ? ["", `${content.cta.label}: ${content.cta.href}`] : []),
    ...(content.footnote ? ["", content.footnote] : []),
    "",
    t("signoff"),
    t("footer"),
  ].join("\n")

  return { html, text }
}
