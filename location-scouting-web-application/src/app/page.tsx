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
  const [selectedPage, setSelectedPage] = useState("ProjectPage"); 

  return (
    // grid-cols-[240px_1fr] creates 2 columns, 1 static column, followed by a dynamic one.
    // grid-rows-[240px_1fr] creates 2 rows, 1 static column, followed by a dynamic one.
    <div className="grid min-h-screen grid-cols-[240px_1fr] grid-rows-[150px_1fr] gap-4 ">
      
      {/* col: 1 | row: 1,2 */}
      <div className="row-span-2 bg-[var(--sidebar)] ">
        <SideBar selectedPage={selectedPage} setSelectedPage={setSelectedPage} />
      </div>
      
      {/* col:2 | row: 1 */}
      <div className="row-span-1 justify-items-center">
        <h1 className="mt-4 text-2xl font-mono">Location Scouting</h1>
      </div>

      {/* col: 2: | row: 2 */}
      <div className="row-span-1 bg-amber-900">
        {selectedPage === "Project" && <ProjectPage />}
        {selectedPage === "Scene" && <ScenePage />}
        {selectedPage === "Location" && <LocationPage />}
        {selectedPage === "Photo" && <PhotoPage />}
      </div>
      
    </div>
  );
}
