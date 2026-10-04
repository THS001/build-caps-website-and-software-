import "server-only"

// Optional WhatsApp Business Cloud API (Meta charges per conversation, so it's off
// unless configured). Needs an approved message template with body parameters:
// {{1}} name, {{2}} date and time, {{3}} advisor.
// WHATSAPP_TOKEN, WHATSAPP_PHONE_NUMBER_ID, WHATSAPP_TEMPLATE (e.g. "booking_confirmation").

const token = process.env.WHATSAPP_TOKEN ?? ""
const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID ?? ""
const template = process.env.WHATSAPP_TEMPLATE ?? ""
const version = process.env.WHATSAPP_API_VERSION ?? "v21.0"

export const whatsappConfigured = Boolean(token && phoneId && template)

export async function sendWhatsAppTemplate(to: string, language: string, params: string[]) {
  if (!whatsappConfigured) return false
  const res = await fetch(`https://graph.facebook.com/${version}/${phoneId}/messages`, {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: to.replace(/[^\d]/g, ""),
      type: "template",
      template: {
        name: template,
        language: { code: language === "zh" ? "zh_CN" : language },
        components: [{ type: "body", parameters: params.map((text) => ({ type: "text", text })) }],
      },
    }),
    cache: "no-store",
  })
  if (!res.ok) console.error("WhatsApp send failed:", res.status, await res.text())
  return res.ok
}
