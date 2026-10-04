// Everyday destinations for Day in Your Life (approximate centre points).
// Names are shown through messages (intel.dayInLife.places.<key>).

export const landmarks = {
  difc: { lat: 25.2117, lng: 55.2797 },
  downtown: { lat: 25.1972, lng: 55.2744 },
  businessBay: { lat: 25.186, lng: 55.262 },
  internetCity: { lat: 25.095, lng: 55.159 },
  jlt: { lat: 25.0693, lng: 55.1413 },
  marina: { lat: 25.0805, lng: 55.1403 },
  dxb: { lat: 25.2532, lng: 55.3657 },
  dwc: { lat: 24.896, lng: 55.161 },
  siliconOasis: { lat: 25.118, lng: 55.383 },
  healthcareCity: { lat: 25.231, lng: 55.324 },
  mallOfEmirates: { lat: 25.1181, lng: 55.2006 },
  expoCity: { lat: 24.963, lng: 55.149 },
  deira: { lat: 25.265, lng: 55.323 },
  sharjah: { lat: 25.326, lng: 55.385 },
  abuDhabi: { lat: 24.4539, lng: 54.3773 },
} as const

export type LandmarkKey = keyof typeof landmarks
export const landmarkKeys = Object.keys(landmarks) as LandmarkKey[]

/**
 * Rush-hour multiplier on free-flow driving time, by departure time (weekday).
 * A rough Dubai profile, shown as an estimate on the page.
 */
export const departures = { "06:30": 1.15, "07:00": 1.35, "07:30": 1.55, "08:00": 1.7, "08:30": 1.6, "09:00": 1.4, "10:00": 1.15 } as const
export type Departure = keyof typeof departures
