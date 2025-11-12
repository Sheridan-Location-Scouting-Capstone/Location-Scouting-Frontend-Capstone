// import { ProjectViewPage } from "./projectViewPage";
import { locations } from "../data/location";
import Link from "next/link";
import { photos } from "../data/photos";
import { APIProvider, Map, Marker } from "@vis.gl/react-google-maps";
import { env } from "process";

export function LocationsPage() {

    const listItems = [];
    const id = 1;
    const photo = photos.find(p => p.locationId ===  id);
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";
    return (
        <div className="grid grid-rows-[50px_1fr] grid-cols-[1fr_1fr] h-full">
            <div className="text-2xl col-span-1 row-span-1" >
                Locations
            </div>

            <div className="">
              Map
            </div>

            <div className="overflow-y-auto scrollbar-hide">
              <Link href="/">
                <ul className="pl-2 ">
                  {locations.map(location =>
                    <li className="pb-5" key={location.id}>
                      <div>Name: {location.name}</div>
                      <div>City: {location.province}, {location.city}</div>
                      <div>Address: {location.address}</div>
                    </li>
                  )}
                </ul>
              </Link>
            </div>
            <div className="bg-blue-900">
              <APIProvider apiKey={apiKey}>
                <Map zoom={12} center={{ lat: 43.6532, lng: -79.3832 }} style={{ width: "100%", height: "100%" }}>
                    <Marker position={{ lat: 43.6532, lng: -79.3832 }} />
                </Map>
              </APIProvider>
            </div>
        </div>
    );
}