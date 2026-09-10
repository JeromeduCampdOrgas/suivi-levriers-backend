import type { Response } from "express";
import type { DogDocumentType } from "../generated/prisma/client";
import type { AuthenticatedRequest } from "../middlewares/auth.middleware";

import prisma from "../lib/prisma";

import {
  createDogDocument,
  getDogDocuments,
  getDogDocumentById,
  deleteDogDocument,
} from "../services/dog-document.service";

import { canUpdateDog } from "../services/dog.service";

import fs from "fs/promises";
import path from "path";

/**
 * Types de documents autorisés.
 */
const allowedDocumentTypes: DogDocumentType[] = [
  "ICAD",
  "PEDIGREE",
  "PASSPORT",
  "VACCINATION",
  "MEDICAL",
  "COMPETITION",
  "OTHER",
];

/**
 * POST /api/dogs/:id/documents
 *
 * Ajoute un document à un lévrier.
 *
 * Accès :
 * ADMIN   → tous les lévriers
 * OWNER   → ses propres lévriers
 * TRAINER → lévriers qui lui sont attribués
 */
export async function uploadDogDocumentController(
  req: AuthenticatedRequest,
  res: Response
) {
  try {
    if (!req.user) {
      return res.status(401).json({
        message: "Utilisateur non authentifié.",
      });
    }

    const { id } = req.params;

    if (typeof id !== "string") {
      return res.status(400).json({
        message: "Identifiant du lévrier invalide.",
      });
    }

    /**
     * Vérification des droits sur le lévrier.
     */
    const canUpdate = await canUpdateDog(id, req.user.userId, req.user.roles);

    if (!canUpdate) {
      return res.status(403).json({
        message: "Vous n'avez pas le droit d'ajouter un document à ce lévrier.",
      });
    }

    /**
     * Vérification de l'existence du fichier.
     */
    if (!req.file) {
      return res.status(400).json({
        message: "Aucun fichier fourni.",
      });
    }

    /**
     * Type du document.
     *
     * Exemple :
     * type=ICAD
     */
    const { type } = req.body;

    if (
      typeof type !== "string" ||
      !allowedDocumentTypes.includes(type as DogDocumentType)
    ) {
      /**
       * Si le fichier a déjà été enregistré par Multer,
       * on le supprime avant de retourner l'erreur.
       */
      await fs.unlink(req.file.path).catch(() => undefined);

      return res.status(400).json({
        message:
          "Type de document invalide. Types acceptés : ICAD, PEDIGREE, PASSPORT, VACCINATION, MEDICAL, COMPETITION, OTHER.",
      });
    }

    /**
     * Vérification supplémentaire du lévrier.
     */
    const dog = await prisma.dog.findUnique({
      where: {
        id,
      },
      select: {
        id: true,
      },
    });

    if (!dog) {
      await fs.unlink(req.file.path).catch(() => undefined);

      return res.status(404).json({
        message: "Lévrier introuvable.",
      });
    }

    /**
     * Chemin relatif enregistré en base.
     *
     * On ne stocke PAS le chemin absolu de la machine.
     */
    const storagePath = path.relative(process.cwd(), req.file.path);

    /**
     * Enregistrement du document en base.
     */
    const document = await createDogDocument({
      dogId: id,
      type: type as DogDocumentType,
      originalName: req.file.originalname,
      storagePath,
      mimeType: req.file.mimetype,
      size: req.file.size,
    });

    return res.status(201).json(document);
  } catch (error) {
    console.error("Erreur lors de l'ajout du document :", error);

    /**
     * Si une erreur survient après l'upload physique,
     * on évite de laisser un fichier orphelin.
     */
    if (req.file?.path) {
      await fs.unlink(req.file.path).catch(() => undefined);
    }

    return res.status(500).json({
      message: "Erreur interne du serveur.",
    });
  }
}

/**
 * GET /api/dogs/:id/documents
 *
 * Retourne les documents d'un lévrier.
 *
 * Le contenu des fichiers n'est jamais exposé ici.
 */
export async function getDogDocumentsController(
  req: AuthenticatedRequest,
  res: Response
) {
  try {
    if (!req.user) {
      return res.status(401).json({
        message: "Utilisateur non authentifié.",
      });
    }

    const { id } = req.params;

    if (typeof id !== "string") {
      return res.status(400).json({
        message: "Identifiant du lévrier invalide.",
      });
    }

    /**
     * Vérification de l'accès au lévrier.
     */
    const canAccess = await prisma.dog.findFirst({
      where: {
        id,
        OR: [
          ...(req.user.roles.includes("ADMIN") ? [{}] : []),

          ...(req.user.roles.includes("GUEST") ? [{}] : []),

          ...(req.user.roles.includes("OWNER")
            ? [{ ownerId: req.user.userId }]
            : []),

          ...(req.user.roles.includes("TRAINER")
            ? [
                {
                  trainers: {
                    some: {
                      id: req.user.userId,
                    },
                  },
                },
              ]
            : []),
        ],
      },
      select: {
        id: true,
      },
    });

    if (!canAccess) {
      return res.status(403).json({
        message:
          "Vous n'avez pas le droit de consulter les documents de ce lévrier.",
      });
    }

    const documents = await getDogDocuments(id);

    return res.json(documents);
  } catch (error) {
    console.error("Erreur lors de la récupération des documents :", error);

    return res.status(500).json({
      message: "Erreur interne du serveur.",
    });
  }
}

/**
 * GET /api/dogs/:id/documents/:documentId
 *
 * Télécharge/affiche un document après vérification
 * des droits.
 *
 * Le fichier n'est jamais rendu public.
 */
export async function downloadDogDocumentController(
  req: AuthenticatedRequest,
  res: Response
) {
  try {
    if (!req.user) {
      return res.status(401).json({
        message: "Utilisateur non authentifié.",
      });
    }

    const { id, documentId } = req.params;

    if (typeof id !== "string" || typeof documentId !== "string") {
      return res.status(400).json({
        message: "Identifiant invalide.",
      });
    }

    /**
     * Vérification de l'accès au lévrier.
     */
    const canAccess = await prisma.dog.findFirst({
      where: {
        id,
        OR: [
          ...(req.user.roles.includes("ADMIN") ? [{}] : []),

          ...(req.user.roles.includes("GUEST") ? [{}] : []),

          ...(req.user.roles.includes("OWNER")
            ? [{ ownerId: req.user.userId }]
            : []),

          ...(req.user.roles.includes("TRAINER")
            ? [
                {
                  trainers: {
                    some: {
                      id: req.user.userId,
                    },
                  },
                },
              ]
            : []),
        ],
      },
      select: {
        id: true,
      },
    });

    if (!canAccess) {
      return res.status(403).json({
        message: "Vous n'avez pas le droit d'accéder à ce document.",
      });
    }

    const document = await getDogDocumentById(id, documentId);

    if (!document) {
      return res.status(404).json({
        message: "Document introuvable.",
      });
    }

    /**
     * Reconstruction du chemin absolu à partir du chemin
     * relatif stocké en base.
     */
    const filePath = path.resolve(process.cwd(), document.storagePath);

    /**
     * Protection contre une éventuelle tentative
     * de traversal de chemin.
     */
    const documentsRoot = path.resolve(process.cwd(), "uploads", "documents");

    if (
      filePath !== documentsRoot &&
      !filePath.startsWith(`${documentsRoot}${path.sep}`)
    ) {
      console.error(
        "Tentative d'accès à un fichier hors du répertoire documents."
      );

      return res.status(403).json({
        message: "Accès au fichier interdit.",
      });
    }

    /**
     * Vérification de l'existence physique du fichier.
     */
    try {
      await fs.access(filePath);
    } catch {
      return res.status(404).json({
        message: "Fichier introuvable sur le serveur.",
      });
    }

    /**
     * Le navigateur peut afficher les PDF/images,
     * tout en gardant l'endpoint protégé.
     */
    res.setHeader("Content-Type", document.mimeType);

    res.setHeader(
      "Content-Disposition",
      `inline; filename="${encodeURIComponent(document.originalName)}"`
    );

    return res.sendFile(filePath);
  } catch (error) {
    console.error("Erreur lors de l'accès au document :", error);

    return res.status(500).json({
      message: "Erreur interne du serveur.",
    });
  }
}

/**
 * DELETE /api/dogs/:id/documents/:documentId
 *
 * Supprime un document.
 *
 * Le fichier physique ET l'enregistrement PostgreSQL
 * sont supprimés.
 */
export async function deleteDogDocumentController(
  req: AuthenticatedRequest,
  res: Response
) {
  try {
    if (!req.user) {
      return res.status(401).json({
        message: "Utilisateur non authentifié.",
      });
    }

    const { id, documentId } = req.params;

    if (typeof id !== "string" || typeof documentId !== "string") {
      return res.status(400).json({
        message: "Identifiant invalide.",
      });
    }

    /**
     * Suppression réservée aux utilisateurs pouvant
     * modifier le lévrier.
     */
    const canUpdate = await canUpdateDog(id, req.user.userId, req.user.roles);

    if (!canUpdate) {
      return res.status(403).json({
        message: "Vous n'avez pas le droit de supprimer ce document.",
      });
    }

    const document = await getDogDocumentById(id, documentId);

    if (!document) {
      return res.status(404).json({
        message: "Document introuvable.",
      });
    }

    const filePath = path.resolve(process.cwd(), document.storagePath);

    /**
     * Suppression du fichier physique.
     */
    await fs.unlink(filePath).catch(() => undefined);

    /**
     * Suppression de l'enregistrement PostgreSQL.
     */
    await deleteDogDocument(id, documentId);

    return res.status(204).send();
  } catch (error) {
    console.error("Erreur lors de la suppression du document :", error);

    return res.status(500).json({
      message: "Erreur interne du serveur.",
    });
  }
}
