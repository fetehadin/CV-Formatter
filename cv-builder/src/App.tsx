import './App.css'
import {useState} from 'react'
// import { Button } from './components/ui/button'
import {ResumeForm} from './components/ResumeForm'
import {ResumePreview} from './components/ResumePreview'



function App() {

  const [resumeData, setResumeData] = useState({ fullname: "", email: "", country: "", phone: "", linkedin: "", github: ""});

  return (
      <>
        <div className="flex min-h-svh flex-row w-full items-center justify-center">
            <ResumeForm  className="w-1/2" data={resumeData} updateData ={setResumeData}/>
            <ResumePreview className="w-1/2"  data={resumeData}/>
        </div>
      </>
  )
}

export default App
