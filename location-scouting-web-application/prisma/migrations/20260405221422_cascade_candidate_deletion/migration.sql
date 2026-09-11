-- DropForeignKey
ALTER TABLE "CandidatePhoto" DROP CONSTRAINT "CandidatePhoto_candidateId_fkey";

-- DropForeignKey
ALTER TABLE "CandidatePhotoGroup" DROP CONSTRAINT "CandidatePhotoGroup_candidateId_fkey";

-- AddForeignKey
ALTER TABLE "CandidatePhoto" ADD CONSTRAINT "CandidatePhoto_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "Candidate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CandidatePhotoGroup" ADD CONSTRAINT "CandidatePhotoGroup_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "Candidate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
