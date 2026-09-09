"use client";
import { useState } from "react";
import { Button } from "@mui/material";
import AddIcon from '@mui/icons-material/Add'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import { Heatmap, HeatPointType } from "./Heatmap";
import {Box} from "@mui/material";
import Link from "next/link";
import SceneTable from '@/components/SceneTable'

interface ProductionsBodyProps {
    points: HeatPointType[];
    scenes: any;
    projectId: string;
}

/* what is rendered in a body of a webpage - all clientside stuff here (Productions ppage as an example) */
export function ProductionsBody({ points, scenes, projectId }: ProductionsBodyProps) {
  const [showHeatmap, setShowHeatmap] = useState(false);

  return (
    <>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Link href="/productions" style={{ textDecoration: 'none' }}>
                <Button startIcon={<ArrowBackIcon />} variant="outlined" size="small">
                Back
                </Button>
            </Link>
            <Box sx={{ display: 'flex', gap: 1.5 }}>
                <Link href={`/productions/${projectId}/edit`} style={{ textDecoration: 'none' }}>
                <Button variant="contained" color="secondary">Manage Production</Button>
                </Link>
                <Link href={`/productions/${projectId}/scenes/new`} style={{ textDecoration: 'none' }}>
                <Button variant="contained" startIcon={<AddIcon />}>Add New Scene</Button>
                </Link>
                {/* <Button variant="contained" onClick={() => setShowHeatmap(!showHeatmap)}>
                {showHeatmap ? "Hide Heat Map" : "Show Heat Map"}
                </Button> */}
            </Box>
        </Box>

        <SceneTable scenes={scenes} projectId={projectId} />
        {/* {showHeatmap && <Heatmap points={points} />} */}
    </>
    );
}

// basically rewrite the body of the page you want, render it client-side, and pass props to it (to customize design)
