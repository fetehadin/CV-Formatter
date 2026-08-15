export function ResumePreview({ data }) { 
    return (
        <div className="w-1/2 p-8 bg-white flex flex-col items-center text-center overflow-y-auto h-screen">
            
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
            <div className="w-full mt-8 text-left">
                <h2 className="text-lg font-bold tracking-wide text-slate-900 uppercase">SUMMARY</h2>
                <p className="text-sm text-slate-800 mt-2 leading-relaxed text-justify">
                    {data.summary || "Write a brief summary about yourself..."}
                </p>    
            </div>

            {/* Tier 5: Education */}
            {(data.schoolname || data.program) && (
                <div className="w-full mt-6 text-left">
                    <h2 className="text-[1rem] font-bold tracking-wide text-blue-900 uppercase mb-2">
                        EDUCATION
                    </h2>

                    <div className="flex flex-col gap-4">
                        <div>
                            {/* Top Row: School & Dates */}
                            <div className="flex justify-between text-slate-900 font-bold italic text-[0.95rem]">
                                <span>{data.schoolname}</span>
                                <span>
                                    {data.eduStartDate} {data.eduStartDate && data.eduEndDate ? "  –  " : ""} {data.eduEndDate}
                                </span>
                            </div>
                            
                            {/* Degree Row */}
                            <div className="italic text-slate-900 text-[0.95rem]">
                                {data.program}
                            </div>
                            
                            {/* Bullet Points - SAFE RENDER */}
                            {data.eduDescription && (
                                <ul className="text-[0.9rem] text-slate-800 mt-1 flex flex-col gap-1">
                                    {data.eduDescription
                                        .split('\n')
                                        .filter(line => line.trim() !== '')
                                        .map((line, index) => (
                                            <li key={index} className="flex items-start">
                                                <span className="mr-2">-</span>
                                                <span>{line}</span>
                                            </li>
                                        ))}
                                </ul>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Tier 6: WORK EXPERIENCE */}
            {(data.company || data.profession) && (
                <div className="w-full mt-6 text-left">
                    <h2 className="text-[1rem] font-bold tracking-wide text-blue-900 uppercase mb-2">
                        WORK EXPERIENCE
                    </h2>

                    <div className="flex flex-col gap-4">
                        <div>
                            {/* Top Row: experience & Dates */}
                            <div className="flex justify-between text-slate-900 font-bold italic text-[0.95rem]">
                                <span>{data.company}</span>
                                <span>
                                    {data.workStartDate} {data.workStartDate && data.workEndDate ? "  –  " : ""} {data.workEndDate}
                                </span>
                            </div>
                            
                            {/* Profession Row */}
                            <div className="italic text-slate-900 text-[0.95rem]">
                                {data.profession}
                            </div>
                            
                            {/* Bullet Points - SAFE RENDER */}
                            {data.experienceDescription && (
                                <ul className="text-[0.9rem] text-slate-800 mt-1 flex flex-col gap-1">
                                    {data.experienceDescription
                                        .split('\n')
                                        .filter(line => line.trim() !== '')
                                        .map((line, index) => (
                                            <li key={index} className="flex items-start">
                                                <span className="mr-2">-</span>
                                                <span>{line}</span>
                                            </li>
                                        ))}
                                </ul>
                            )}
                        </div>
                    </div>
                </div>
            )}
            
            {/* Tier 7: Skills */}
            {data.skills && (
                <div className="w-full mt-6 text-left">
                    <h2 className="text-[1rem] font-bold tracking-wide text-blue-900 uppercase mb-2">
                        SKILLS
                    </h2>
                    <div className="text-[0.95rem] text-slate-800 leading-relaxed whitespace-pre-line">
                        {data.skills}
                    </div>
                </div>
            )}

        </div>
    );
}