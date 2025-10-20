'use client' // used on interactive components mainly - required for `useState`

import { useState } from 'react';

/* Properties passed from sidebar (to page.tsx) */
interface SideBarProps {
    selectedPage: string;
    setSelectedPage: (page: string) => void;
}

export function SideBar({selectedPage, setSelectedPage}:SideBarProps) {
    
    // track which page is selected
    // const [pageSelector, setPageSelector] = useState("");

    return (
        // note that `*:` applies styles to children of a component
        <div className="font-mono text-[var(--sidebarfont)] *:mb-4 *:p-5 *:pr-15">
            
            {/* Logo */}
            <div> 
                ▇ Logo Here
            </div>

            {/* Buttons */}
            <button onClick={()=>setSelectedPage("Project")}>
                Projects
            </button>

            <button onClick={()=>setSelectedPage("Scene")}>
                Scene
            </button>

            <button onClick={()=>setSelectedPage("Location")}>
                Locations
            </button>

            <button onClick={()=>setSelectedPage("Photo")}>
                Photos
            </button>

        </div>
        
    );
}