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
