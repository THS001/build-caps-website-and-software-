"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react"
import { areaUnits, currencies, type AreaUnit, type Currency } from "@/lib/format"

type Preferences = {
  currency: Currency
  unit: AreaUnit
  setCurrency: (currency: Currency) => void
  setUnit: (unit: AreaUnit) => void
}

const STORAGE_KEY = "bc-prefs"

const PreferencesContext = createContext<Preferences | null>(null)

function save(value: { currency: Currency; unit: AreaUnit }) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(value))
  } catch {
    // Storage can be blocked (private mode); the choice then lasts for this visit only.
  }
}

/**
 * Display currency and area unit, remembered per browser. The server always
 * renders AED and sq ft (the legal advertising format in Dubai); a saved
 * choice is applied right after hydration.
 */
export function PreferencesProvider({ children }: { children: React.ReactNode }) {
  const [currency, setCurrencyState] = useState<Currency>("AED")
  const [unit, setUnitState] = useState<AreaUnit>("sqft")

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}")
      if (currencies.includes(saved.currency)) setCurrencyState(saved.currency)
      if (areaUnits.includes(saved.unit)) setUnitState(saved.unit)
    } catch {
      // Ignore unreadable storage.
    }
  }, [])

  const setCurrency = useCallback(
    (next: Currency) => {
      setCurrencyState(next)
      save({ currency: next, unit })
    },
    [unit],
  )

  const setUnit = useCallback(
    (next: AreaUnit) => {
      setUnitState(next)
      save({ currency, unit: next })
    },
    [currency],
  )

  const value = useMemo(() => ({ currency, unit, setCurrency, setUnit }), [currency, unit, setCurrency, setUnit])

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>
}

export function usePreferences() {
  const context = useContext(PreferencesContext)
  if (!context) throw new Error("usePreferences must be used inside <PreferencesProvider>")
  return context
}
