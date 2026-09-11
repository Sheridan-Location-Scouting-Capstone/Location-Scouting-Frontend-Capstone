/*
  Warnings:

  - A unique constraint covering the columns `[sceneId,locationId]` on the table `Candidate` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Candidate_sceneId_locationId_key" ON "Candidate"("sceneId", "locationId");
