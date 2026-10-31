import { useEffect, useId, useState } from "react"
import { ExternalLink, Loader2, ShieldCheck } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { Switch } from "@/components/ui/switch"
import { AiError, loadProviders } from "@/lib/ai/errors"
import { isConfigured, OPENAI_PRESETS, PROVIDER_INFO, PROVIDERS, type AiSettings, type ProviderId } from "@/lib/ai/settings"
import { useAi } from "@/state/ai"

/** Connect an AI provider with the user's own key. Nothing goes through our servers (there are none). */
export function AiSettingsDialog() {
  const { settings, save, forget, settingsOpen, setSettingsOpen } = useAi()
  const [draft, setDraft] = useState<AiSettings>(settings)
  const [models, setModels] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [onDevice, setOnDevice] = useState<string>("checking")
  const ids = { provider: useId(), key: useId(), model: useId(), base: useId(), remember: useId(), preset: useId() }
  const info = PROVIDER_INFO[draft.provider]

  useEffect(() => {
    if (!settingsOpen) return
    setDraft(settings)
    setModels([])
    loadProviders().then(({ onDeviceAvailability }) => onDeviceAvailability().then(setOnDevice))
  }, [settingsOpen, settings])

  const setProvider = (provider: ProviderId) => {
    setModels([])
    setDraft({ ...draft, provider, model: PROVIDER_INFO[provider].defaultModel, apiKey: provider === draft.provider ? draft.apiKey : "" })
  }

  const loadModels = async () => {
    setLoading(true)
    try {
      const { listModels } = await loadProviders()
      const list = await listModels(draft)
      setModels(list)
      if (!list.length) toast.error("No models found for this key.")
      else {
        if (!draft.model || !list.includes(draft.model)) setDraft((d) => ({ ...d, model: list[0] }))
        toast.success(`Connected. ${list.length} model${list.length > 1 ? "s" : ""} available.`)
      }
    } catch (err) {
      const e = err instanceof AiError ? err : new AiError(String(err))
      toast.error(e.message, { description: e.hint ?? (draft.provider === "openai" ? "For local Ollama, start it with OLLAMA_ORIGINS=* so the browser may connect." : undefined) })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
      <DialogContent className="flex max-h-[90dvh] flex-col gap-4 overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Connect an AI</DialogTitle>
          <DialogDescription>
            Optional. Lets the app suggest better bullets and run reviews here. You bring your own key. Requests go straight from this browser to the provider you pick. The app has no server.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor={ids.provider} className="text-xs text-muted-foreground">Provider</Label>
          <NativeSelect id={ids.provider} className="w-full" value={draft.provider} onChange={(e) => setProvider(e.target.value as ProviderId)}>
            {PROVIDERS.map((p) => (
              <NativeSelectOption key={p} value={p} disabled={p === "ondevice" && onDevice === "unavailable"}>
                {PROVIDER_INFO[p].label}
                {p === "ondevice" && onDevice === "unavailable" ? " — not available in this browser" : ""}
              </NativeSelectOption>
            ))}
          </NativeSelect>
          <p className="text-xs text-muted-foreground">{info.note}</p>
        </div>

        {draft.provider === "openai" && (
          <div className="grid gap-3 sm:grid-cols-[10rem_1fr]">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={ids.preset} className="text-xs text-muted-foreground">Service</Label>
              <NativeSelect
                id={ids.preset}
                className="w-full"
                value={OPENAI_PRESETS.find((p) => p.baseUrl === draft.baseUrl)?.baseUrl ?? ""}
                onChange={(e) => e.target.value && setDraft({ ...draft, baseUrl: e.target.value })}
              >
                {OPENAI_PRESETS.map((p) => (
                  <NativeSelectOption key={p.baseUrl} value={p.baseUrl}>{p.label}</NativeSelectOption>
                ))}
                <NativeSelectOption value="">Custom…</NativeSelectOption>
              </NativeSelect>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={ids.base} className="text-xs text-muted-foreground">API base URL</Label>
              <Input id={ids.base} type="url" value={draft.baseUrl} onChange={(e) => setDraft({ ...draft, baseUrl: e.target.value })} />
            </div>
          </div>
        )}

        {draft.provider !== "ondevice" && (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={ids.key} className="text-xs text-muted-foreground">
              API key{draft.provider === "openai" ? " (leave empty for local Ollama)" : ""}
            </Label>
            <Input id={ids.key} type="password" autoComplete="off" spellCheck={false} value={draft.apiKey} placeholder="Paste your key" onChange={(e) => setDraft({ ...draft, apiKey: e.target.value })} />
            {info.keyUrl && (
              <a href={info.keyUrl} target="_blank" rel="noopener noreferrer" className="flex w-fit items-center gap-1 text-xs text-primary underline-offset-4 hover:underline">
                Get a key <ExternalLink className="size-3" />
              </a>
            )}
          </div>
        )}

        {draft.provider !== "ondevice" && (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={ids.model} className="text-xs text-muted-foreground">Model</Label>
            <div className="flex gap-2">
              {models.length ? (
                <NativeSelect id={ids.model} className="w-full" value={draft.model} onChange={(e) => setDraft({ ...draft, model: e.target.value })}>
                  {models.map((m) => (
                    <NativeSelectOption key={m} value={m}>{m}</NativeSelectOption>
                  ))}
                </NativeSelect>
              ) : (
                <Input id={ids.model} value={draft.model} placeholder="Load the list, or type a model name" onChange={(e) => setDraft({ ...draft, model: e.target.value })} />
              )}
              <Button variant="outline" onClick={loadModels} disabled={loading || (info.needsKey && !draft.apiKey.trim())}>
                {loading && <Loader2 className="animate-spin" />} Load models
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">Loading the list also tests the connection.</p>
          </div>
        )}

        {draft.provider === "ondevice" && (
          <p className="rounded-lg border bg-muted/40 p-3 text-xs text-muted-foreground">
            Status: <span className="font-medium text-foreground">{onDevice}</span>. The first use may download the model (a few GB). Quality is lower than cloud models, so expect simpler suggestions.
          </p>
        )}

        {draft.provider !== "ondevice" && (
          <div className="flex items-start gap-2">
            <Switch id={ids.remember} checked={draft.remember} onCheckedChange={(remember) => setDraft({ ...draft, remember })} />
            <Label htmlFor={ids.remember} className="flex flex-col items-start gap-0.5 text-sm font-normal">
              Remember the key on this device
              <span className="text-xs text-muted-foreground">Off: it's forgotten when you close this tab. Don't turn this on for a shared computer.</span>
            </Label>
          </div>
        )}

        <div className="flex gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-900">
          <ShieldCheck className="size-4 shrink-0" aria-hidden />
          <p>Your name, email, phone and links are removed before anything is sent. Every suggestion is checked against your CV, and new numbers or skills are flagged before you can use them.</p>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="ghost"
            onClick={() => {
              forget()
              setSettingsOpen(false)
              toast("AI disconnected and key removed")
            }}
          >
            Disconnect
          </Button>
          <Button
            disabled={!isConfigured(draft)}
            onClick={() => {
              save({ ...draft, apiKey: draft.apiKey.trim(), model: draft.model.trim() })
              setSettingsOpen(false)
              toast.success("AI connected")
            }}
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
