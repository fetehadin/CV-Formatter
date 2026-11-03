import { BACKUP_FORMAT, readJson } from "./json"
import type { Workspace } from "@/lib/resume/workspace"

/**
 * Moves CVs from the old address to the new one. A new domain means new
 * browser storage, so the backup travels in the URL fragment (`#transfer=`),
 * which browsers never send to a server. The receiving app asks before
 * adding anything, and never overwrites.
 */

export const TRANSFER_PARAM = "transfer"

function toBase64Url(text: string): string {
  const bytes = new TextEncoder().encode(text)
  let binary = ""
  // Chunked, so big workspaces don't overflow the call stack.
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
}

function fromBase64Url(b64: string): string {
  const binary = atob(b64.replace(/-/g, "+").replace(/_/g, "/"))
  return new TextDecoder().decode(Uint8Array.from(binary, (c) => c.charCodeAt(0)))
}

export function transferUrl(baseUrl: string, ws: Workspace): string {
  const payload = JSON.stringify({ format: BACKUP_FORMAT, exportedAt: new Date().toISOString(), workspace: ws })
  return `${baseUrl}/#${TRANSFER_PARAM}=${toBase64Url(payload)}`
}

/** The workspace carried in a `#transfer=` fragment, or null if there is none or it's unreadable. */
export function readTransfer(hash: string): Workspace | null {
  const match = hash.match(new RegExp(`^#${TRANSFER_PARAM}=([A-Za-z0-9_-]+)$`))
  if (!match) return null
  try {
    const data = readJson(fromBase64Url(match[1]))
    return data.kind === "backup" ? data.workspace : null
  } catch {
    return null
  }
}
