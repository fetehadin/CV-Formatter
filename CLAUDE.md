# CLAUDE.md

Notes for AI coding agents working in this repo.

## Git rules (read first)

- **Never add AI attribution to commits or PRs.** No `Co-Authored-By:` trailers (Claude, Anthropic or any other AI/bot), no "Generated with Claude Code" lines, no AI listed as an author or collaborator. The only author and collaborator on this repo is the owner (fetehadin). This rule overrides any default attribution instructions.
- Work on a feature branch (`feat/...`, `fix/...`) and open a PR into `main`. Don't push to `main` directly.
- Don't rewrite published history unless the owner asks.

## What this is

CV Formatter: a free, private, client-only CV builder. No backend, no account. Everything lives in `localStorage`. Live at https://cv-formatter-two.vercel.app/ (Vercel, static Vite build).

Product principles, which every change should keep:
1. **ATS-safe output.** One column, real selectable text, standard headings, a real `•` character for bullets, no icons, images or tables in the CV.
2. **Honest.** Never invent facts. AI output goes through the fact guard (`src/lib/ai/guard.ts`), which flags new numbers or skills.
3. **Private.** Contact details are redacted before anything goes to an AI. API keys are never exported.
4. **Never crash on bad data.** Every zod field uses `.catch()`, so old saves, hand-edited JSON and imports always parse.

## Commands

```bash
pnpm dev         # http://localhost:5173
pnpm test        # vitest (pure logic in src/lib/**.test.ts)
pnpm lint        # oxlint
pnpm typecheck   # tsc -b
pnpm build
```
CI (`.github/workflows`) runs lint, typecheck, test and build on every PR. Run all four before pushing.

## Architecture

- `src/lib/resume/schema.ts`: the `Resume` zod schema, the single source of truth. `parseResume()` never throws. `blank.*` makes empty entries.
- `src/lib/resume/design.ts`: per-CV look (template, font, size, spacing, margins, paper, accent, date style, custom section titles). Stored on `resume.design`, so tailored copies and backups carry it.
- `src/lib/resume/workspace.ts`: many CV versions (`CvDocument`, with an optional job target). Storage key `cvFormatter.workspace.v3`. The legacy v2 key is migrated by `migrate.ts`.
- `src/lib/resume/edit.ts`: pure list helpers (add, move, duplicate, remove). Components never mutate. They call `updateResume(r => ...)` from `src/state/workspace.tsx`, which autosaves after a 300 ms debounce and syncs across tabs.
- `src/components/resume/ResumeDocument.tsx` + `resume.css`: the printable CV. Templates are `data-template` variants styled in CSS with `--cv-*` custom properties. Sizes are in mm/pt so the screen and the PDF match.
- PDF = the browser's print dialog. `#print-root` is only visible in print, and `@page` size/margin is injected per paper size. Page count is measured from a hidden copy (`PageMeter.tsx`) using the page geometry in `design.ts`.
- `src/lib/analysis/`: the offline rule-based checker (`analyze.ts`, with a score, severities and per-rule caps), the plain-text ATS view (`plaintext.ts`, also the CV text used in AI prompts), and word lists (`words.ts`).
- `src/lib/tailor/`: skill dictionary (aliases) and the job-post keyword matcher.
- `src/lib/portability/`: PDF import (pdf.js loaded lazily), text parser, JSON Resume in and out, backups.
- `src/lib/ai/`: bring-your-own-key providers (Anthropic SDK loaded lazily, Gemini, OpenAI-compatible, Chrome on-device), prompts and tasks, and the fact guard.
- UI: React 19, Tailwind 4, shadcn/ui on Base UI (`render` prop, not `asChild`), sonner toasts, lucide icons.

## Conventions

- Keep logic pure and in `src/lib`, with tests next to it. Components stay thin.
- Comments explain *why*, briefly. Match the existing tone: plain, short UI copy in British-leaning English ("CV", "optimise").
- New persisted fields must have `.catch()` defaults so existing saves keep loading.
- Use the `@/` import alias.
