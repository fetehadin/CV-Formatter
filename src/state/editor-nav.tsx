import { createContext, useContext, type ReactNode } from "react"
import type { IssueTarget } from "@/lib/analysis/analyze"

/**
 * Lets any panel ask the editor to open a section (and entry) and scroll to it.
 * `seq` increases on every request so asking for the same place twice still works.
 */
export type NavRequest = IssueTarget & { seq: number }

type EditorNav = { request: NavRequest | null; goTo: (target: IssueTarget) => void }

const EditorNavContext = createContext<EditorNav>({ request: null, goTo: () => {} })

export function EditorNavProvider({ value, children }: { value: EditorNav; children: ReactNode }) {
  return <EditorNavContext.Provider value={value}>{children}</EditorNavContext.Provider>
}

export function useEditorNav(): EditorNav {
  return useContext(EditorNavContext)
}
