import { useEffect, useState, type ReactNode } from "react"
import { ChevronDown, Copy, MoreHorizontal, Plus, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { DragHandle, draggingClass, SortableList, useSortableRow } from "@/components/ui/sortable"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { addItem, duplicateItem, insertItem, moveItemTo, removeItem, updateItem } from "@/lib/resume/edit"
import { blank, type ListSection, type ListSectionMap } from "@/lib/resume/schema"
import { cn } from "@/lib/utils"
import { useEditorNav } from "@/state/editor-nav"
import { useWorkspace } from "@/state/workspace"

/** Last jump request already handled, shared by all lists so remounts don't re-scroll. */
let handledSeq = 0

type Props<S extends ListSection> = {
  section: S
  noun: string // "job", "school", ...
  titleOf: (item: ListSectionMap[S]) => string
  subtitleOf?: (item: ListSectionMap[S]) => string
  children: (item: ListSectionMap[S], update: (patch: Partial<ListSectionMap[S]>) => void) => ReactNode
}

/** One entry card. The row needs its own hook, so it lives in its own component. */
function SortableRow({ id, label, flash, children }: { id: string; label: string; flash: boolean; children: (handle: ReactNode) => ReactNode }) {
  const row = useSortableRow(id)
  return (
    <div ref={row.ref} style={row.style} id={`entry-card-${id}`} className={cn("scroll-mt-4 rounded-lg border bg-card transition-shadow duration-500", flash && "ring-3 ring-primary/40", row.isDragging && draggingClass)}>
      {children(<DragHandle handle={row.handle} label={label} />)}
    </div>
  )
}

/**
 * A list of collapsible entry cards with add, drag to reorder, duplicate and delete
 * (with Undo). Works for any list section of the CV.
 */
export function EntryList<S extends ListSection>({ section, noun, titleOf, subtitleOf, children }: Props<S>) {
  const { resume, updateResume } = useWorkspace()
  const items = resume[section] as ListSectionMap[S][]
  // Entries start collapsed when there are several, so the form stays short.
  const [open, setOpen] = useState<Set<string>>(() => new Set(items.length <= 1 ? items.map((i) => i.id) : []))

  // Jump requests from the check panel: open the entry, scroll to it, flash it.
  const { request } = useEditorNav()
  const [flash, setFlash] = useState<string | null>(null)
  useEffect(() => {
    if (!request?.itemId || request.section !== section || request.seq <= handledSeq) return
    if (!items.some((i) => i.id === request.itemId)) return
    handledSeq = request.seq
    const id = request.itemId
    setOpen((prev) => new Set(prev).add(id))
    setFlash(id)
    requestAnimationFrame(() => document.getElementById(`entry-card-${id}`)?.scrollIntoView({ behavior: "smooth", block: "start" }))
  }, [request, section, items])

  useEffect(() => {
    if (!flash) return
    const t = setTimeout(() => setFlash(null), 1600)
    return () => clearTimeout(t)
  }, [flash])

  const toggle = (id: string) =>
    setOpen((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const add = () => {
    const item = blank[section]() as ListSectionMap[S]
    updateResume((r) => addItem(r, section, item))
    setOpen((prev) => new Set(prev).add(item.id))
  }

  const remove = (item: ListSectionMap[S], index: number) => {
    updateResume((r) => removeItem(r, section, item.id))
    toast(`Deleted ${titleOf(item) || `this ${noun}`}`, {
      action: { label: "Undo", onClick: () => updateResume((r) => insertItem(r, section, item, index)) },
    })
  }

  return (
    <div className="flex flex-col gap-3">
      <SortableList ids={items.map((i) => i.id)} label={(id) => titleOf(items.find((i) => i.id === id)!) || `new ${noun}`} onMove={(id, over) => updateResume((r) => moveItemTo(r, section, id, over))}>
        {items.map((item, index) => {
          const isOpen = open.has(item.id)
          const title = titleOf(item) || `New ${noun}`
          const subtitle = subtitleOf?.(item)
          const panelId = `entry-${item.id}`
          return (
            <SortableRow key={item.id} id={item.id} label={title} flash={flash === item.id}>
              {(handle) => (
                <>
                  <div className="flex items-center gap-1 py-1 pr-1 pl-1">
                    {handle}
                    <button
                      type="button"
                      onClick={() => toggle(item.id)}
                      aria-expanded={isOpen}
                      aria-controls={panelId}
                      className="flex min-w-0 flex-1 items-center gap-2 rounded-md py-1.5 text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                    >
                      <ChevronDown className={cn("size-4 shrink-0 text-muted-foreground transition-transform", !isOpen && "-rotate-90")} />
                      <span className="min-w-0">
                        <span className={cn("block truncate text-sm font-medium", !titleOf(item) && "text-muted-foreground")}>{title}</span>
                        {subtitle && <span className="block truncate text-xs text-muted-foreground">{subtitle}</span>}
                      </span>
                    </button>
                    <DropdownMenu>
                      <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label={`More actions for ${title}`} />}>
                        <MoreHorizontal />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => updateResume((r) => duplicateItem(r, section, item.id))}>
                          <Copy /> Duplicate
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem variant="destructive" onClick={() => remove(item, index)}>
                          <Trash2 /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  {isOpen && (
                    <div id={panelId} className="flex flex-col gap-4 border-t p-4">
                      {children(item, (patch) => updateResume((r) => updateItem(r, section, item.id, patch)))}
                    </div>
                  )}
                </>
              )}
            </SortableRow>
          )
        })}
      </SortableList>
      <Button variant="outline" onClick={add} className="self-start">
        <Plus /> Add {noun}
      </Button>
    </div>
  )
}
