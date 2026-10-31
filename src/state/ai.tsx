import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react"
import { toast } from "sonner"
import { clearAiSettings, defaultAiSettings, isConfigured, loadAiSettings, PROVIDER_INFO, saveAiSettings, type AiSettings } from "@/lib/ai/settings"

type AiApi = {
  settings: AiSettings
  /** Pass to AI calls: saves the model that answered when the chosen one failed. */
  onModelChange: (model: string) => void
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

  const onModelChange = useCallback((model: string) => {
    setSettings((prev) => {
      const next = { ...prev, model }
      saveAiSettings(next)
      return next
    })
    toast.info(`Switched to ${model}`, { description: "Your chosen model was unavailable or busy, so this one answered. It's now your default." })
  }, [])

  const forget = useCallback(() => {
    clearAiSettings()
    setSettings(defaultAiSettings())
  }, [])

  const value = useMemo<AiApi>(
    () => ({
      settings,
      onModelChange,
      ready: isConfigured(settings),
      providerLabel: settings.provider === "openai" ? settings.model || "AI" : PROVIDER_INFO[settings.provider].label.split(" (")[0],
      save,
      forget,
      settingsOpen,
      setSettingsOpen,
    }),
    [settings, onModelChange, save, forget, settingsOpen],
  )

  return <AiContext.Provider value={value}>{children}</AiContext.Provider>
}

export function useAi(): AiApi {
  const ctx = useContext(AiContext)
  if (!ctx) throw new Error("useAi must be used inside <AiProvider>")
  return ctx
}
