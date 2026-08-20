import React from "react";
import { Button } from "./ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";

// --- CUSTOM INPUT COMPONENT (Stretches to fill space) ---
function FormInput({ label, name, type = "text", value, onChange, placeholder, className = "" }) {
    return (
        <div className={`flex flex-col gap-1.5 w-full ${className}`}>
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider pl-1">{label}</label>
            <input 
                type={type} name={name} value={value} onChange={onChange} placeholder={placeholder} 
                className="border border-slate-300 p-2.5 rounded-md w-full text-sm text-slate-900 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-600 transition-all"
            />
        </div>
    );
}

// --- STRICT DATE PICKER ---
function MonthYearPicker({ monthValue, yearValue, onMonthChange, onYearChange, isEndDate, minAllowedYear }) {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    const handleYearInput = (e) => {
        let val = e.target.value.replace(/\D/g, '');
        if (val.length > 4) val = val.slice(0, 4);
        if (val.length === 4) {
            let num = parseInt(val, 10);
            if (num > 2100) val = "2100";
            if (num < 1900) val = "1900";
            if (minAllowedYear && minAllowedYear !== "Present") {
                if (num < parseInt(minAllowedYear, 10)) val = minAllowedYear;
            }
        }
        onYearChange(val);
    };

    return (
        <div className="flex flex-col gap-1 w-full">
            <div className="flex flex-wrap gap-2 w-full">
                <Select value={monthValue === "Present" ? "" : (monthValue || "")} onValueChange={onMonthChange}>
                    <SelectTrigger className="bg-white flex-1 min-w-[90px]"><SelectValue placeholder="Month" /></SelectTrigger>
                    <SelectContent>{months.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                </Select>
                <input 
                    type="text" value={yearValue === "Present" ? "" : (yearValue || "")}
                    onChange={handleYearInput} placeholder="YYYY"
                    className="border border-slate-300 p-2 rounded-md flex-1 min-w-[70px] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
            </div>
            {isEndDate && (
                <button type="button" onClick={() => { onMonthChange(""); onYearChange("Present"); }} className="text-xs text-blue-600 font-bold text-left hover:underline w-fit mt-1">
                    Set to "Present"
                </button>
            )}
        </div>
    );
}

// --- MAIN FORM ---
export function ResumeForm({ data, updateData }) {
    const [activeSection, setActiveSection] = React.useState("personal");

    const handleChange = (e) => {
        const { name, value } = e.target;
        updateData(prev => ({ ...prev, [name]: value }));
    };

    const handleArrayChange = (section, index, field, value) => {
        updateData(prev => {
            const newArray = [...prev[section]];
            newArray[index] = { ...newArray[index], [field]: value };
            return { ...prev, [section]: newArray };
        });
    };

    const addArrayItem = (section, emptyTemplate) => {
        updateData(prev => ({ ...prev, [section]: [...prev[section], emptyTemplate] }));
    };

    const toggleSection = (section) => setActiveSection(activeSection === section ? "" : section);

    return (
        <div className="w-full p-4 h-full overflow-y-auto bg-gray-50">
            
            {/* PERSONAL INFO */}
            <div className="mb-4 border rounded shadow-sm bg-white overflow-hidden w-full">
                <Button variant="ghost" onClick={() => toggleSection("personal")} className="w-full flex justify-between py-6 rounded-b-none text-lg font-bold hover:bg-slate-50">
                    Personal Information <span className="text-slate-400">{activeSection === "personal" ? "▼" : "▶"}</span>
                </Button>
                {activeSection === "personal" && (
                    <div className="p-5 flex flex-col gap-4 border-t bg-slate-50/50 w-full">
                        <FormInput label="Full Name" name="fullname" value={data.fullname || ""} onChange={handleChange} placeholder="e.g. Fetehadin Negash" />
                        <div className="flex flex-wrap gap-4 w-full">
                            <FormInput className="flex-1 min-w-[200px]" label="Email Address" name="email" type="email" value={data.email || ""} onChange={handleChange} placeholder="hello@example.com" />
                            <FormInput className="flex-1 min-w-[200px]" label="Phone Number" name="phone" type="tel" value={data.phone || ""} onChange={handleChange} placeholder="+251 900 0000" />
                        </div>
                        <FormInput label="Location" name="country" value={data.country || ""} onChange={handleChange} placeholder="City, Country" />
                        <div className="flex flex-wrap gap-4 w-full">
                            <FormInput className="flex-1 min-w-[200px]" label="LinkedIn Profile" name="linkedin" value={data.linkedin || ""} onChange={handleChange} placeholder="linkedin.com/in/username" />
                            <FormInput className="flex-1 min-w-[200px]" label="GitHub Profile" name="github" value={data.github || ""} onChange={handleChange} placeholder="github.com/username" />
                        </div>
                    </div>
                )}
            </div>

            {/* SUMMARY */}
            <div className="mb-4 border rounded shadow-sm bg-white overflow-hidden w-full">
                <Button variant="ghost" onClick={() => toggleSection("Summary")} className="w-full flex justify-between py-6 rounded-b-none text-lg font-bold hover:bg-slate-50">
                    Summary <span className="text-slate-400">{activeSection === "Summary" ? "▼" : "▶"}</span>
                </Button>
                {activeSection === "Summary" && (
                    <div className="p-5 flex flex-col gap-1.5 border-t bg-slate-50/50 w-full">
                        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider pl-1">Professional Summary</label>
                        <textarea name="summary" value={data.summary || ""} onChange={handleChange} placeholder="Write a brief summary..." className="border border-slate-300 p-3 rounded-md min-h-[120px] w-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"/>
                    </div>
                )}      
            </div>

            {/* EDUCATION */}
            <div className="mb-4 border rounded shadow-sm bg-white overflow-hidden w-full">
                <Button variant="ghost" onClick={() => toggleSection("Education")} className="w-full flex justify-between py-6 rounded-b-none text-lg font-bold hover:bg-slate-50">
                    Education <span className="text-slate-400">{activeSection === "Education" ? "▼" : "▶"}</span>
                </Button>
                {activeSection === "Education" && (
                    <div className="p-5 flex flex-col gap-6 border-t bg-slate-50/50 w-full">
                        {data.education.map((edu, index) => (
                            <div key={edu.id} className="flex flex-col gap-4 p-5 border border-slate-200 rounded-md bg-white shadow-sm w-full">
                                <h4 className="font-bold text-slate-700 uppercase tracking-wide text-sm border-b pb-2">Education #{index + 1}</h4>
                                <FormInput label="School Name" value={edu.schoolname || ""} onChange={(e) => handleArrayChange("education", index, "schoolname", e.target.value)} placeholder="e.g. University of Technology" />
                                
                                <div className="flex flex-wrap gap-4 w-full">
                                    <div className="flex-1 min-w-[200px]">
                                        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider pl-1 mb-1 block">Start Date</label>
                                        <MonthYearPicker monthValue={edu.eduStartMonth} yearValue={edu.eduStartYear} onMonthChange={(val) => handleArrayChange("education", index, "eduStartMonth", val)} onYearChange={(val) => handleArrayChange("education", index, "eduStartYear", val)} />
                                    </div>
                                    <div className="flex-1 min-w-[200px]">
                                        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider pl-1 mb-1 block">End Date</label>
                                        <MonthYearPicker isEndDate={true} minAllowedYear={edu.eduStartYear} monthValue={edu.eduEndMonth} yearValue={edu.eduEndYear} onMonthChange={(val) => handleArrayChange("education", index, "eduEndMonth", val)} onYearChange={(val) => handleArrayChange("education", index, "eduEndYear", val)} />
                                    </div>
                                </div>

                                <FormInput label="Degree / Program" value={edu.program || ""} onChange={(e) => handleArrayChange("education", index, "program", e.target.value)} placeholder="e.g. B.Sc. Computer Science" />
                                
                                <div className="flex flex-col gap-1.5 w-full">
                                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider pl-1">Achievements (Bullet points)</label>
                                    <textarea value={edu.eduDescription || ""} onChange={(e) => handleArrayChange("education", index, "eduDescription", e.target.value)} placeholder="- Graduated with honors..." className="border border-slate-300 p-3 rounded-md min-h-[100px] w-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"/>
                                </div>
                            </div>
                        ))}
                        <Button variant="outline" className="w-full mt-2 font-bold text-blue-600 border-blue-200 hover:bg-blue-50" onClick={() => addArrayItem("education", { id: crypto.randomUUID(), schoolname: "", eduStartMonth: "", eduStartYear: "", eduEndMonth: "", eduEndYear: "", program: "", eduDescription: "" })}>
                            + Add Another School
                        </Button>
                    </div>
                )}
            </div>

            {/* EXPERIENCE */}
            <div className="mb-4 border rounded shadow-sm bg-white overflow-hidden w-full">
                <Button variant="ghost" onClick={() => toggleSection("Experience")} className="w-full flex justify-between py-6 rounded-b-none text-lg font-bold hover:bg-slate-50">
                    Work Experience <span className="text-slate-400">{activeSection === "Experience" ? "▼" : "▶"}</span>
                </Button>
                {activeSection === "Experience" && (
                    <div className="p-5 flex flex-col gap-6 border-t bg-slate-50/50 w-full">
                        {data.experience.map((exp, index) => (
                            <div key={exp.id} className="flex flex-col gap-4 p-5 border border-slate-200 rounded-md bg-white shadow-sm w-full">
                                <h4 className="font-bold text-slate-700 uppercase tracking-wide text-sm border-b pb-2">Experience #{index + 1}</h4>
                                <FormInput label="Company Name" value={exp.company || ""} onChange={(e) => handleArrayChange("experience", index, "company", e.target.value)} placeholder="e.g. Google" />
                                
                                <div className="flex flex-wrap gap-4 w-full">
                                    <div className="flex-1 min-w-[200px]">
                                        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider pl-1 mb-1 block">Start Date</label>
                                        <MonthYearPicker monthValue={exp.workStartMonth} yearValue={exp.workStartYear} onMonthChange={(val) => handleArrayChange("experience", index, "workStartMonth", val)} onYearChange={(val) => handleArrayChange("experience", index, "workStartYear", val)} />
                                    </div>
                                    <div className="flex-1 min-w-[200px]">
                                        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider pl-1 mb-1 block">End Date</label>
                                        <MonthYearPicker isEndDate={true} minAllowedYear={exp.workStartYear} monthValue={exp.workEndMonth} yearValue={exp.workEndYear} onMonthChange={(val) => handleArrayChange("experience", index, "workEndMonth", val)} onYearChange={(val) => handleArrayChange("experience", index, "workEndYear", val)} />
                                    </div>
                                </div>

                                <FormInput label="Job Title" value={exp.profession || ""} onChange={(e) => handleArrayChange("experience", index, "profession", e.target.value)} placeholder="e.g. Software Engineer" />
                                
                                <div className="flex flex-col gap-1.5 w-full">
                                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider pl-1">Responsibilities (Bullet points)</label>
                                    <textarea value={exp.experienceDescription || ""} onChange={(e) => handleArrayChange("experience", index, "experienceDescription", e.target.value)} placeholder="- Led a team of 5..." className="border border-slate-300 p-3 rounded-md min-h-[100px] w-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"/>
                                </div>
                            </div>
                        ))}
                        <Button variant="outline" className="w-full mt-2 font-bold text-blue-600 border-blue-200 hover:bg-blue-50" onClick={() => addArrayItem("experience", { id: crypto.randomUUID(), company: "", workStartMonth: "", workStartYear: "", workEndMonth: "", workEndYear: "", profession: "", experienceDescription: "" })}>
                            + Add Another Job
                        </Button>
                    </div>
                )}
            </div>

            {/* SKILLS */}
            <div className="mb-4 border rounded shadow-sm bg-white overflow-hidden w-full">
                <Button variant="ghost" onClick={() => toggleSection("Skills")} className="w-full flex justify-between py-6 rounded-b-none text-lg font-bold hover:bg-slate-50">
                    Skills <span className="text-slate-400">{activeSection === "Skills" ? "▼" : "▶"}</span>
                </Button>
                {activeSection === "Skills" && (
                    <div className="p-5 flex flex-col gap-1.5 border-t bg-slate-50/50 w-full">
                        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider pl-1">Technical Skills</label>
                        <textarea name="skills" value={data.skills || ""} onChange={handleChange} placeholder="e.g. React, Node.js, TypeScript..." className="border border-slate-300 p-3 rounded-md min-h-[120px] w-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"/>
                    </div>
                )}
            </div>
            
        </div>
    );
}