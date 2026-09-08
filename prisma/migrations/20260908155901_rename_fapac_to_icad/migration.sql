/*
  Warnings:

  - You are about to drop the column `fapac` on the `Dog` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Dog" DROP COLUMN "fapac",
ADD COLUMN     "ICAD" TEXT;
