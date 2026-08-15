import React from "react";
import { Button } from "./ui/button";

export function ResumeForm({ data, updateData }) {
    
    const [activeSection, setActiveSection] = React.useState("personal");

    const handleChange = (e) => {
        const { name, value } = e.target;
        updateData((prevData) => ({
            ...prevData,
            [name]: value,
        }));
    };

    const toggleSection = (section) => {
        setActiveSection(activeSection === section ? "" : section);
    };

    return (
        <div className="w-1/2 p-4 h-screen overflow-y-auto bg-gray-50 border-r">
            
            {/* Section: Personal Info */}
            <div className="mb-4 border rounded shadow-sm bg-white">
                <Button 
                    variant="ghost"
                    onClick={() => toggleSection("personal")} 
                    className="w-full flex justify-between py-6 rounded-b-none text-lg font-bold">
                        Personal Information
                        <span>{activeSection === "personal" ? "▼" : "▶"}</span>
                </Button>
                {activeSection === "personal" && (
                    <div className="p-4 flex flex-col gap-3 border-t">
                        <input type="text" name="fullname" value={data.fullname || ""} onChange={handleChange} placeholder="Enter Full Name" className="border p-2 rounded w-full"/>
                        <input type="email" name="email" value={data.email || ""} onChange={handleChange} placeholder="Enter your Email" className="border p-2 rounded w-full" />
                        <input type="text" name="country" value={data.country || ""} onChange={handleChange} placeholder="City, Country" className="border p-2 rounded w-full"/>
                        <input type="tel" name="phone" value={data.phone || ""} onChange={handleChange} placeholder="Enter your phone number" className="border p-2 rounded w-full"/>
                        <input type="text" name="linkedin" value={data.linkedin || ""} onChange={handleChange} placeholder="LinkedIn URL" className="border p-2 rounded w-full"/>
                        <input type="text" name="github" value={data.github || ""} onChange={handleChange} placeholder="GitHub URL" className="border p-2 rounded w-full"/>  
                    </div>
                )}
            </div>

            {/* Section: Summary */}
            <div className="mb-4 border rounded shadow-sm bg-white">
                <Button
                    variant="ghost"
                    onClick={() => toggleSection("Summary")}
                    className="w-full flex justify-between py-6 rounded-b-none text-lg font-bold">
                        Summary
                        <span>{activeSection === "Summary" ? "▼" : "▶"}</span>
                </Button>
                {activeSection === "Summary" && (
                    <div className="p-4 flex flex-col gap-3 border-t">
                        <textarea name="summary" value={data.summary || ""} onChange={handleChange} placeholder="Write a brief summary about yourself..." className="border p-2 rounded min-h-[120px] w-full"/>
                    </div>
                )}      
            </div>

            {/* Section: Education */}
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
                            className="border p-2 rounded w-full"
                        />
                        <div className="flex gap-2">
                            <input 
                                type="date" 
                                name="eduStartDate" 
                                value={data.eduStartDate || ""} 
                                onChange={handleChange} 
                                className="border p-2 rounded w-1/2"
                            />
                            <input 
                                type="date" 
                                name="eduEndDate" 
                                value={data.eduEndDate || "Present"} 
                                onChange={handleChange} 
                                className="border p-2 rounded w-1/2"
                            />
                        </div>
                        <input 
                            type="text" 
                            name="program"  
                            value={data.program || ""} 
                            onChange={handleChange} 
                            placeholder="Degree or Program"
                            className="border p-2 rounded w-full"
                        />
                        <textarea 
                            name="eduDescription" 
                            value={data.eduDescription || ""} 
                            onChange={handleChange} 
                            placeholder="- Developed core competencies..."
                            className="border p-2 rounded min-h-[100px] w-full"
                        />
                    </div>
                )}
            </div>

            {/* Section: Work Experience */}
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
                            className="border p-2 rounded w-full"
                        />
                        <div className="flex gap-2">
                            <input 
                                type="date" 
                                name="workStartDate" 
                                value={data.startDate || ""} 
                                onChange={handleChange} 
                                className="border p-2 rounded w-1/2"
                            />
                            <input 
                                type="date" 
                                name="workEndDate" 
                                value={data.endDate || "Present"} 
                                onChange={handleChange} 
                                className="border p-2 rounded w-1/2"
                            />
                        </div>
                        <input 
                            type="text" 
                            name="profession"  
                            value={data.profession || ""} 
                            onChange={handleChange} 
                            placeholder="Profession / Job Title"
                            className="border p-2 rounded w-full"
                        />
                        <textarea 
                            name="experienceDescription" 
                            value={data.experienceDescription || ""} 
                            onChange={handleChange} 
                            placeholder="- Managed team of 5 engineers..."
                            className="border p-2 rounded min-h-[100px] w-full"
                        />
                    </div>
                )}
            </div>

            {/* Section: Skills */}
            <div className="mb-4 border rounded shadow-sm bg-white">
                <Button
                    variant="ghost"
                    onClick={() => toggleSection("Skills")}
                    className="w-full flex justify-between py-6 rounded-b-none text-lg font-bold">
                        Skills
                        <span>{activeSection === "Skills" ? "▼" : "▶"}</span>
                </Button>
                {activeSection === "Skills" && (
                    <div className="p-4 flex flex-col gap-3 border-t">
                        <textarea 
                            name="skills" 
                            value={data.skills || ""} 
                            onChange={handleChange} 
                            placeholder="e.g. JavaScript, React, Node.js (comma separated or bulleted)..."
                            className="border p-2 rounded min-h-[100px] w-full"
                        />
                    </div>
                )}
            </div>
            
        </div>
    );
}