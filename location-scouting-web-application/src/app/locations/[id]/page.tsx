import { LocationDetailView } from "./locationDetailView";
import { locations

 } from "@/app/data/location";
export default async function LocationDetailServer({ params }: { params: Promise<{ id: string }> }) {
    
    const { id } = await params;
    const location = locations.find(l => l.id === parseInt(id));

    if(!id){
        return <div>Location not found</div>
    }

    return (
        <LocationDetailView location={location} />
    )
}