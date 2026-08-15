export function ResumePreview({ data }) { 
    return (
        <div className="w-1/2 p-8 bg-white flex flex-col items-center text-center">
            
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

        </div>
    );
}