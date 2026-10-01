'use client'

import StatCard, {StatCardProps} from "@/components/candidates/StatCard";
import {Stack} from "@mui/material";
import AirportShuttleIcon from '@mui/icons-material/AirportShuttle';
import PlaceIcon from '@mui/icons-material/Place';

type CandidateTravelStatsProps = {
    distanceMeters: number,
    durationSeconds: number,
}

export default function CandidateTravelStats({distanceMeters , durationSeconds } : CandidateTravelStatsProps) {

    return(
        <Stack spacing={2}>
            <StatCard
                label='Driving distance from Studio'
                icon={<AirportShuttleIcon />}
                value={`${Math.round(distanceMeters / 1000)} km`}
                caption={`~${Math.round(durationSeconds / 60)} min estimated drive`}
                data-testid='candidate-studio-distance-card'
            ></StatCard>
            <StatCard
                label='Nearest locked location'
                icon={<PlaceIcon color='error'/>}
                value={`46km`}
                caption={`-> 18 Cedar Lane (Scene 5)`}
                data-testid='candidate-nearest-location-card'
            >
            </StatCard>
        </Stack>
    )
}

