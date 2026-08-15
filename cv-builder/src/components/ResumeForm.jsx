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
            
        </div>
    )
};