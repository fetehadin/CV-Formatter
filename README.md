# CV Formatter

A free, private CV builder that helps you write an ATS-friendly CV and tailor it to each job **without inventing anything**. Everything runs in your browser. There is no account, no server, and your CV never leaves your device unless you connect an AI yourself.

**Live demo:** https://cv-formatter-two.vercel.app/

## Why

- 77% of job seekers worry an applicant tracking system (ATS) filters them out before a person reads their CV.
- Recruiters prefer CVs tailored to the job, but most people spend under 30 minutes tailoring.
- AI-padded CVs are making recruiters suspicious. Fake keywords hurt more than they help.

CV Formatter checks your CV, shows how it matches a job, and helps you reword it honestly.

## Features

**Write**
- A structured editor: experience, education, projects, skills, certifications, languages
- Add, reorder, duplicate and delete entries (with Undo); reorder whole sections
- Live A4 preview, with markers where page 2 starts
- One-column, text-based PDF (via your browser's "Save as PDF") that ATS can read

**Design**
- Four ATS-safe templates: Classic, Modern, Compact and Elegant
- Six system fonts (Arial, Calibri, Verdana, Georgia, Garamond, Times New Roman), text size 9–12 pt, accent colour
- Spacing, margins, A4 or US Letter, and date style (Sep 2022 / September 2022 / 09/2022)
- Rename section titles (Check warns if a title is one ATS may not recognise)
- **Fit to one page**: finds the least drastic spacing, margin and size change that fits, measured on the real layout
- Each CV version keeps its own design, or use one design on all of them

**Check** (offline, rule-based)
- Score out of 100 with clear fixes: weak openers ("Responsible for…"), missing numbers, pronouns, clichés, dates, duplicate skills, length
- "Fix" jumps straight to the problem in the editor
- "What an ATS reads": your CV as plain text in reading order

**Tailor** (offline)
- Paste a job post to see which keywords you cover, split into required / mentioned / nice-to-have
- Knows ~200 skills and their spellings (JS = JavaScript, k8s = Kubernetes)
- Flags skills you list but never show in your experience
- Separate CV versions per job, each with an application status

**AI, optional and honest**
- Copy-ready prompts for ChatGPT, Claude or Gemini, built from your CV and the check results
- Or connect your own key: Anthropic, Google Gemini, any OpenAI-compatible API (OpenAI, Groq, OpenRouter, local Ollama), or Chrome's on-device model (experimental)
- "Improve with AI" for bullets and "Draft with AI" for the summary
- **Fact guard:** every suggestion is checked against your CV, and new numbers or skills are flagged before you can use them
- Your name, email, phone and links are never sent

**Your data**
- Import an existing CV from a PDF (it also shows how readable the PDF is for ATS), pasted text, or JSON
- Export to [JSON Resume](https://jsonresume.org), or back up and restore every version

## Tech stack

React 19, TypeScript, Vite, Tailwind CSS 4, shadcn/ui (Base UI), zod, pdf.js (loaded on demand), Anthropic TypeScript SDK (loaded on demand), Vitest, oxlint.

## Development

```bash
pnpm install
pnpm dev          # http://localhost:5173
pnpm test         # unit tests
pnpm lint && pnpm typecheck
pnpm build
```

### Project layout

```
src/lib/resume/      CV data model (zod), design + page geometry, storage + migration, formatting, edit helpers
src/lib/analysis/    CV checker, plain-text (ATS) view, prompt builders
src/lib/tailor/      skills dictionary and job-matching engine
src/lib/portability/ PDF/text parser, JSON Resume, backups
src/lib/ai/          AI providers, prompts, fact guard
src/components/      UI (editor, preview, design, check, tailor, data, ai)
```

## Privacy

CVs are stored in your browser's localStorage. API keys are kept in sessionStorage (forgotten when the tab closes) unless you choose to remember them, and are never included in exports. With an AI connected, the CV text (without contact details) goes directly from your browser to the provider you chose.
