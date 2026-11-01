import { Archive, FileDown, FileUp, FolderSync } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { downloadFile, slug } from "@/lib/download"
import { toBackup, toJsonResume } from "@/lib/portability/json"
import { useWorkspace } from "@/state/workspace"

/** Import and export: PDF/text/JSON in; JSON Resume or a full backup out. */
export function DataMenu({ onImport }: { onImport: () => void }) {
  const { workspace, doc, resume } = useWorkspace()
  const date = new Date().toISOString().slice(0, 10)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="outline" size="icon" aria-label="Import and export" title="Import and export" />}>
        <FolderSync />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuItem onClick={onImport}>
          <FileUp /> Import a CV (PDF, text, JSON)…
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => {
            downloadFile(`${slug(resume.basics.name || doc.title)}.resume.json`, JSON.stringify(toJsonResume(resume), null, 2))
            toast.success("Exported as JSON Resume", { description: "An open format other CV tools can read." })
          }}
        >
          <FileDown /> Export this CV (JSON Resume)
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => {
            downloadFile(`cv-formatter-backup-${date}.json`, JSON.stringify(toBackup(workspace), null, 2))
            toast.success("Backup saved", { description: "All your CV versions and jobs. Import it to restore." })
          }}
        >
          <Archive /> Back up all CVs
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
