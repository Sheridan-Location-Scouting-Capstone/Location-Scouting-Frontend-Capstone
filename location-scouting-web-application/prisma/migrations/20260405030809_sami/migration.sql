/*
  Warnings:

  - Added the required column `storageKey` to the `Photo` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Photo" ADD COLUMN     "storageKey" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Scene" ADD COLUMN     "keywords" TEXT[];
