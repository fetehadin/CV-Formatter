import './App.css'
import { useState, useEffect, useRef } from 'react'
import { ResumeForm } from './components/ResumeForm'
import { ResumePreview } from './components/ResumePreview'
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "./components/ui/resizable"

function App() {
  // CRITICAL FIX: Changed key to v2 to flush corrupted memory and fix the crash
  const [resumeData, setResumeData] = useState(() => {
    const savedData = localStorage.getItem("cvBuilderData_v2");
    return savedData ? JSON.parse(savedData) : { 
        fullname: "", email: "", country: "", phone: "", linkedin: "", github: "", 
        summary: "", 
        education: [{ id: crypto.randomUUID(), schoolname: "", eduStartMonth: "", eduStartYear: "", eduEndMonth: "", eduEndYear: "", program: "", eduDescription: "" }],
        experience: [{ id: crypto.randomUUID(), company: "", workStartMonth: "", workStartYear: "", workEndMonth: "", workEndYear: "", profession: "", experienceDescription: "" }],
        skills: "" 
    };
  });

  useEffect(() => {
    localStorage.setItem("cvBuilderData_v2", JSON.stringify(resumeData));
  }, [resumeData]);

  const [isEditMode, setIsEditMode] = useState(true);

  // --- NATIVE PDF EXPORT ---
  const downloadPDF = () => {
    window.print();
  };

  // --- DYNAMIC SCALING ENGINE ---
  const previewContainerRef = useRef(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const updateScale = (entries) => {
      for (let entry of entries) {
        const availableWidth = entry.contentRect.width - 40;
        const newScale = availableWidth < 794 ? availableWidth / 794 : 1;
        setScale(newScale);
      }
    };

    const observer = new ResizeObserver(updateScale);
    if (previewContainerRef.current) {
      observer.observe(previewContainerRef.current);
    }
    return () => observer.disconnect();
  }, []);

  return (
      <div className="flex flex-col min-h-screen w-full bg-slate-200 print-fullscreen">
          
          {/* TOP NAVIGATION BAR */}
          <div className="w-full bg-white shadow-sm p-4 flex justify-between items-center z-10 border-b hide-on-print">
              <h1 className="font-bold text-xl text-slate-800 tracking-wider">CV BUILDER</h1>
              <div className="flex gap-4">
                  {isEditMode ? (
                      <button onClick={() => setIsEditMode(false)} className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-6 rounded shadow transition-all">
                          Save & Preview
                      </button>
                  ) : (
                      <>
                          <button onClick={() => setIsEditMode(true)} className="bg-slate-600 hover:bg-slate-700 text-white font-bold py-2 px-6 rounded shadow transition-all">
                              ← Edit Resume
                          </button>
                          <button onClick={downloadPDF} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded shadow transition-all">
                              Download PDF
                          </button>
                      </>
                  )}
              </div>
          </div>

          {/* MAIN WORKSPACE */}
          <div className="w-full h-[calc(100vh-73px)] print-fullscreen bg-slate-300">
              
              {/* DESKTOP VIEW */}
              <div className="hidden md:block h-full w-full">
                  <ResizablePanelGroup direction="horizontal" className="w-full h-full">
                      
                      <ResizablePanel defaultSize={45} minSize={25} className="h-full bg-gray-50 hide-on-print border-r">
                          <div className="h-full overflow-y-auto">
                              <ResumeForm data={resumeData} updateData={setResumeData} />
                          </div>
                      </ResizablePanel>
                      
                      <ResizableHandle withHandle className="bg-slate-300 hide-on-print cursor-col-resize hover:bg-blue-500 transition-colors w-2" />
                      
                      <ResizablePanel defaultSize={55} minSize={30} className="relative h-full print-fullscreen bg-slate-300">
                          <div ref={previewContainerRef} className="absolute inset-0 overflow-auto flex justify-center py-10 transition-all">
                              <div 
                                  className="bg-white shadow-2xl print-no-shadow origin-top transition-transform ease-out shrink-0"
                                  style={{ 
                                      width: '794px', 
                                      minHeight: '1123px', 
                                      transform: `scale(${scale})`,
                                      marginBottom: `-${1123 * (1 - scale)}px`
                                  }} 
                              >
                                  <ResumePreview data={resumeData} />
                              </div>
                          </div>
                      </ResizablePanel>

                  </ResizablePanelGroup>
              </div>

              {/* MOBILE VIEW */}
              <div className="block md:hidden h-full">
                  {isEditMode ? (
                      <div className="w-full h-full overflow-y-auto bg-gray-50 hide-on-print">
                          <ResumeForm data={resumeData} updateData={setResumeData} />
                      </div>
                  ) : (
                      <div ref={previewContainerRef} className="w-full h-full overflow-y-auto flex justify-center py-6 print-fullscreen overflow-x-hidden">
                          <div 
                              className="bg-white shadow-2xl print-no-shadow origin-top shrink-0"
                              style={{ 
                                  width: '794px', 
                                  minHeight: '1123px', 
                                  transform: `scale(${scale})`,
                                  marginBottom: `-${1123 * (1 - scale)}px`
                              }} 
                          >
                              <ResumePreview data={resumeData} />
                          </div>
                      </div>
                  )}
              </div>

          </div>
      </div>
  )
}

export default App