#!/usr/bin/env node
// Builds the favicons, touch icons and the default social-share image from the
// logo's "b" emblem (public/brand/logo-color.png). Re-run after a logo change:
//   node scripts/generate-icons.mjs

import { writeFileSync } from "node:fs"
import { join } from "node:path"
import sharp from "sharp"

const root = join(import.meta.dirname, "..")
const pub = (f) => join(root, "public", f)
const logo = pub("brand/logo-color.png")

// The emblem is the circle at the left of the 2000 × 378 logo.
const emblem = await sharp(logo).extract({ left: 0, top: 0, width: 392, height: 378 }).extend({ top: 7, bottom: 7, background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer()

const transparent = { r: 0, g: 0, b: 0, alpha: 0 }

async function square(size, { pad = 0, background = transparent } = {}) {
  const inner = await sharp(emblem).resize(size - pad * 2, size - pad * 2, { fit: "contain", background: transparent }).toBuffer()
  return sharp({ create: { width: size, height: size, channels: 4, background } }).composite([{ input: inner, top: pad, left: pad }]).png().toBuffer()
}

const white = { r: 255, g: 255, b: 255, alpha: 1 }
const files = {
  "icon-192.png": await square(192, { pad: 8 }),
  "icon-512.png": await square(512, { pad: 20 }),
  "icon-maskable-512.png": await square(512, { pad: 72, background: white }),
  "apple-touch-icon.png": await square(180, { pad: 14, background: white }),
}
for (const [name, buf] of Object.entries(files)) writeFileSync(pub(name), buf)

// favicon.ico with 16, 32 and 48 px PNG images inside.
const sizes = [16, 32, 48]
const images = await Promise.all(sizes.map((s) => square(s, { pad: s >= 32 ? 1 : 0 })))
const header = Buffer.alloc(6 + 16 * sizes.length)
header.writeUInt16LE(0, 0)
header.writeUInt16LE(1, 2)
header.writeUInt16LE(sizes.length, 4)
let offset = header.length
sizes.forEach((s, i) => {
  const e = 6 + i * 16
  header.writeUInt8(s, e)
  header.writeUInt8(s, e + 1)
  header.writeUInt8(0, e + 2)
  header.writeUInt8(0, e + 3)
  header.writeUInt16LE(1, e + 4)
  header.writeUInt16LE(32, e + 6)
  header.writeUInt32LE(images[i].length, e + 8)
  header.writeUInt32LE(offset, e + 12)
  offset += images[i].length
})
writeFileSync(pub("favicon.ico"), Buffer.concat([header, ...images]))

// Default Open Graph image (1200 × 630): the full logo, centred, on sand fading to white.
const wordmark = await sharp(await sharp(logo).trim().toBuffer()).resize(820).png().toBuffer()
const wordmarkHeight = (await sharp(wordmark).metadata()).height ?? 160
const og = await sharp({ create: { width: 1200, height: 630, channels: 4, background: white } })
  .composite([
    { input: Buffer.from(`<svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="g" x1="0" x2="1"><stop offset="0" stop-color="#F0EDE7"/><stop offset="1" stop-color="#ffffff"/></linearGradient></defs><rect width="1200" height="630" fill="url(#g)"/><rect y="590" width="1200" height="40" fill="#00173F"/><rect y="586" width="1200" height="4" fill="#B76E79"/></svg>`), top: 0, left: 0 },
    { input: wordmark, top: Math.round((590 - wordmarkHeight) / 2), left: Math.round((1200 - 820) / 2) },
  ])
  .png()
  .toBuffer()
writeFileSync(pub("og-default.png"), og)
console.log("icons, favicon.ico and og-default.png written to public/")
