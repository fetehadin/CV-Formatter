import React from "react";
import {Button} from "./ui/button";

export function ResumeForm({data, updateData}){
    
    const [activeSection, setActiveSection] = React.useState("personal")

    const handleChange = (e) => {
        const {name, value} = e.target;

        updateData((prevData)=>({
            ...prevData,
            [name]: e.target.value,
            // email: e.target.value
        }))
    }

    const toggleSection = (section)=>{
        setActiveSection(activeSection == section ? "" : section)
    }


    return(

        <div className="w-1/2 p-4 h-screen overflow-y-auto bg-gray-50 border-r ">
            {/* Section Personal info */}
            <div className="mb-4 border rounded shadow-sm bg-white">
                <Button 
                    variant = "ghost"
                    onClick={()=>toggleSection("personal")} 
                    className="w-full flex justify-between py-6 rounded-b-none text-lg font-bold">
                        Personal Information
                        <span>{activeSection == "personal"? "▼" : "▶"}</span>
                </Button>
                {activeSection == "personal" && (
                    <div className="p-4 flex flex-col gap-3 border-t">
                        <input type="text" name="fullname" value={data.fullname || ""} onChange={handleChange} placeholder="Enter Full Name"  className="border p-2"/>
                        <input type="email" name="email" value={data.email||""} onChange={handleChange} placeholder="Enter your Email" className="border p-1" />
                        <input type="text" name="country" value={data.country || ""} onChange={handleChange} placeholder="City, Country"/>
                        <input type="number" name="phone" value={data.phone || ""} onChange={handleChange} placeholder="+2519999999" />
                        <input type="text" name="linkedin" value={data.linkedin||""} onChange={handleChange} placeholder="Linkedin"/>
                        <input type="text" name="github" value={data.github||""} onChange={handleChange} placeholder="github"/>  
                    </div>
                )}
            </div>

            {/*Summary Section*/}
            <div className="mb-4 border rounded shadow-sm bg-white">
                <Button
                    variant = "ghost"
                    onClick = {()=>toggleSection("Summary")}
                    className="w-full flex justify-between py-6 rounded-b-none text-lg font-bold">
                        Summary
                        <span>{activeSection == "Summary"? "▼" : "▶"}</span>
                </Button>
                {activeSection == "Summary" && (
                    <div className="p-2 flex flex-col gap-3 border-t">
                        <textarea name="summary" value={data.summary || ""} onChange={handleChange} placeholder="Write a brief summary about yourself..." className="border p-2 rounded min-h-[120px]"/>
                    </div>
                )}      
            </div>

            {/* Education Section */}
            <div className="mb-4 border rounded shadow-sm bg-white">
                <Button
                    variant="ghost"
                    onClick={() => toggleSection("Education")}
                    className="w-full flex justify-between py-6 rounded-b-none text-lg font-bold">
                        Education
                        <span>{activeSection === "Education" ? "▼" : "▶"}</span>
                </Button>
                {activeSection === "Education" && (
                    <div className="p-4 flex flex-col gap-3 border-t">
                        <input 
                            type="text" 
                            name="schoolname" 
                            value={data.schoolname || ""} 
                            onChange={handleChange} 
                            placeholder="Enter School Name"  
                            className="border p-2 rounded"
                        />
                        <div className="flex gap-2">
                            <input 
                                type="date" 
                                name="startDate" 
                                value={data.startDate || ""} 
                                onChange={handleChange} 
                                placeholder="Start Date (e.g. 2024)"  
                                className="border p-2 rounded w-1/2"
                            />
                            <input 
                                type="date" 
                                name="endDate" 
                                value={data.endDate || ""} 
                                onChange={handleChange} 
                                placeholder="End Date (e.g. Present)"  
                                className="border p-2 rounded w-1/2"
                            />
                        </div>
                        <input 
                            type="text" 
                            name="program"  
                            value={data.program || ""} 
                            onChange={handleChange} 
                            placeholder="Degree or Program"
                            className="border p-2 rounded"
                        />
                        <textarea 
                            name="eduDescription" 
                            value={data.eduDescription || ""} 
                            onChange={handleChange} 
                            placeholder="- Developed core competencies..."
                            className="border p-2 rounded min-h-[100px]"
                        />
                    </div>
                )}
            </div>
            {/* WORK EXPERIENCE Section */}
            <div className="mb-4 border rounded shadow-sm bg-white">
                <Button
                    variant="ghost"
                    onClick={() => toggleSection("WORK EXPERIENCE")}
                    className="w-full flex justify-between py-6 rounded-b-none text-lg font-bold">
                        WORK EXPERIENCE
                        <span>{activeSection === "WORK EXPERIENCE" ? "▼" : "▶"}</span>
                </Button>
                {activeSection === "WORK EXPERIENCE" && (
                    <div className="p-4 flex flex-col gap-3 border-t">
                        <input 
                            type="text" 
                            name="company" 
                            value={data.company || ""} 
                            onChange={handleChange} 
                            placeholder="Enter Company Name"  
                            className="border p-2 rounded"
                        />
                        <div className="flex gap-2">
                            <input 
                                type="date" 
                                name="startDate" 
                                value={data.startDate || ""} 
                                onChange={handleChange} 
                                placeholder="Start Date (e.g. 2024)"  
                                className="border p-2 rounded w-1/2"
                            />
                            <input 
                                type="date" 
                                name="endDate" 
                                value={data.endDate || ""} 
                                onChange={handleChange} 
                                placeholder="End Date (e.g. Present)"  
                                className="border p-2 rounded w-1/2"
                            />
                        </div>
                        <input 
                            type="text" 
                            name="profession"  
                            value={data.profession || ""} 
                            onChange={handleChange} 
                            placeholder="Profession"
                            className="border p-2 rounded"
                        />
                        <textarea 
                            name="experienceDescription" 
                            value={data.eduDescription || ""} 
                            onChange={handleChange} 
                            placeholder="- Developed core competencies..."
                            className="border p-2 rounded min-h-[100px]"
                        />
                    </div>
                )}
            </div>

            
        </div>
    )
};