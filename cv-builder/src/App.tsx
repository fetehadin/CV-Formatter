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
    
    // Education Array (One empty block ready for the user)
    education: [
      {
        id: crypto.randomUUID(),
        schoolname: "",
        eduStartMonth: "",
        eduStartYear: "",
        eduEndMonth: "",
        eduEndYear: "",
        program: "",
        eduDescription: ""
      }
    ],

    // Work Experience Array (One empty block ready for the user)
    experience: [
      {
        id: crypto.randomUUID(),
        company: "",
        workStartMonth: "",
        workStartYear: "",
        workEndMonth: "",
        workEndYear: "",
        profession: "",
        experienceDescription: ""
      }
    ],

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