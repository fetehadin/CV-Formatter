import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react"
import { clearAiSettings, defaultAiSettings, isConfigured, loadAiSettings, PROVIDER_INFO, saveAiSettings, type AiSettings } from "@/lib/ai/settings"

type AiApi = {
  settings: AiSettings
  ready: boolean
  providerLabel: string
  save: (s: AiSettings) => void
  forget: () => void
  settingsOpen: boolean
  setSettingsOpen: (open: boolean) => void
}

const AiContext = createContext<AiApi | null>(null)

export function AiProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AiSettings>(() => loadAiSettings())
  const [settingsOpen, setSettingsOpen] = useState(false)

  const save = useCallback((s: AiSettings) => {
    saveAiSettings(s)
    setSettings(s)
  }, [])

  const forget = useCallback(() => {
    clearAiSettings()
    setSettings(defaultAiSettings())
  }, [])

  const value = useMemo<AiApi>(
    () => ({
      settings,
      ready: isConfigured(settings),
      providerLabel: settings.provider === "openai" ? settings.model || "AI" : PROVIDER_INFO[settings.provider].label.split(" (")[0],
      save,
      forget,
      settingsOpen,
      setSettingsOpen,
    }),
    [settings, save, forget, settingsOpen],
  )

  return <AiContext.Provider value={value}>{children}</AiContext.Provider>
}

export function useAi(): AiApi {
  const ctx = useContext(AiContext)
  if (!ctx) throw new Error("useAi must be used inside <AiProvider>")
  return ctx
}
