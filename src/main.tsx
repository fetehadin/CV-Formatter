import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import App from "./App"
import { Toaster } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"
import { WorkspaceProvider } from "@/state/workspace"
import "./index.css"

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <WorkspaceProvider>
      <TooltipProvider>
        <App />
        <Toaster position="bottom-center" />
      </TooltipProvider>
    </WorkspaceProvider>
  </StrictMode>,
)
