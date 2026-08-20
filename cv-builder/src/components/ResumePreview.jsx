export function ResumePreview({ data }) { 
    
    // Safety checks: only render sections if the user actually typed something in the first array item
    const hasEducation = data.education && data.education.some(edu => edu.schoolname || edu.program);
    const hasExperience = data.experience && data.experience.some(exp => exp.company || exp.profession);

    return (
        <div className="w-full h-full p-8 flex flex-col items-center text-center">
            
            {/* Tier 1: Full Name */}
            <h1 className="text-3xl font-bold tracking-wide text-slate-900 uppercase">
                {data.fullname || "Full Name"}
            </h1>

            {/* Tier 2: Location & Phone */}
            <div className="text-sm text-slate-700 mt-1 space-x-2">
                {data.country && <span>{data.country}</span>}
                {data.country && data.phone && <span>|</span>}
                {data.phone && <span>{data.phone}</span>}
            </div>

            {/* Tier 3: Links & Email */}
            <div className="text-sm text-slate-700 mt-1 space-x-2">
                {data.linkedin && <a href={data.linkedin} className="text-blue-700 underline">LinkedIn</a>}
                {data.linkedin && data.github && <span>|</span>}
                {data.github && <a href={data.github} className="text-blue-700 underline">GitHub</a>}
                {(data.linkedin || data.github) && data.email && <span>|</span>}
                {data.email && <span>{data.email}</span>}
            </div>

            {/* Tier 4: Summary */}
            {data.summary && (
                <div className="w-full mt-8 text-left">
                    <h2 className="text-[1rem] font-bold tracking-wide text-blue-900 uppercase mb-2">SUMMARY</h2>
                    <p className="text-sm text-slate-800 mt-2 leading-relaxed text-justify">
                        {data.summary}
                    </p>    
                </div>
            )}

            {/* Tier 5: Education ARRAY */}
            {hasEducation && (
                <div className="w-full mt-6 text-left">
                    <h2 className="text-[1rem] font-bold tracking-wide text-blue-900 uppercase mb-2">
                        EDUCATION
                    </h2>
                    <div className="flex flex-col gap-4">
                        {data.education.map((edu, index) => (
                            (edu.schoolname || edu.program) && (
                                <div key={edu.id || index}>
                                    <div className="flex justify-between text-slate-900 font-bold italic text-[0.95rem]">
                                        <span>{edu.schoolname}</span>
                                        <span>
                                            {edu.eduStartMonth} {edu.eduStartYear} {(edu.eduStartMonth || edu.eduStartYear) && (edu.eduEndMonth || edu.eduEndYear) ? "  –  " : ""} {edu.eduEndMonth} {edu.eduEndYear}
                                        </span>
                                    </div>
                                    <div className="italic text-slate-900 text-[0.95rem]">
                                        {edu.program}
                                    </div>
                                    {edu.eduDescription && (
                                        <ul className="text-[0.9rem] text-slate-800 mt-1 flex flex-col gap-1">
                                            {edu.eduDescription.split('\n').filter(line => line.trim() !== '').map((line, i) => (
                                                <li key={i} className="flex items-start">
                                                    <span className="mr-2">★</span>
                                                    <span>{line}</span>
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

            {/* Tier 6: WORK EXPERIENCE ARRAY */}
            {hasExperience && (
                <div className="w-full mt-6 text-left">
                    <h2 className="text-[1rem] font-bold tracking-wide text-blue-900 uppercase mb-2">
                        WORK EXPERIENCE
                    </h2>
                    <div className="flex flex-col gap-4">
                        {data.experience.map((exp, index) => (
                            (exp.company || exp.profession) && (
                                <div key={exp.id || index}>
                                    <div className="flex justify-between text-slate-900 font-bold italic text-[0.95rem]">
                                        <span>{exp.company}</span>
                                        <span>
                                            {exp.workStartMonth} {exp.workStartYear} {(exp.workStartMonth || exp.workStartYear) && (exp.workEndMonth || exp.workEndYear) ? "  –  " : ""} {exp.workEndMonth} {exp.workEndYear}
                                        </span>
                                    </div>
                                    <div className="italic text-slate-900 text-[0.95rem]">
                                        {exp.profession}
                                    </div>
                                    {exp.experienceDescription && (
                                        <ul className="text-[0.9rem] text-slate-800 mt-1 flex flex-col gap-1">
                                            {exp.experienceDescription.split('\n').filter(line => line.trim() !== '').map((line, i) => (
                                                <li key={i} className="flex items-start">
                                                    <span className="mr-2">★</span>
                                                    <span>{line}</span>
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
            
            {/* Tier 7: Skills */}
            {data.skills && (
                <div className="w-full mt-6 text-left">
                    <h2 className="text-[1rem] font-bold tracking-wide text-blue-900 uppercase mb-3">
                        SKILLS
                    </h2>
                    <div className="flex flex-wrap gap-2">
                        {data.skills
                            .split(/[,\n]+/) // Chops the string by commas OR new lines
                            .map((skill) => skill.trim()) // Cleans up accidental extra spaces
                            .filter((skill) => skill !== "") // Ignores empty blank chops
                            .map((skill, index) => (
                                <span 
                                    key={index} 
                                    className="bg-slate-100 text-slate-700 border border-slate-200 px-3 py-1 text-[0.85rem] font-semibold rounded-md shadow-sm print:shadow-none"
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