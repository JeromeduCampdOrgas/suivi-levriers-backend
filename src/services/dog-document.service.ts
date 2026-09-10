import prisma from "../lib/prisma";
import type { DogDocumentType } from "../generated/prisma/client";

/**
 * Données nécessaires à l'enregistrement d'un document.
 */
export interface CreateDogDocumentData {
  dogId: string;
  type: DogDocumentType;
  originalName: string;
  storagePath: string;
  mimeType: string;
  size: number;
}

/**
 * Crée un document associé à un lévrier.
 */
export async function createDogDocument(data: CreateDogDocumentData) {
  return prisma.dogDocument.create({
    data: {
      dogId: data.dogId,
      type: data.type,
      originalName: data.originalName,
      storagePath: data.storagePath,
      mimeType: data.mimeType,
      size: data.size,
    },
  });
}

/**
 * Retourne tous les documents d'un lévrier.
 */
export async function getDogDocuments(dogId: string) {
  return prisma.dogDocument.findMany({
    where: {
      dogId,
    },
    orderBy: {
      createdAt: "desc",
    },
  });
}

/**
 * Retourne un document appartenant à un lévrier.
 */
export async function getDogDocumentById(dogId: string, documentId: string) {
  return prisma.dogDocument.findFirst({
    where: {
      id: documentId,
      dogId,
    },
  });
}

/**
 * Supprime un document de la base de données.
 *
 * La suppression physique du fichier sera gérée
 * dans le controller.
 */
export async function deleteDogDocument(dogId: string, documentId: string) {
  return prisma.dogDocument.delete({
    where: {
      id: documentId,
      dogId,
    },
  });
}
