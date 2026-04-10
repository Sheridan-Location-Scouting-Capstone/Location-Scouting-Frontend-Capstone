/*
  Warnings:

  - A unique constraint covering the columns `[sceneId,locationId]` on the table `Candidate` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `storageKey` to the `Photo` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Candidate" DROP CONSTRAINT "Candidate_sceneId_fkey";

-- DropForeignKey
ALTER TABLE "CandidatePhoto" DROP CONSTRAINT "CandidatePhoto_candidateId_fkey";

-- DropForeignKey
ALTER TABLE "CandidatePhoto" DROP CONSTRAINT "CandidatePhoto_photoId_fkey";

-- DropForeignKey
ALTER TABLE "CandidatePhotoGroup" DROP CONSTRAINT "CandidatePhotoGroup_candidateId_fkey";

-- DropForeignKey
ALTER TABLE "Scene" DROP CONSTRAINT "Scene_projectId_fkey";

-- AlterTable
ALTER TABLE "Photo" ADD COLUMN     "storageKey" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Scene" ADD COLUMN     "keywords" TEXT[];

-- CreateIndex
CREATE UNIQUE INDEX "Candidate_sceneId_locationId_key" ON "Candidate"("sceneId", "locationId");

-- AddForeignKey
ALTER TABLE "Scene" ADD CONSTRAINT "Scene_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Candidate" ADD CONSTRAINT "Candidate_sceneId_fkey" FOREIGN KEY ("sceneId") REFERENCES "Scene"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CandidatePhoto" ADD CONSTRAINT "CandidatePhoto_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "Candidate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CandidatePhoto" ADD CONSTRAINT "CandidatePhoto_photoId_fkey" FOREIGN KEY ("photoId") REFERENCES "Photo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CandidatePhotoGroup" ADD CONSTRAINT "CandidatePhotoGroup_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "Candidate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
