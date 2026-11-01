import { useEffect, useState } from "react"

/** useState that survives reloads. For small UI preferences, not CV data. */
export function useLocalState<T extends object>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key)
      return raw ? { ...initial, ...JSON.parse(raw) } : initial
    } catch {
      return initial
    }
  })
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value))
    } catch {
      // storage full or disabled: the preference just won't persist
    }
  }, [key, value])
  return [value, setValue] as const
}
