import { useState, type ReactNode } from "react"
import { ArrowDown, ArrowUp, ChevronDown, Copy, MoreHorizontal, Plus, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { addItem, duplicateItem, insertItem, moveItem, removeItem, updateItem } from "@/lib/resume/edit"
import { blank, type ListSection, type ListSectionMap } from "@/lib/resume/schema"
import { cn } from "@/lib/utils"
import { useWorkspace } from "@/state/workspace"

type Props<S extends ListSection> = {
  section: S
  noun: string // "job", "school", ...
  titleOf: (item: ListSectionMap[S]) => string
  subtitleOf?: (item: ListSectionMap[S]) => string
  children: (item: ListSectionMap[S], update: (patch: Partial<ListSectionMap[S]>) => void) => ReactNode
}

/**
 * A list of collapsible entry cards with add, move, duplicate and delete
 * (with Undo). Works for any list section of the CV.
 */
export function EntryList<S extends ListSection>({ section, noun, titleOf, subtitleOf, children }: Props<S>) {
  const { resume, updateResume } = useWorkspace()
  const items = resume[section] as ListSectionMap[S][]
  // Entries start collapsed when there are several, so the form stays short.
  const [open, setOpen] = useState<Set<string>>(() => new Set(items.length <= 1 ? items.map((i) => i.id) : []))

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
      {items.map((item, index) => {
        const isOpen = open.has(item.id)
        const title = titleOf(item) || `New ${noun}`
        const subtitle = subtitleOf?.(item)
        const panelId = `entry-${item.id}`
        return (
          <div key={item.id} className="rounded-lg border bg-card">
            <div className="flex items-center gap-1 py-1 pr-1 pl-3">
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
              <Button variant="ghost" size="icon-sm" aria-label={`Move ${title} up`} disabled={index === 0} onClick={() => updateResume((r) => moveItem(r, section, item.id, -1))}>
                <ArrowUp />
              </Button>
              <Button variant="ghost" size="icon-sm" aria-label={`Move ${title} down`} disabled={index === items.length - 1} onClick={() => updateResume((r) => moveItem(r, section, item.id, 1))}>
                <ArrowDown />
              </Button>
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
          </div>
        )
      })}
      <Button variant="outline" onClick={add} className="self-start">
        <Plus /> Add {noun}
      </Button>
    </div>
  )
}
