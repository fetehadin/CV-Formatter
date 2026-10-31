/** Saves text as a file through a temporary link. Nothing is uploaded. */
export function downloadFile(filename: string, content: string, type = "application/json") {
  const url = URL.createObjectURL(new Blob([content], { type }))
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/** "Abebe Kebede" -> "abebe-kebede" */
export function slug(s: string, fallback = "cv"): string {
  return (
    s
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, "-")
      .replace(/^-+|-+$/g, "") || fallback
  )
}
