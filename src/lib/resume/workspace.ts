import { z } from "zod"
import { emptyResume, newId, parseResume, ResumeSchema, type Resume } from "./schema"
import { migrateV2 } from "./migrate"

/**
 * A workspace holds every CV version the user has, saved in localStorage.
 * Nothing leaves the browser.
 */

export const JOB_STATUSES = ["saved", "applied", "interview", "offer", "rejected"] as const
export type JobStatus = (typeof JOB_STATUSES)[number]

const text = z.string().catch("")

export const JobTargetSchema = z.object({
  company: text,
  title: text,
  url: text,
  description: text,
  status: z.enum(JOB_STATUSES).catch("saved"),
  notes: text,
})
export type JobTarget = z.infer<typeof JobTargetSchema>

export const CvDocumentSchema = z.object({
  id: z.string().catch(newId),
  title: z.string().catch("My CV"),
  /** The base CV this one was copied from, if any. */
  baseId: z.string().nullable().catch(null),
  job: JobTargetSchema.nullable().catch(null),
  resume: ResumeSchema.catch(() => parseResume({})),
  createdAt: z.string().catch(() => new Date().toISOString()),
  updatedAt: z.string().catch(() => new Date().toISOString()),
})
export type CvDocument = z.infer<typeof CvDocumentSchema>

export const WorkspaceSchema = z.object({
  version: z.literal(3).catch(3),
  activeId: z.string().catch(""),
  documents: z.array(CvDocumentSchema).catch([]),
})
export type Workspace = z.infer<typeof WorkspaceSchema>

export const STORAGE_KEY = "cvFormatter.workspace.v3"
export const LEGACY_KEY = "cvBuilderData_v2"

export function newDocument(resume: Resume = emptyResume(), extra: Partial<CvDocument> = {}): CvDocument {
  const now = new Date().toISOString()
  return { id: newId(), title: "My CV", baseId: null, job: null, resume, createdAt: now, updatedAt: now, ...extra }
}

/** Guarantees at least one document and a valid activeId. */
export function normalizeWorkspace(input: unknown): Workspace {
  const ws = WorkspaceSchema.parse(input ?? {})
  if (ws.documents.length === 0) ws.documents.push(newDocument())
  if (!ws.documents.some((d) => d.id === ws.activeId)) ws.activeId = ws.documents[0].id
  return ws
}

function safeJson(raw: string | null): unknown {
  if (!raw) return null
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

/**
 * Loads the workspace. Order: current key, then the old v2 key (migrated),
 * then a fresh workspace. Corrupt data never crashes the app.
 * The legacy key is left in place as a backup.
 */
export function loadWorkspace(storage: Pick<Storage, "getItem"> = localStorage): Workspace {
  const current = safeJson(storage.getItem(STORAGE_KEY))
  if (current) return normalizeWorkspace(current)

  const legacy = safeJson(storage.getItem(LEGACY_KEY))
  if (legacy) {
    const resume = migrateV2(legacy)
    return normalizeWorkspace({ documents: [newDocument(resume)] })
  }
  return normalizeWorkspace(null)
}

export function saveWorkspace(ws: Workspace, storage: Pick<Storage, "setItem"> = localStorage): boolean {
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(ws))
    return true
  } catch {
    return false // quota exceeded or storage disabled (private mode)
  }
}

// --- Document operations (pure: they return a new workspace) ---

const touch = () => new Date().toISOString()

export function emptyJob(patch: Partial<JobTarget> = {}): JobTarget {
  return { company: "", title: "", url: "", description: "", status: "saved", notes: "", ...patch }
}

/** "Chapa – Frontend Engineer", falling back to whatever is known. */
export function jobLabel(job: Pick<JobTarget, "company" | "title">): string {
  return [job.company.trim(), job.title.trim()].filter(Boolean).join(" – ") || "Untitled job"
}

export function setActive(ws: Workspace, id: string): Workspace {
  return ws.documents.some((d) => d.id === id) ? { ...ws, activeId: id } : ws
}

/** Copies a CV for one job application and switches to the copy. */
export function createTailoredCopy(ws: Workspace, fromId: string, job: JobTarget): Workspace {
  const from = ws.documents.find((d) => d.id === fromId)
  if (!from) return ws
  const copy = newDocument(structuredClone(from.resume), {
    title: jobLabel(job),
    baseId: from.baseId ?? from.id,
    job,
  })
  return { ...ws, activeId: copy.id, documents: [...ws.documents, copy] }
}

export function duplicateDocument(ws: Workspace, id: string): Workspace {
  const from = ws.documents.find((d) => d.id === id)
  if (!from) return ws
  const copy = newDocument(structuredClone(from.resume), {
    title: `${from.title} (copy)`,
    baseId: from.baseId,
    job: from.job ? { ...from.job } : null,
  })
  return { ...ws, activeId: copy.id, documents: [...ws.documents, copy] }
}

export function addBlankDocument(ws: Workspace, title = "New CV"): Workspace {
  const doc = newDocument(undefined, { title })
  return { ...ws, activeId: doc.id, documents: [...ws.documents, doc] }
}

/** Never leaves the workspace empty: deleting the last CV creates a blank one. */
export function deleteDocument(ws: Workspace, id: string): Workspace {
  const documents = ws.documents.filter((d) => d.id !== id)
  if (documents.length === 0) documents.push(newDocument())
  const activeId = ws.activeId === id ? documents[0].id : ws.activeId
  return { ...ws, activeId, documents }
}

export function renameDocument(ws: Workspace, id: string, title: string): Workspace {
  return {
    ...ws,
    documents: ws.documents.map((d) => (d.id === id ? { ...d, title: title.trim() || d.title, updatedAt: touch() } : d)),
  }
}

export function updateJob(ws: Workspace, id: string, patch: Partial<JobTarget>): Workspace {
  return {
    ...ws,
    documents: ws.documents.map((d) => (d.id === id ? { ...d, job: { ...(d.job ?? emptyJob()), ...patch }, updatedAt: touch() } : d)),
  }
}
