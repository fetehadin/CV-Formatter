import './App.css'
import { useState } from 'react'
import { ResumeForm } from './components/ResumeForm'
import { ResumePreview } from './components/ResumePreview'

function App() {
  const [resumeData, setResumeData] = useState({ 
    // Personal Info
    fullname: "", 
    email: "", 
    country: "", 
    phone: "", 
    linkedin: "", 
    github: "", 
    
    // Summary
    summary: "", 
    
    // Education
    schoolname: "",
    eduStartDate: "",
    eduEndDate: "",
    program: "",
    eduDescription: "",

    // Work Experience
    company: "",
    workStartDate: "",
    workEndDate: "",
    profession: "",
    experienceDescription: "",

    // Skills
    skills: "" 
  });

  return (
      <div className="flex min-h-svh flex-row w-full items-center justify-center">
          <ResumeForm data={resumeData} updateData={setResumeData} />
          <ResumePreview data={resumeData} />
      </div>
  )
}

export default App