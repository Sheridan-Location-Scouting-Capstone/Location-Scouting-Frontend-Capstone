import { photos } from "@/app/data/photos";
import PhotoModalClient from "./photoModalClient";

// some examples from docs use Promise while others don't (?)
// I'm not sure if it makes a difference.
export default async function PhotoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const photo = photos.find(p => p.id === parseInt(id));

  if (!photo) {
    return <div>Photo not found</div>;
  }

  return <PhotoModalClient photo={photo} />;
}