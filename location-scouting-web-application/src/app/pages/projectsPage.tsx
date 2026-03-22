// reference: https://react.dev/learn/rendering-lists
'use client'

import Link from "next/link";

/* deprecated method (used for reference). Used <Link> to route more effectively */
interface ProjectProps {
    selectedPage: string;
    setSelectedPage: (page: string) => void;
}

export function ProjectsPage({selectedPage, setSelectedPage}:ProjectProps){ // can remove props as well
    
    return (
        <div className="grid grid-rows-[50px_1fr] h-full">
            <div className="text-2xl col-span-1 sm:justify-self-center lg:justify-self-start" >
                Projects
            </div>
            
            <div className="overflow-y-auto scrollbar-hide">
                <ul>
                </ul>
            </div>
        </div>
    );
}