import { useEffect } from "react"
import { ArrowRight } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { mergeWorkspace } from "@/lib/portability/json"
import { readTransfer, transferUrl } from "@/lib/portability/transfer"
import { APP_NAME, APP_URL, isOldHost } from "@/lib/site"
import { useWorkspace } from "@/state/workspace"

/**
 * The app moved to its own domain. Storage is per domain, so on the old
 * address this offers to carry the user's CVs across; on the new one it
 * picks them up (after asking).
 */
export function MoveNotice() {
  const { workspace, updateWorkspace } = useWorkspace()
  const old = isOldHost(window.location.hostname)

  useEffect(() => {
    if (old) return
    const pickUp = () => {
      const incoming = readTransfer(window.location.hash)
      if (!incoming) return
      // Drop the CV data from the address bar and history straight away.
      history.replaceState(null, "", window.location.pathname + window.location.search)
      const n = incoming.documents.length
      toast(`Add ${n} CV${n > 1 ? "s" : ""} from your old address?`, {
        description: "They'll sit next to anything already here. Nothing is overwritten.",
        duration: Infinity,
        action: {
          label: "Add them",
          onClick: () => {
            updateWorkspace((ws) => mergeWorkspace(ws, incoming))
            toast.success(`Moved ${n} CV${n > 1 ? "s" : ""}. Welcome to ${APP_NAME}.`)
          },
        },
        cancel: { label: "Not now", onClick: () => {} },
      })
    }
    pickUp()
    // The link may also be opened in a tab that already has the app.
    window.addEventListener("hashchange", pickUp)
    return () => window.removeEventListener("hashchange", pickUp)
  }, [old, updateWorkspace])

  if (!old) return null
  return (
    <div role="status" className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 border-b bg-emerald-50 px-4 py-2 text-sm text-emerald-950">
      <span>
        <strong>{APP_NAME}</strong> has moved to <strong>{APP_URL.replace("https://", "")}</strong>. Your CVs are saved in this browser, so bring them with you.
      </span>
      <Button size="sm" onClick={() => (window.location.href = transferUrl(APP_URL, workspace))}>
        Move my CVs <ArrowRight />
      </Button>
    </div>
  )
}
