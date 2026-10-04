"use client"

import { useEffect, useRef } from "react"
import * as THREE from "three"
import { OrbitControls } from "three/addons/controls/OrbitControls.js"
import * as SunCalc from "suncalc"
import type { SkylineData } from "@/app/actions/intel"

// Three.js scene for the Future Skyline View: OpenStreetMap buildings around the
// unit, announced towers (rose) that appear in the "in five years" scenario, and
// the sun for the chosen day and hour. Also measures view openness and direct-sun
// hours by casting rays from the window.

export type Facing = "N" | "NE" | "E" | "SE" | "S" | "SW" | "W" | "NW"
export type Metrics = { openness: number; sunHours: number }
export type SceneProps = {
  data: SkylineData
  origin: { lat: number; lng: number }
  floor: number
  facing: Facing
  future: boolean
  day: "summer" | "equinox" | "winter"
  hour: number
  mode: "window" | "overview"
  onMetrics: (today: Metrics, future: Metrics) => void
}

const AZIMUTH: Record<Facing, number> = { N: 0, NE: 45, E: 90, SE: 135, S: 180, SW: 225, W: 270, NW: 315 }
const FLOOR_HEIGHT = 3.3
const rad = Math.PI / 180

export function dayDate(day: SceneProps["day"], hour: number) {
  const y = new Date().getUTCFullYear()
  const [m, d] = day === "summer" ? [5, 21] : day === "winter" ? [11, 21] : [2, 20]
  // Dubai is UTC+4 all year.
  return new Date(Date.UTC(y, m, d, 0, 0) + (hour - 4) * 3_600_000)
}

const project = (origin: { lat: number; lng: number }) => (lat: number, lng: number) => ({
  east: (lng - origin.lng) * 111_320 * Math.cos(origin.lat * rad),
  north: (lat - origin.lat) * 110_574,
})

function insidePolygon(points: { east: number; north: number }[], e = 0, n = 0) {
  let inside = false
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const a = points[i]
    const b = points[j]
    if (a.north > n !== b.north > n && e < ((b.east - a.east) * (n - a.north)) / (b.north - a.north) + a.east) inside = !inside
  }
  return inside
}

/** Direction to the sun as a world vector (x = east, y = up, z = south). */
function sunVector(date: Date, origin: { lat: number; lng: number }) {
  const p = SunCalc.getPosition(date, origin.lat, origin.lng)
  const az = p.azimuth + Math.PI // suncalc measures from south; this is from north, clockwise
  return { dir: new THREE.Vector3(Math.sin(az) * Math.cos(p.altitude), Math.sin(p.altitude), -Math.cos(az) * Math.cos(p.altitude)), altitude: p.altitude, azimuth: az }
}

export default function SkylineScene(props: SceneProps) {
  const mount = useRef<HTMLDivElement>(null)
  const api = useRef<{ update: (p: SceneProps) => void } | null>(null)
  const latest = useRef(props)
  latest.current = props

  // Build the scene once per data set.
  useEffect(() => {
    const el = mount.current
    if (!el) return
    const { data, origin } = latest.current
    const toLocal = project(origin)
    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(el.clientWidth, el.clientHeight)
    renderer.shadowMap.enabled = true
    el.appendChild(renderer.domElement)

    const scene = new THREE.Scene()
    scene.background = new THREE.Color("#dfe9f2")
    scene.fog = new THREE.Fog("#dfe9f2", 900, 2200)
    const camera = new THREE.PerspectiveCamera(70, el.clientWidth / el.clientHeight, 1, 5000)
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.maxPolarAngle = Math.PI / 2.05

    scene.add(new THREE.HemisphereLight("#ffffff", "#c9b8a6", 1.4))
    const sun = new THREE.DirectionalLight("#fff4e0", 2.4)
    sun.castShadow = true
    sun.shadow.mapSize.set(2048, 2048)
    Object.assign(sun.shadow.camera, { left: -800, right: 800, top: 800, bottom: -800, near: 1, far: 4000 })
    scene.add(sun, sun.target)

    const ground = new THREE.Mesh(new THREE.PlaneGeometry(4000, 4000), new THREE.MeshLambertMaterial({ color: "#efe9e1" }))
    ground.rotation.x = -Math.PI / 2
    ground.receiveShadow = true
    scene.add(ground)

    const existing: THREE.Mesh[] = []
    const announced: THREE.Mesh[] = []
    const material = new THREE.MeshLambertMaterial({ color: "#ffffff" })
    const futureMaterial = new THREE.MeshLambertMaterial({ color: "#d79aa3", transparent: true, opacity: 0.92 })

    for (const b of data.buildings) {
      const pts = b.points.map(([lat, lng]) => toLocal(lat, lng))
      if (insidePolygon(pts)) continue // the unit's own building
      const shape = new THREE.Shape(pts.map((p) => new THREE.Vector2(p.east, p.north)))
      const geometry = new THREE.ExtrudeGeometry(shape, { depth: b.height, bevelEnabled: false })
      const mesh = new THREE.Mesh(geometry, material)
      mesh.rotation.x = -Math.PI / 2
      mesh.castShadow = mesh.receiveShadow = true
      mesh.updateMatrixWorld()
      scene.add(mesh)
      existing.push(mesh)
    }
    for (const a of data.announced) {
      const p = toLocal(a.lat, a.lng)
      if (Math.hypot(p.east, p.north) < 20) continue
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(36, a.height, 36), futureMaterial)
      mesh.position.set(p.east, a.height / 2, -p.north)
      mesh.castShadow = mesh.receiveShadow = true
      mesh.updateMatrixWorld()
      announced.push(mesh)
    }

    // "You are here": a rose sphere at the window and a thin mast down to the ground.
    const markerMaterial = new THREE.MeshBasicMaterial({ color: "#b76e79" })
    const marker = new THREE.Mesh(new THREE.SphereGeometry(9, 20, 20), markerMaterial)
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 1, 8), markerMaterial)
    scene.add(marker, mast)

    const raycaster = new THREE.Raycaster()
    const blocked = (from: THREE.Vector3, dir: THREE.Vector3, far: number, meshes: THREE.Mesh[]) => {
      raycaster.set(from, dir)
      raycaster.far = far
      return raycaster.intersectObjects(meshes, false).length > 0
    }
    const measure = (p: SceneProps, withFuture: boolean): Metrics => {
      const meshes = withFuture ? [...existing, ...announced] : existing
      const eye = new THREE.Vector3(0, p.floor * FLOOR_HEIGHT + 1.5, 0)
      const facing = AZIMUTH[p.facing] * rad
      let open = 0
      let total = 0
      for (let a = -60; a <= 60; a += 5) {
        for (const elev of [0, 5, 10, 15]) {
          const az = facing + a * rad
          const dir = new THREE.Vector3(Math.sin(az) * Math.cos(elev * rad), Math.sin(elev * rad), -Math.cos(az) * Math.cos(elev * rad))
          total++
          if (!blocked(eye, dir, 1200, meshes)) open++
        }
      }
      let minutes = 0
      for (let h = 5; h <= 20; h += 1 / 6) {
        const s = sunVector(dayDate(p.day, h), origin)
        if (s.altitude <= 0.02) continue
        // Only sun in front of the window counts.
        const diff = Math.abs(((s.azimuth - facing + Math.PI * 3) % (Math.PI * 2)) - Math.PI)
        if (diff >= Math.PI / 2) continue
        if (!blocked(eye, s.dir, 2000, meshes)) minutes += 10
      }
      return { openness: open / total, sunHours: minutes / 60 }
    }

    let lastKey = ""
    const update = (p: SceneProps) => {
      for (const m of announced) {
        if (p.future && !m.parent) scene.add(m)
        if (!p.future && m.parent) scene.remove(m)
      }
      const eyeY = p.floor * FLOOR_HEIGHT + 1.5
      marker.position.set(0, eyeY, 0)
      marker.visible = mast.visible = p.mode === "overview"
      mast.scale.y = eyeY
      mast.position.set(0, eyeY / 2, 0)
      const s = sunVector(dayDate(p.day, p.hour), origin)
      sun.position.copy(s.dir.clone().multiplyScalar(1500))
      sun.intensity = s.altitude > 0 ? 2.4 : 0
      const facing = AZIMUTH[p.facing] * rad
      if (p.mode === "window") {
        controls.enabled = false
        camera.position.set(0, eyeY, 0)
        camera.lookAt(Math.sin(facing) * 100, eyeY - 4, -Math.cos(facing) * 100)
      } else {
        controls.enabled = true
        controls.target.set(0, eyeY / 2, 0)
        if (camera.position.y < eyeY + 50 || camera.position.length() < 100) camera.position.set(-Math.sin(facing) * 700, 500, Math.cos(facing) * 700)
        controls.update()
      }
      const key = `${p.floor}|${p.facing}|${p.day}`
      if (key !== lastKey) {
        lastKey = key
        p.onMetrics(measure(p, false), measure(p, true))
      }
    }
    api.current = { update }
    update(latest.current)

    let frame = 0
    const loop = () => {
      frame = requestAnimationFrame(loop)
      if (controls.enabled) controls.update()
      renderer.render(scene, camera)
    }
    loop()
    const resize = new ResizeObserver(() => {
      renderer.setSize(el.clientWidth, el.clientHeight)
      camera.aspect = el.clientWidth / el.clientHeight
      camera.updateProjectionMatrix()
    })
    resize.observe(el)

    return () => {
      cancelAnimationFrame(frame)
      resize.disconnect()
      controls.dispose()
      scene.traverse((o) => {
        if (o instanceof THREE.Mesh) o.geometry.dispose()
      })
      for (const m of announced) m.geometry.dispose()
      material.dispose()
      futureMaterial.dispose()
      markerMaterial.dispose()
      renderer.dispose()
      renderer.domElement.remove()
      api.current = null
    }
  }, [props.data, props.origin])

  useEffect(() => {
    api.current?.update(props)
  }, [props])

  return <div ref={mount} className="h-full w-full" />
}
