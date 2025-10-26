'use client'

import Image from "next/image";
import { photos } from "../data/photos";
import Link from "next/link";

export function PhotosPage() {
    return (

        <div className="grid grid-rows-[50px_1fr] h-full">
            <div className="text-2xl col-span-1" >
                Location Photos [might get deleted!]
            </div>
            <div className="overflow-y-auto scrollbar-hide">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 pt-4">
                {photos.map((photo) => (
                    <div key={photo.id} className="relative aspect-square overflow-hidden rounded-lg">
                        <Link key={photo.id} href={`/photos/${photo.id}`} passHref>
                            <Image
                                src={photo.url}
                                alt={photo.name}
                                fill
                                sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                                className="object-cover rounded-5g"
                            />
                        </Link>
                    </div>
                ))}
                </div>
            </div>
        </div>
    );
}