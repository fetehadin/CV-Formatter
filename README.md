# CV-Formatter

A strict, high-performance React application designed to transform unstructured resume data into a professional, ATS-optimized classic engineering CV. Instead of a free-form builder, this tool acts as a rigid schema that forces data into a highly optimized, deterministic A4 blueprint.

**Live Demo:** https://cv-formatter-two.vercel.app/

## Features
- **Fluid Split-Pane Workspace:** Draggable editing and preview panes built for responsive desktop and mobile views.
- **Dynamic Auto-Scaling Preview:** Real-time observer calculations scale the A4 document to fit any screen without breaking text wrapping.
- **Native PDF Export:** CSS Paged Media rules configured for pixel-perfect, exact-A4 printing directly from the browser.
- **ATS-Optimized Layout:** Uses standard sans-serif typography, precise grid alignment for skills, and a clean DOM structure for parsing engines.

## Tech Stack
- React
- Vite
- Tailwind CSS

## Future Roadmap
Currently, this project operates as a strict data formatter. The long-term vision is to expand it into a comprehensive open-source CV maker, including:
- **Resume Analysis Engine:** Implementing content evaluation to score keyword density, impact phrasing, and overall ATS readability.
- **Modular Architecture:** Adding the ability to safely swap between multiple industry-standard templates without breaking data structure.
- **Data Portability:** Supporting raw JSON schema imports and exports.

## Local Development

```bash
# Clone the repository
git clone https://github.com/fetehadin/CV-Formatter.git

# Navigate into the directory
cd CV-Formatter

# Install dependencies (uses pnpm based on project lockfile)
pnpm install

# Start the development server
pnpm run dev
```
