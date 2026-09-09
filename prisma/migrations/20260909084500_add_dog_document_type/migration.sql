-- CreateEnum
CREATE TYPE "DogDocumentType" AS ENUM ('PEDIGREE', 'PASSPORT', 'VACCINATION', 'MEDICAL', 'COMPETITION', 'OTHER');

-- CreateTable
CREATE TABLE "DogDocument" (
    "id" TEXT NOT NULL,
    "dogId" TEXT NOT NULL,
    "type" "DogDocumentType" NOT NULL,
    "originalName" TEXT NOT NULL,
    "storagePath" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DogDocument_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "DogDocument" ADD CONSTRAINT "DogDocument_dogId_fkey" FOREIGN KEY ("dogId") REFERENCES "Dog"("id") ON DELETE CASCADE ON UPDATE CASCADE;
