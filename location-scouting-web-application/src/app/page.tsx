'use client'

import Image from "next/image";
import { SideBar } from "./components/sidebar";
import { ProjectsPage } from "./pages/projectsPage";
import { ScenesPage } from "./pages/scenesPage";
import { LocationsPage } from "./pages/locationsPage";
import { PhotosPage } from "./pages/photosPage";
// import { ProjectViewPage } from "./pages/projectViewPage";

import { useState } from "react";

export default function Home() {


  const [selectedPage, setSelectedPage] = useState("Project"); 

  return (
    <div className="h-screen flex flex-col lg:grid lg:grid-cols-[270px_1fr] lg:grid-rows-[100px_1fr] lg:gap-10">
      
      <div className="hidden lg:block row-span-2 bg-[var(--sidebar)]">
        <SideBar selectedPage={selectedPage} setSelectedPage={setSelectedPage} />
      </div>
      
      <div className="lg:hidden flex items-center justify-between p-4 bg-[var(--sidebar)] border-b border-[var(--sidebarfont)] border-opacity-20">
        <SideBar selectedPage={selectedPage} setSelectedPage={setSelectedPage} />
        <div className="text-2xl font-mono text-[var(--sidebarfont)]">Location Scouting</div>
      </div>
      
      <div className="hidden lg:block row-span-1 place-items-center">
        <div className="mt-4 text-2xl">Location Scouting</div>
      </div>

      <div className="flex-1 lg:row-span-1 overflow-hidden p-4 lg:p-0">
        {selectedPage === "Project" && <ProjectsPage selectedPage={selectedPage} setSelectedPage={setSelectedPage} />}
        {/* {selectedPage === "ProjectView" && <ProjectViewPage />} */}
        {selectedPage === "Scene" && <ScenesPage />}
        {selectedPage === "Location" && <LocationsPage />}
        {selectedPage === "Photo" && <PhotosPage />}
      </div>
      
    </div>
  );
}

