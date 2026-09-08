/*
  Warnings:

  - You are about to drop the column `ICAD` on the `Dog` table. All the data in the column will be lost.

*/
-- AlterTable
-- Rename ICAD column to icad without losing existing data
ALTER TABLE "Dog"
RENAME COLUMN "ICAD" TO "icad";
