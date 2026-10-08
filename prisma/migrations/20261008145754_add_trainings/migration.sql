-- CreateEnum
CREATE TYPE "TrainingType" AS ENUM ('CYNODROME', 'PVL', 'BIKE', 'SPRINT', 'WALK');

-- CreateEnum
CREATE TYPE "WeatherCondition" AS ENUM ('SUNNY', 'CLOUDY', 'RAINY', 'NIGHT');

-- CreateEnum
CREATE TYPE "TrainingReaction" AS ENUM ('EXCELLENT', 'VERY_GOOD', 'GOOD', 'AVERAGE', 'POOR');

-- CreateTable
CREATE TABLE "Training" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "location" TEXT NOT NULL,
    "terrain" TEXT NOT NULL,
    "type" "TrainingType" NOT NULL,
    "distanceMeters" DOUBLE PRECISION NOT NULL,
    "weather" "WeatherCondition" NOT NULL,
    "temperature" DOUBLE PRECISION,
    "notes" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Training_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrainingResult" (
    "id" TEXT NOT NULL,
    "trainingId" TEXT NOT NULL,
    "dogId" TEXT NOT NULL,
    "durationSeconds" DOUBLE PRECISION NOT NULL,
    "motivation" INTEGER NOT NULL,
    "reaction" "TrainingReaction",
    "observations" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrainingResult_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TrainingResult_trainingId_dogId_key" ON "TrainingResult"("trainingId", "dogId");

-- AddForeignKey
ALTER TABLE "Training" ADD CONSTRAINT "Training_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingResult" ADD CONSTRAINT "TrainingResult_trainingId_fkey" FOREIGN KEY ("trainingId") REFERENCES "Training"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingResult" ADD CONSTRAINT "TrainingResult_dogId_fkey" FOREIGN KEY ("dogId") REFERENCES "Dog"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
