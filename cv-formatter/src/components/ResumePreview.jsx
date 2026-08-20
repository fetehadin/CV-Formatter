import React from 'react';

export function ResumePreview({ data }) { 
    const hasEducation = data.education && data.education.some(edu => edu.schoolname || edu.program);
    const hasExperience = data.experience && data.experience.some(exp => exp.company || exp.profession);

    return (
        // Forces Arial/Helvetica, tightens the text, and sets exact padding for A4
        <div className="w-full h-full pt-10 px-12 pb-10 flex flex-col text-left font-[Arial,Helvetica,sans-serif] bg-white text-gray-900">
            
            {/* Header: Centered, Bold Blue Name, Standard Contact Info */}
            <div className="flex flex-col items-center text-center w-full mb-4">
                <h1 className="text-3xl font-bold text-[#1E3A8A] uppercase tracking-wide mb-1">
                    {data.fullname || "FULL NAME"}
                </h1>
                
                <div className="text-[13px] text-gray-800">
                    {data.country && <span>{data.country}</span>}
                    {data.country && data.phone && <span className="mx-1">|</span>}
                    {data.phone && <span>{data.phone}</span>}
                </div>
                
                <div className="text-[13px] text-gray-800 mt-0.5">
                    {data.linkedin && <a href={data.linkedin} className="text-[#1E3A8A]">LinkedIn</a>}
                    {data.linkedin && data.github && <span className="mx-1 text-gray-800">|</span>}
                    {data.github && <a href={data.github} className="text-[#1E3A8A]">GitHub</a>}
                    {(data.linkedin || data.github) && data.email && <span className="mx-1 text-gray-800">|</span>}
                    {data.email && <span className="font-bold text-gray-900">{data.email}</span>}
                </div>
            </div>

            {/* SUMMARY */}
            {data.summary && (
                <div className="w-full mb-3">
                    <h2 className="text-[14px] font-bold text-[#1E3A8A] uppercase mb-1">SUMMARY</h2>
                    <div className="text-[13px] leading-snug flex items-start">
                        <span className="mr-2 text-[10px] mt-[3px]">●</span>
                        <p className="text-justify">{data.summary}</p>
                    </div>
                </div>
            )}

            {/* EDUCATION */}
            {hasEducation && (
                <div className="w-full mb-3">
                    <h2 className="text-[14px] font-bold text-[#1E3A8A] uppercase mb-1">EDUCATION</h2>
                    <div className="flex flex-col gap-2">
                        {data.education.map((edu, index) => (
                            (edu.schoolname || edu.program) && (
                                <div key={edu.id || index}>
                                    <div className="flex justify-between font-bold text-[13px]">
                                        <span>{edu.schoolname}</span>
                                        <span className="italic">
                                            {edu.eduStartYear} {(edu.eduStartYear && edu.eduEndYear) ? "–" : ""} {edu.eduEndYear}
                                        </span>
                                    </div>
                                    <div className="italic text-[13px] mb-0.5">
                                        {edu.program}
                                    </div>
                                    {edu.eduDescription && (
                                        <ul className="text-[13px] leading-snug flex flex-col">
                                            {edu.eduDescription.split('\n').filter(line => line.trim() !== '').map((line, i) => (
                                                <li key={i} className="flex items-start">
                                                    <span className="mr-1.5">-</span>
                                                    {/* Automatically removes any dash or bullet the user typed so it doesn't double up */}
                                                    <span>{line.replace(/^[-*•]\s*/, '')}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </div>
                            )
                        ))}
                    </div>
                </div>
            )}

            {/* WORK EXPERIENCE */}
            {hasExperience && (
                <div className="w-full mb-3">
                    <h2 className="text-[14px] font-bold text-[#1E3A8A] uppercase mb-1">WORK EXPERIENCE</h2>
                    <div className="flex flex-col gap-3">
                        {data.experience.map((exp, index) => (
                            (exp.company || exp.profession) && (
                                <div key={exp.id || index}>
                                    <div className="flex justify-between font-bold text-[13px]">
                                        <span>{exp.company}</span>
                                        <span className="italic">
                                            {exp.workStartMonth} {exp.workStartYear} {(exp.workStartMonth || exp.workStartYear) && (exp.workEndMonth || exp.workEndYear) ? " – " : ""} {exp.workEndMonth} {exp.workEndYear}
                                        </span>
                                    </div>
                                    <div className="italic text-[13px] mb-0.5">
                                        {exp.profession}
                                    </div>
                                    {exp.experienceDescription && (
                                        <ul className="text-[13px] leading-snug flex flex-col">
                                            {exp.experienceDescription.split('\n').filter(line => line.trim() !== '').map((line, i) => (
                                                <li key={i} className="flex items-start">
                                                    <span className="mr-2 text-[10px] mt-[3px]">●</span>
                                                    <span>{line.replace(/^[-*•]\s*/, '')}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </div>
                            )
                        ))}
                    </div>
                </div>
            )}
            
            {/* SKILLS - Flattened and professionalized to match the target layout */}
            {/* SKILLS - Strict Grid Layout */}
            {data.skills && (
                <div className="w-full text-left">
                    <h2 className="text-[14px] font-bold text-[#1E3A8A] uppercase mb-3">SKILLS</h2>
                    
                    {/* CRITICAL FIX: grid-cols-4 forces exactly 4 items per line. gap-3 adds perfect breathing room. */}
                    <div className="grid grid-cols-4 gap-3">
                        {data.skills
                            .split(/[,\n]+/) 
                            .map((skill) => skill.trim()) 
                            .filter((skill) => skill !== "") 
                            .map((skill, index) => (
                                <span 
                                    key={index} 
                                    // Added 'text-center' for alignment and 'truncate' so long words don't break the grid
                                    className="bg-gray-100 text-gray-800 border border-gray-300 px-3 py-1.5 text-[12px] font-bold rounded-sm print:border-gray-400 text-center truncate shadow-sm print:shadow-none"
                                >
                                    {skill}
                                </span>
                            ))}
                    </div>
                </div>
            )}
        </div>
    );
}