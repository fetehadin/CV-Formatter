import { Check, Copy, ExternalLink } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { AI_CHATS, chatLink } from "@/lib/analysis/prompts"
import { copyText } from "@/lib/clipboard"

/**
 * Shows a ready prompt with "Copy" and "Open in …" buttons. Opening always
 * copies first, so the user can paste even when the chat app ignores the
 * pre-filled text.
 */
export function PromptPreview({ prompt }: { prompt: string }) {
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    const ok = await copyText(prompt)
    if (ok) {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } else {
      toast.error("Couldn't copy. Select the text and copy it by hand.")
    }
    return ok
  }

  const open = async (chat: (typeof AI_CHATS)[number]) => {
    await copy()
    const { href, prefilled } = chatLink(chat, prompt)
    window.open(href, "_blank", "noopener,noreferrer")
    toast.success(prefilled ? `Opened ${chat.name} with your prompt` : `Prompt copied. Paste it into ${chat.name}.`)
  }

  return (
    <div className="flex min-h-0 flex-col gap-3">
      <textarea
        readOnly
        value={prompt}
        aria-label="Generated prompt"
        className="min-h-56 flex-1 resize-none rounded-lg border bg-muted/40 p-3 font-mono text-xs leading-relaxed outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        onFocus={(e) => e.currentTarget.select()}
      />
      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={copy}>
          {copied ? <Check /> : <Copy />}
          {copied ? "Copied" : "Copy prompt"}
        </Button>
        {AI_CHATS.map((chat) => (
          <Button key={chat.name} variant="outline" onClick={() => open(chat)}>
            {chat.name} <ExternalLink />
          </Button>
        ))}
        <span className="ml-auto text-xs text-muted-foreground tabular-nums">{prompt.length.toLocaleString()} characters</span>
      </div>
    </div>
  )
}
