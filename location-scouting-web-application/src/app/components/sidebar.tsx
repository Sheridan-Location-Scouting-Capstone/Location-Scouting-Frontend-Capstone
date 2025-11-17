'use client' // used on interactive components mainly - required for `useState`

import { useState } from 'react';
import { Button } from './button';

/* Properties passed from sidebar (to page.tsx) */
interface SideBarProps {
    selectedPage: string;
    setSelectedPage: (page: string) => void;
}

export function SideBar({selectedPage, setSelectedPage}:SideBarProps) {
    
    // track if mobile menu is open
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const handlePageChange = (page: string) => {
        setSelectedPage(page);
        setIsMobileMenuOpen(false);
    };

    return (
        <>
            {/* Desktop sidebar */}
            <div className="hidden lg:block font-mono text-[var(--sidebarfont)] *:mb-4 *:p-5 *:pr-15">
                
                {/* Logo */}
                <div> 
                    ▇ Location Scouting
                </div>

                
                {/* Buttons */}
                <Button onClick={()=>setSelectedPage("Project")}>
                    Projects
                </Button>

                <Button onClick={()=>setSelectedPage("Location")}>
                    Locations
                </Button>

            </div>

            {/* Hamburger menu */}
            <div className="lg:hidden">
                <button
                    onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                    className="p-4 text-[var(--sidebarfont)] hover:bg-[var(--sidebar)] transition-colors"
                    aria-label="Toggle menu"
                >
                    <svg
                        className="w-6 h-6"
                        fill="none"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                    >
                        {isMobileMenuOpen ? (
                            <path d="M6 18L18 6M6 6l12 12" />
                        ) : (
                            <path d="M4 6h16M4 12h16M4 18h16" />
                        )}
                    </svg>
                </button>

                {isMobileMenuOpen && (
                    <>
                        <div
                            className="fixed inset-0 bg-black bg-opacity-50 z-40"
                            onClick={() => setIsMobileMenuOpen(false)}
                        />
                        
                        <div className="fixed top-0 left-0 h-full w-64 bg-[var(--sidebar)] z-50 font-mono text-[var(--sidebarfont)] shadow-lg">
                            <div className="flex items-center justify-between p-5 border-b border-[var(--sidebarfont)] border-opacity-20">
                                <div>▇ Location Scouting</div>
                                <button
                                    onClick={() => setIsMobileMenuOpen(false)}
                                    className="p-2 hover:bg-[var(--sidebarfont)] hover:bg-opacity-20 rounded transition-colors"
                                    aria-label="Close menu"
                                >
                                    <svg
                                        className="w-6 h-6"
                                        fill="none"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth="2"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                    >
                                        <path d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>

                            <div className="p-5 space-y-4">
                                <Button 
                                    onClick={() => handlePageChange("Project")}
                                    className="w-full text-left p-4"
                                >
                                    Projects
                                </Button>

                                <Button 
                                    onClick={() => handlePageChange("Location")}
                                    className="w-full text-left p-4"
                                >
                                    Locations
                                </Button>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </>
    );
}