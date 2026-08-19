import React from "react";
import { Button } from "./ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";

// --- CUSTOM HELPER COMPONENT ---
function MonthYearPicker({ monthValue, yearValue, onMonthChange, onYearChange, isEndDate, minAllowedYear }) {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    const handleYearInput = (e) => {
        let val = e.target.value;

        // 1. Strip everything except numbers
        val = val.replace(/\D/g, '');
        
        // 2. Prevent typing more than 4 digits
        if (val.length > 4) val = val.slice(0, 4);

        // 3. Only run logic checks when they finish typing 4 digits
        if (val.length === 4) {
            let num = parseInt(val, 10);
            
            // Boundary checks
            if (num > 2100) val = "2100";
            if (num < 1900) val = "1900";

            // Start Date <= End Date logic
            if (minAllowedYear && minAllowedYear !== "Present") {
                const minYearNum = parseInt(minAllowedYear, 10);
                if (num < minYearNum) {
                    val = minAllowedYear; // Auto-correct to match start year
                }
            }
        }
        
        // Update the state
        onYearChange(val);
    };

    return (
        <div className="flex flex-col gap-1 w-full">
            <div className="flex gap-2 w-full">
                {/* Month Dropdown */}
                <Select value={monthValue === "Present" ? "" : (monthValue || "")} onValueChange={onMonthChange}>
                    <SelectTrigger className="bg-white w-1/2">
                        <SelectValue placeholder="Month" />
                    </SelectTrigger>
                    <SelectContent>
                        {months.map(m => (
                            <SelectItem key={m} value={m}>{m}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                
                {/* STRICT Year Number Input */}
                <input 
                    type="text" // Using text to bypass default HTML number scrolling bugs
                    value={yearValue === "Present" ? "" : (yearValue || "")}
                    onChange={handleYearInput}
                    placeholder="YYYY"
                    className="border p-2 rounded w-1/2 bg-white text-sm"
                />
            </div>
            
            {/* Conditional 'Present' Button for End Dates */}
            {isEndDate && (
                <button 
                    type="button" 
                    onClick={() => {
                        onMonthChange("");
                        onYearChange("Present");
                    }}
                    className="text-xs text-blue-600 font-bold text-left hover:underline w-fit mt-1"
                >
                    Set to "Present"
                </button>
            )}
        </div>
    );
}

export function ResumeForm({ data, updateData }) {
    const [activeSection, setActiveSection] = React.useState("personal");

    // Handlers
    const handleChange = (e) => {
        const { name, value } = e.target;
        updateData((prevData) => ({ ...prevData, [name]: value }));
    };

    const handleArrayChange = (section, index, field, value) => {
        updateData((prev) => {
            const newArray = [...prev[section]];
            newArray[index] = { ...newArray[index], [field]: value };
            return { ...prev, [section]: newArray };
        });
    };

    const addArrayItem = (section, emptyTemplate) => {
        updateData((prev) => ({
            ...prev,
            [section]: [...prev[section], emptyTemplate]
        }));
    };

    const toggleSection = (section) => setActiveSection(activeSection === section ? "" : section);

    return (
        <div className="w-1/2 p-4 h-screen overflow-y-auto bg-gray-50 border-r">
            
            {/* Section: Personal Info */}
            <div className="mb-4 border rounded shadow-sm bg-white">
                <Button variant="ghost" onClick={() => toggleSection("personal")} className="w-full flex justify-between py-6 rounded-b-none text-lg font-bold">
                    Personal Information <span>{activeSection === "personal" ? "▼" : "▶"}</span>
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
                <Button variant="ghost" onClick={() => toggleSection("Summary")} className="w-full flex justify-between py-6 rounded-b-none text-lg font-bold">
                    Summary <span>{activeSection === "Summary" ? "▼" : "▶"}</span>
                </Button>
                {activeSection === "Summary" && (
                    <div className="p-4 flex flex-col gap-3 border-t">
                        <textarea name="summary" value={data.summary || ""} onChange={handleChange} placeholder="Write a brief summary about yourself..." className="border p-2 rounded min-h-[120px] w-full"/>
                    </div>
                )}      
            </div>

            {/* Section: Education ARRAY */}
            <div className="mb-4 border rounded shadow-sm bg-white">
                <Button variant="ghost" onClick={() => toggleSection("Education")} className="w-full flex justify-between py-6 rounded-b-none text-lg font-bold">
                    Education <span>{activeSection === "Education" ? "▼" : "▶"}</span>
                </Button>
                {activeSection === "Education" && (
                    <div className="p-4 flex flex-col gap-6 border-t">
                        {data.education.map((edu, index) => (
                            <div key={edu.id} className="flex flex-col gap-3 p-4 border rounded bg-gray-50">
                                <h4 className="font-bold text-slate-700">Education #{index + 1}</h4>
                                <input type="text" value={edu.schoolname || ""} onChange={(e) => handleArrayChange("education", index, "schoolname", e.target.value)} placeholder="Enter School Name" className="border p-2 rounded w-full"/>
                                <div className="flex gap-4 w-full">
                                    <div className="w-1/2">
                                        <label className="text-xs text-slate-500 mb-1 block">Start Date</label>
                                        <MonthYearPicker 
                                            monthValue={edu.eduStartMonth} yearValue={edu.eduStartYear}
                                            onMonthChange={(val) => handleArrayChange("education", index, "eduStartMonth", val)}
                                            onYearChange={(val) => handleArrayChange("education", index, "eduStartYear", val)}
                                        />
                                    </div>
                                    <div className="w-1/2">
                                        <label className="text-xs text-slate-500 mb-1 block">End Date</label>
                                        <MonthYearPicker 
                                            isEndDate={true}
                                            minAllowedYear={edu.eduStartYear} // <-- PASSES THE START YEAR FOR LOGIC CHECK
                                            monthValue={edu.eduEndMonth} yearValue={edu.eduEndYear}
                                            onMonthChange={(val) => handleArrayChange("education", index, "eduEndMonth", val)}
                                            onYearChange={(val) => handleArrayChange("education", index, "eduEndYear", val)}
                                        />
                                    </div>
                                </div>
                                <input type="text" value={edu.program || ""} onChange={(e) => handleArrayChange("education", index, "program", e.target.value)} placeholder="Degree or Program" className="border p-2 rounded w-full"/>
                                <textarea value={edu.eduDescription || ""} onChange={(e) => handleArrayChange("education", index, "eduDescription", e.target.value)} placeholder="- Developed core competencies..." className="border p-2 rounded min-h-[100px] w-full"/>
                            </div>
                        ))}
                        <Button 
                            variant="outline" 
                            className="w-full mt-2" 
                            onClick={() => addArrayItem("education", { id: crypto.randomUUID(), schoolname: "", eduStartMonth: "", eduStartYear: "", eduEndMonth: "", eduEndYear: "", program: "", eduDescription: "" })}
                        >
                            + Add Another School
                        </Button>
                    </div>
                )}
            </div>

            {/* Section: Work Experience ARRAY */}
            <div className="mb-4 border rounded shadow-sm bg-white">
                <Button variant="ghost" onClick={() => toggleSection("WORK EXPERIENCE")} className="w-full flex justify-between py-6 rounded-b-none text-lg font-bold">
                    WORK EXPERIENCE <span>{activeSection === "WORK EXPERIENCE" ? "▼" : "▶"}</span>
                </Button>
                {activeSection === "WORK EXPERIENCE" && (
                    <div className="p-4 flex flex-col gap-6 border-t">
                        {data.experience.map((exp, index) => (
                            <div key={exp.id} className="flex flex-col gap-3 p-4 border rounded bg-gray-50">
                                <h4 className="font-bold text-slate-700">Experience #{index + 1}</h4>
                                <input type="text" value={exp.company || ""} onChange={(e) => handleArrayChange("experience", index, "company", e.target.value)} placeholder="Enter Company Name" className="border p-2 rounded w-full"/>
                                <div className="flex gap-4 w-full">
                                    <div className="w-1/2">
                                        <label className="text-xs text-slate-500 mb-1 block">Start Date</label>
                                        <MonthYearPicker 
                                            isEndDate={true}
                                            minAllowedYear={exp.workStartYear} // <-- PASSES THE START YEAR FOR LOGIC CHECK
                                            monthValue={exp.workStartMonth} yearValue={exp.workStartYear}
                                            onMonthChange={(val) => handleArrayChange("experience", index, "workStartMonth", val)}
                                            onYearChange={(val) => handleArrayChange("experience", index, "workStartYear", val)}
                                        />
                                    </div>
                                    <div className="w-1/2">
                                        <label className="text-xs text-slate-500 mb-1 block">End Date</label>
                                        <MonthYearPicker 
                                            monthValue={exp.workEndMonth} yearValue={exp.workEndYear}
                                            onMonthChange={(val) => handleArrayChange("experience", index, "workEndMonth", val)}
                                            onYearChange={(val) => handleArrayChange("experience", index, "workEndYear", val)}
                                        />
                                    </div>
                                </div>
                                <input type="text" value={exp.profession || ""} onChange={(e) => handleArrayChange("experience", index, "profession", e.target.value)} placeholder="Profession / Job Title" className="border p-2 rounded w-full"/>
                                <textarea value={exp.experienceDescription || ""} onChange={(e) => handleArrayChange("experience", index, "experienceDescription", e.target.value)} placeholder="- Managed team..." className="border p-2 rounded min-h-[100px] w-full"/>
                            </div>
                        ))}
                        <Button 
                            variant="outline" 
                            className="w-full mt-2" 
                            onClick={() => addArrayItem("experience", { id: crypto.randomUUID(), company: "", workStartMonth: "", workStartYear: "", workEndMonth: "", workEndYear: "", profession: "", experienceDescription: "" })}
                        >
                            + Add Another Job
                        </Button>
                    </div>
                )}
            </div>

            {/* Section: Skills */}
            <div className="mb-4 border rounded shadow-sm bg-white">
                <Button variant="ghost" onClick={() => toggleSection("Skills")} className="w-full flex justify-between py-6 rounded-b-none text-lg font-bold">
                    Skills <span>{activeSection === "Skills" ? "▼" : "▶"}</span>
                </Button>
                {activeSection === "Skills" && (
                    <div className="p-4 flex flex-col gap-3 border-t">
                        <textarea name="skills" value={data.skills || ""} onChange={handleChange} placeholder="e.g. JavaScript, React, Node.js (comma separated or bulleted)..." className="border p-2 rounded min-h-[100px] w-full"/>
                    </div>
                )}
            </div>
            
        </div>
    );
}