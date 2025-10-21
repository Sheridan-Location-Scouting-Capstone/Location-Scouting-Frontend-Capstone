'use client'

import Image from "next/image";
import { SideBar } from "./components/sidebar";
import { ProjectPage } from "./pages/projectPage";
import { ScenePage } from "./pages/scenePage";
import { LocationPage } from "./pages/locationPage";
import { PhotoPage } from "./pages/photoPage";

import { useState } from "react";

export default function Home() {

  // selectedPage is set and altered by Sidebar component
  const [selectedPage, setSelectedPage] = useState("Project"); 

  return (
    // grid-cols-[240px_1fr] creates 2 columns, 1 static column, followed by a dynamic one.
    // grid-rows-[240px_1fr] creates 2 rows, 1 static column, followed by a dynamic one.
    <div className="grid min-h-screen grid-cols-[240px_1fr] grid-rows-[100px_1fr] gap-10 ">
      
      {/* col: 1 | row: 1,2 */}
      <div className="row-span-2 bg-[var(--sidebar)] ">
        <SideBar selectedPage={selectedPage} setSelectedPage={setSelectedPage} />
      </div>
      
      {/* col:2 | row: 1 */}
      <div className="row-span-1 place-items-center bg-amber-900">
        <div className="mt-4 text-2xl ">Location Scouting</div>
      </div>

      {/* col: 2: | row: 2 */}
      <div className="row-span-1 ">
        {selectedPage === "Project" && <ProjectPage />}
        {selectedPage === "Scene" && <ScenePage />}
        {selectedPage === "Location" && <LocationPage />}
        {selectedPage === "Photo" && <PhotoPage />}
      </div>
      
    </div>
  );
}
