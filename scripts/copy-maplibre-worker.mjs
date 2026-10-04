#!/usr/bin/env node
// MapLibre runs tile decoding in a module web worker that bundlers don't emit.
// Copy the worker (and the shared chunk it imports) into public/ so it is served
// same-origin and always matches the installed version. Runs on postinstall.

import { copyFileSync, existsSync, mkdirSync } from "node:fs"
import { join } from "node:path"

const from = join(process.cwd(), "node_modules", "maplibre-gl", "dist")
const to = join(process.cwd(), "public", "maplibre")

if (!existsSync(from)) {
  console.warn("maplibre-gl is not installed; skipping worker copy")
  process.exit(0)
}

mkdirSync(to, { recursive: true })
for (const file of ["maplibre-gl-worker.mjs", "maplibre-gl-shared.mjs"]) copyFileSync(join(from, file), join(to, file))
console.log("Copied MapLibre worker to public/maplibre/")
