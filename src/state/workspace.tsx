import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import { toast } from "sonner"
import type { Resume } from "@/lib/resume/schema"
import { loadWorkspace, saveWorkspace, STORAGE_KEY, normalizeWorkspace, type CvDocument, type Workspace } from "@/lib/resume/workspace"

type WorkspaceApi = {
  workspace: Workspace
  doc: CvDocument
  resume: Resume
  /** Apply a pure change to the active CV. */
  updateResume: (change: (r: Resume) => Resume) => void
  /** Apply a pure change to the whole workspace (documents, active id). */
  updateWorkspace: (change: (ws: Workspace) => Workspace) => void
}

const WorkspaceContext = createContext<WorkspaceApi | null>(null)

const SAVE_DELAY_MS = 300

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [workspace, setWorkspace] = useState<Workspace>(() => loadWorkspace())
  const saveFailed = useRef(false)

  // Debounced autosave: typing fast doesn't write to storage on every key.
  useEffect(() => {
    const timer = setTimeout(() => {
      const ok = saveWorkspace(workspace)
      if (!ok && !saveFailed.current) {
        toast.error("Couldn't save to this browser", {
          description: "Storage is full or disabled. Export a backup so you don't lose work.",
        })
      }
      saveFailed.current = !ok
    }, SAVE_DELAY_MS)
    return () => clearTimeout(timer)
  }, [workspace])

  // Another tab edited the same workspace: take its version.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEY || !e.newValue) return
      try {
        setWorkspace(normalizeWorkspace(JSON.parse(e.newValue)))
      } catch {
        // ignore malformed writes from elsewhere
      }
    }
    window.addEventListener("storage", onStorage)
    return () => window.removeEventListener("storage", onStorage)
  }, [])

  const updateWorkspace = useCallback((change: (ws: Workspace) => Workspace) => {
    setWorkspace((ws) => normalizeWorkspace(change(ws)))
  }, [])

  const updateResume = useCallback((change: (r: Resume) => Resume) => {
    setWorkspace((ws) => ({
      ...ws,
      documents: ws.documents.map((d) =>
        d.id === ws.activeId ? { ...d, resume: change(d.resume), updatedAt: new Date().toISOString() } : d,
      ),
    }))
  }, [])

  const value = useMemo<WorkspaceApi>(() => {
    const doc = workspace.documents.find((d) => d.id === workspace.activeId) ?? workspace.documents[0]
    return { workspace, doc, resume: doc.resume, updateResume, updateWorkspace }
  }, [workspace, updateResume, updateWorkspace])

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>
}

export function useWorkspace(): WorkspaceApi {
  const ctx = useContext(WorkspaceContext)
  if (!ctx) throw new Error("useWorkspace must be used inside <WorkspaceProvider>")
  return ctx
}
