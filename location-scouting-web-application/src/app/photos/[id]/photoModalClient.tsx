'use client'

import Image from "next/image";
import { useRouter } from 'next/navigation';

interface Photo {
  id: number;
  url: string;
  name: string;
}

export default function PhotoModalClient({ photo }: { photo: Photo }) {
  const router = useRouter();

  return (
    <div className="max-w-4xl mx-auto p-6">
      <button 
        className="absolute top-4 left-4 bg-opacity-20 hover:bg-opacity-30 text-red-600 rounded-full w-12 h-12 flex items-center justify-center text-2xl font-bold transition-all z-10"
        onClick={() => router.back()}
      >
        X
      </button>
      <h1 className="text-3xl font-bold mb-4">{photo.name}</h1>
      <Image
        src={photo.url}
        alt={photo.name}
        width={1200}
        height={800}
        className="w-full h-auto rounded-lg"
      />
    </div>
  );
}