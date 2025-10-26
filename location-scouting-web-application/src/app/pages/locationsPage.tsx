// import { ProjectViewPage } from "./projectViewPage";
import { locations } from "../data/location";
import Link from "next/link";
import { photos } from "../data/photos";

export function LocationsPage() {

    const listItems = [];
    const id = 1;
    const photo = photos.find(p => p.locationId ===  id);

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
              Map API Placeholder
            </div>
        </div>
    );
}