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

  // selectedPage is set default and altered by Sidebar component
  const [selectedPage, setSelectedPage] = useState("Project"); 

  return (
    // grid-cols-[240px_1fr] creates 2 columns, 1 static column, followed by a dynamic one.
    // grid-rows-[240px_1fr] creates 2 rows, 1 static column, followed by a dynamic one.
    <div className="grid h-screen lg:grid-cols-[270px_1fr] lg:grid-rows-[100px_1fr] gap-10 sm:grid-rows-[100px_1fr] sm:grid-cols-[1fr]">
      
      {/* col: 1 | row: 1,2 */}
      <div className="row-span-2 bg-[var(--sidebar)] sm:row-span-0">
        <SideBar selectedPage={selectedPage} setSelectedPage={setSelectedPage} />
      </div>
      
      {/* col:2 | row: 1 */}
      <div className="row-span-1 place-items-center lg:block sm:hidden md:hidden">
        <div className="mt-4 text-2xl ">Location Scouting</div>
      </div>

      {/* col: 2: | row: 2 */}
      <div className="row-span-1 overflow-hidden">
        {selectedPage === "Project" && <ProjectsPage selectedPage={selectedPage} setSelectedPage={setSelectedPage} />}
        {/* {selectedPage === "ProjectView" && <ProjectViewPage />} */}
        {selectedPage === "Scene" && <ScenesPage />}
        {selectedPage === "Location" && <LocationsPage />}
        {selectedPage === "Photo" && <PhotosPage />}
      </div>
      
    </div>
  );
}
