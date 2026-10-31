import { useState } from "react"
import { Check, ChevronsUpDown, Copy, FilePlus2, Pencil, Trash2 } from "lucide-react"
import { toast } from "sonner"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { addBlankDocument, deleteDocument, duplicateDocument, renameDocument, setActive, type CvDocument, type JobStatus } from "@/lib/resume/workspace"
import { cn } from "@/lib/utils"
import { useWorkspace } from "@/state/workspace"

export const STATUS_LABEL: Record<JobStatus, string> = {
  saved: "Saved",
  applied: "Applied",
  interview: "Interview",
  offer: "Offer",
  rejected: "Rejected",
}

export const STATUS_TONE: Record<JobStatus, string> = {
  saved: "bg-muted text-muted-foreground",
  applied: "bg-sky-100 text-sky-800",
  interview: "bg-violet-100 text-violet-800",
  offer: "bg-emerald-100 text-emerald-800",
  rejected: "bg-red-100 text-red-800",
}

export function StatusPill({ status }: { status: JobStatus }) {
  return <span className={cn("rounded-full px-1.5 py-px text-[10px] font-medium", STATUS_TONE[status])}>{STATUS_LABEL[status]}</span>
}

/** Base CVs first, each followed by the copies tailored from it. */
function grouped(docs: CvDocument[]) {
  const ids = new Set(docs.map((d) => d.id))
  const bases = docs.filter((d) => !d.baseId || !ids.has(d.baseId))
  return bases.map((base) => ({ base, copies: docs.filter((d) => d.baseId === base.id) }))
}

export function DocumentSwitcher() {
  const { workspace, doc, updateWorkspace } = useWorkspace()
  const [renaming, setRenaming] = useState(false)
  const [title, setTitle] = useState("")
  const [confirmDelete, setConfirmDelete] = useState(false)

  const item = (d: CvDocument, nested: boolean) => (
    <DropdownMenuItem key={d.id} onClick={() => updateWorkspace((ws) => setActive(ws, d.id))} className={cn(nested && "pl-6")}>
      <Check className={cn(d.id !== doc.id && "invisible")} />
      <span className="min-w-0 flex-1 truncate">{d.title}</span>
      {d.job && <StatusPill status={d.job.status} />}
    </DropdownMenuItem>
  )

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger render={<Button variant="ghost" className="max-w-[45vw] min-w-0 gap-1.5 px-2 md:max-w-xs" />}>
          <span className="truncate">{doc.title}</span>
          {doc.job && <StatusPill status={doc.job.status} />}
          <ChevronsUpDown className="text-muted-foreground" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-72">
          <DropdownMenuGroup>
            <DropdownMenuLabel>Your CVs</DropdownMenuLabel>
            {grouped(workspace.documents).flatMap(({ base, copies }) => [item(base, false), ...copies.map((c) => item(c, true))])}
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => {
              setTitle(doc.title)
              setRenaming(true)
            }}
          >
            <Pencil /> Rename…
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => updateWorkspace((ws) => duplicateDocument(ws, doc.id))}>
            <Copy /> Duplicate
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => updateWorkspace((ws) => addBlankDocument(ws))}>
            <FilePlus2 /> New blank CV
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onClick={() => setConfirmDelete(true)}>
            <Trash2 /> Delete this CV…
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={renaming} onOpenChange={setRenaming}>
        <DialogContent className="sm:max-w-sm">
          <form
            className="flex flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault()
              updateWorkspace((ws) => renameDocument(ws, doc.id, title))
              setRenaming(false)
            }}
          >
            <DialogHeader>
              <DialogTitle>Rename CV</DialogTitle>
            </DialogHeader>
            <Input autoFocus aria-label="CV name" value={title} onChange={(e) => setTitle(e.target.value)} />
            <DialogFooter>
              <Button type="submit">Save</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete “{doc.title}”?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes this CV version from this browser. Other versions, including copies made from it, are kept. Export a backup first if you might need it.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                const name = doc.title
                updateWorkspace((ws) => deleteDocument(ws, doc.id))
                setConfirmDelete(false)
                toast(`Deleted “${name}”`)
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
