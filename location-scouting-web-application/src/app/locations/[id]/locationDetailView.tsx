'use client'

import { useRouter } from "next/navigation";
import Image from "next/image";
import { photos } from "@/app/data/photos";
import Link from "next/link";

export function LocationDetailView(location: {location:LocationSchema}) {
    
    const locationId = location.location.id;
    const router = useRouter();

    const photosL = photos.filter(p => p.locationId === locationId);
    return (
        <div className="scrollbar-hide">
            <button onClick={()=>router.back()}>
                {'<-'} Back
            </button>
            <div className="p-4 scrollbar-hide">
                <div>Location: {location.location.name}</div>
                <div>City: {location.location.city}, {location.location.province}</div>
                <div className="*:rounded-full *:border *:border-sky-100 *:bg-sky-50 *:px-2 *:py-0.5 dark:text-sky-300 dark:*:border-sky-500/15 dark:*:bg-sky-500/10">
                    Location Keywords: 
                </div>
                <div className="*:rounded-full *:border *:border-sky-100 *:bg-sky-50 *:px-2 *:py-0.5 dark:text-sky-300 dark:*:border-sky-500/15 dark:*:bg-sky-500/10">
                    {location.location.locationKeywords.join(", ")}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 pt-4 scrollbar-hide overflow-y-auto">
                    {photosL.map((photo) => (
                        <div key={photo.id} className="relative aspect-square">
                            <Link key={photo.id} href={`/photos/${photo.id}`} passHref>
                                <Image
                                    src={photo.url}
                                    alt={photo.name}
                                    fill
                                    sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                                    className="object-cover rounded-10g"
                                />
                            </Link>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}