import { describe, expect, it } from "vitest"
import { parseResume } from "@/lib/resume/schema"
import { newDocument, normalizeWorkspace } from "@/lib/resume/workspace"
import { readTransfer, transferUrl } from "./transfer"

describe("transfer", () => {
  it("round-trips a workspace through the URL fragment, including non-Latin text", () => {
    const ws = normalizeWorkspace({ documents: [newDocument(parseResume({ basics: { name: "ሃና በቀለ" }, summary: "x".repeat(50_000) }), { title: "Mine" })] })
    const url = transferUrl("https://cv.fetehadin.com", ws)
    expect(url.startsWith("https://cv.fetehadin.com/#transfer=")).toBe(true)
    const back = readTransfer(new URL(url).hash)
    expect(back?.documents[0].title).toBe("Mine")
    expect(back?.documents[0].resume.basics.name).toBe("ሃና በቀለ")
  })

  it("ignores other or broken fragments", () => {
    expect(readTransfer("")).toBeNull()
    expect(readTransfer("#section")).toBeNull()
    expect(readTransfer("#transfer=!!!")).toBeNull()
    expect(readTransfer("#transfer=bm90IGpzb24")).toBeNull()
  })
})
