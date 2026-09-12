import type { Response } from "express";
import type { AuthenticatedRequest } from "../middlewares/auth.middleware";
import type { Sex } from "../generated/prisma/client";

import {
  getDogsForUser,
  getDogByIdForUser,
  canCreateDog,
  createDog,
  canUpdateDog,
  updateDog,
  canDeleteDog,
  deleteDog,
  canManageDogTrainers,
  addDogTrainer,
  removeDogTrainer,
} from "../services/dog.service";

import prisma from "../lib/prisma";

/**
 * GET /api/dogs
 *
 * Liste des lévriers accessibles à l'utilisateur.
 */
export async function getDogs(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({
        message: "Utilisateur non authentifié",
      });
    }

    const dogs = await getDogsForUser(req.user.userId, req.user.roles);

    return res.json(dogs);
  } catch (error) {
    console.error("Erreur lors de la récupération des lévriers :", error);

    return res.status(500).json({
      message: "Erreur interne du serveur",
    });
  }
}

/**
 * GET /api/dogs/:id
 *
 * Consulte la fiche d'un lévrier.
 */
export async function getDogById(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({
        message: "Utilisateur non authentifié",
      });
    }

    const { id } = req.params;

    if (typeof id !== "string") {
      return res.status(400).json({
        message: "Identifiant du lévrier invalide",
      });
    }

    const dog = await getDogByIdForUser(id, req.user.userId, req.user.roles);

    if (!dog) {
      return res.status(404).json({
        message: "Lévrier introuvable",
      });
    }

    return res.json(dog);
  } catch (error) {
    console.error("Erreur lors de la récupération du lévrier :", error);

    return res.status(500).json({
      message: "Erreur interne du serveur",
    });
  }
}

/**
 * POST /api/dogs
 *
 * Crée un nouveau lévrier.
 */
export async function createDogController(
  req: AuthenticatedRequest,
  res: Response
) {
  try {
    if (!req.user) {
      return res.status(401).json({
        message: "Utilisateur non authentifié",
      });
    }

    const {
      name,
      breed,
      category,
      coat,
      distinctiveMark,
      sex,
      birthDate,
      weight,
      icad,
      ownerId,
      clubId,
    } = req.body;

    // Validation des champs obligatoires
    if (
      typeof name !== "string" ||
      typeof breed !== "string" ||
      typeof sex !== "string"
    ) {
      return res.status(400).json({
        message: "Nom, race et sexe sont obligatoires.",
      });
    }

    if (sex !== "MALE" && sex !== "FEMALE") {
      return res.status(400).json({
        message: "Sexe invalide.",
      });
    }

    if (typeof ownerId !== "string" || ownerId.trim() === "") {
      return res.status(400).json({
        message: "Le propriétaire est obligatoire.",
      });
    }

    // Vérification des droits
    if (!canCreateDog(req.user.userId, req.user.roles, ownerId)) {
      return res.status(403).json({
        message: "Vous n'avez pas le droit de créer ce lévrier.",
      });
    }

    // Vérification du propriétaire
    const owner = await prisma.user.findUnique({
      where: {
        id: ownerId,
      },
      select: {
        id: true,
      },
    });

    if (!owner) {
      return res.status(404).json({
        message: "Propriétaire introuvable.",
      });
    }

    // Vérification du club si fourni
    if (clubId !== undefined && clubId !== null) {
      if (typeof clubId !== "string") {
        return res.status(400).json({
          message: "Identifiant du club invalide.",
        });
      }

      const club = await prisma.club.findUnique({
        where: {
          id: clubId,
        },
        select: {
          id: true,
        },
      });

      if (!club) {
        return res.status(404).json({
          message: "Club introuvable.",
        });
      }
    }

    // Validation des champs ICAD
    if (
      category !== undefined &&
      category !== null &&
      typeof category !== "string"
    ) {
      return res.status(400).json({
        message: "Catégorie invalide.",
      });
    }

    if (coat !== undefined && coat !== null && typeof coat !== "string") {
      return res.status(400).json({
        message: "Robe invalide.",
      });
    }

    if (
      distinctiveMark !== undefined &&
      distinctiveMark !== null &&
      typeof distinctiveMark !== "string"
    ) {
      return res.status(400).json({
        message: "Signe particulier invalide.",
      });
    }

    let parsedBirthDate: Date | null = null;

    if (birthDate !== undefined && birthDate !== null && birthDate !== "") {
      parsedBirthDate = new Date(birthDate);

      if (Number.isNaN(parsedBirthDate.getTime())) {
        return res.status(400).json({
          message: "Date de naissance invalide.",
        });
      }
    }

    let parsedWeight: number | null = null;

    if (weight !== undefined && weight !== null && weight !== "") {
      parsedWeight = Number(weight);

      if (!Number.isFinite(parsedWeight)) {
        return res.status(400).json({
          message: "Poids invalide.",
        });
      }
    }

    const dog = await createDog({
      name: name.trim(),
      breed: breed.trim(),
      category: typeof category === "string" ? category.trim() || null : null,
      coat: typeof coat === "string" ? coat.trim() || null : null,
      distinctiveMark:
        typeof distinctiveMark === "string"
          ? distinctiveMark.trim() || null
          : null,
      sex: sex as Sex,
      birthDate: parsedBirthDate,
      weight: parsedWeight,
      icad: typeof icad === "string" ? icad.trim() || null : null,
      ownerId,
      clubId: typeof clubId === "string" ? clubId : null,
    });

    return res.status(201).json(dog);
  } catch (error) {
    console.error("Erreur lors de la création du lévrier :", error);

    return res.status(500).json({
      message: "Erreur interne du serveur",
    });
  }
}

/**
 * PATCH /api/dogs/:id
 *
 * Modifie un lévrier.
 */
export async function updateDogController(
  req: AuthenticatedRequest,
  res: Response
) {
  try {
    if (!req.user) {
      return res.status(401).json({
        message: "Utilisateur non authentifié",
      });
    }

    const { id } = req.params;

    if (typeof id !== "string") {
      return res.status(400).json({
        message: "Identifiant du lévrier invalide.",
      });
    }

    // Vérification des droits
    const canUpdate = await canUpdateDog(id, req.user.userId, req.user.roles);

    if (!canUpdate) {
      return res.status(403).json({
        message: "Vous n'avez pas le droit de modifier ce lévrier.",
      });
    }

    const {
      name,
      breed,
      category,
      coat,
      distinctiveMark,
      sex,
      birthDate,
      weight,
      icad,
      ownerId,
      clubId,
    } = req.body;

    if (
      name !== undefined &&
      (typeof name !== "string" || name.trim() === "")
    ) {
      return res.status(400).json({
        message: "Nom invalide.",
      });
    }

    if (
      breed !== undefined &&
      (typeof breed !== "string" || breed.trim() === "")
    ) {
      return res.status(400).json({
        message: "Race invalide.",
      });
    }

    if (
      category !== undefined &&
      category !== null &&
      typeof category !== "string"
    ) {
      return res.status(400).json({
        message: "Catégorie invalide.",
      });
    }

    if (coat !== undefined && coat !== null && typeof coat !== "string") {
      return res.status(400).json({
        message: "Robe invalide.",
      });
    }

    if (
      distinctiveMark !== undefined &&
      distinctiveMark !== null &&
      typeof distinctiveMark !== "string"
    ) {
      return res.status(400).json({
        message: "Signe particulier invalide.",
      });
    }

    if (sex !== undefined && sex !== "MALE" && sex !== "FEMALE") {
      return res.status(400).json({
        message: "Sexe invalide.",
      });
    }

    if (
      ownerId !== undefined &&
      (typeof ownerId !== "string" || ownerId.trim() === "")
    ) {
      return res.status(400).json({
        message: "Propriétaire invalide.",
      });
    }

    // Si le propriétaire est modifié, seul ADMIN peut le faire
    if (ownerId !== undefined && !req.user.roles.includes("ADMIN")) {
      return res.status(403).json({
        message: "Seul un administrateur peut modifier le propriétaire.",
      });
    }

    if (ownerId !== undefined) {
      const owner = await prisma.user.findUnique({
        where: {
          id: ownerId,
        },
        select: {
          id: true,
        },
      });

      if (!owner) {
        return res.status(404).json({
          message: "Propriétaire introuvable.",
        });
      }
    }

    if (clubId !== undefined && clubId !== null) {
      if (typeof clubId !== "string") {
        return res.status(400).json({
          message: "Identifiant du club invalide.",
        });
      }

      const club = await prisma.club.findUnique({
        where: {
          id: clubId,
        },
        select: {
          id: true,
        },
      });

      if (!club) {
        return res.status(404).json({
          message: "Club introuvable.",
        });
      }
    }

    let parsedBirthDate: Date | null | undefined;

    if (birthDate !== undefined) {
      if (birthDate === null || birthDate === "") {
        parsedBirthDate = null;
      } else {
        parsedBirthDate = new Date(birthDate);

        if (Number.isNaN(parsedBirthDate.getTime())) {
          return res.status(400).json({
            message: "Date de naissance invalide.",
          });
        }
      }
    }

    let parsedWeight: number | null | undefined;

    if (weight !== undefined) {
      if (weight === null || weight === "") {
        parsedWeight = null;
      } else {
        parsedWeight = Number(weight);

        if (!Number.isFinite(parsedWeight)) {
          return res.status(400).json({
            message: "Poids invalide.",
          });
        }
      }
    }

    const dog = await updateDog(id, {
      ...(name !== undefined && {
        name: name.trim(),
      }),
      ...(breed !== undefined && {
        breed: breed.trim(),
      }),
      ...(category !== undefined && {
        category: typeof category === "string" ? category.trim() || null : null,
      }),
      ...(coat !== undefined && {
        coat: typeof coat === "string" ? coat.trim() || null : null,
      }),
      ...(distinctiveMark !== undefined && {
        distinctiveMark:
          typeof distinctiveMark === "string"
            ? distinctiveMark.trim() || null
            : null,
      }),
      ...(sex !== undefined && {
        sex: sex as Sex,
      }),
      ...(birthDate !== undefined && {
        birthDate: parsedBirthDate,
      }),
      ...(weight !== undefined && {
        weight: parsedWeight,
      }),
      ...(icad !== undefined && {
        icad: typeof icad === "string" ? icad.trim() || null : null,
      }),
      ...(ownerId !== undefined && {
        ownerId,
      }),
      ...(clubId !== undefined && {
        clubId: typeof clubId === "string" ? clubId : null,
      }),
    });

    return res.json(dog);
  } catch (error) {
    console.error("Erreur lors de la modification du lévrier :", error);

    return res.status(500).json({
      message: "Erreur interne du serveur",
    });
  }
}

/**
 * DELETE /api/dogs/:id
 *
 * Supprime un lévrier.
 */
export async function deleteDogController(
  req: AuthenticatedRequest,
  res: Response
) {
  try {
    if (!req.user) {
      return res.status(401).json({
        message: "Utilisateur non authentifié",
      });
    }

    const { id } = req.params;

    if (typeof id !== "string") {
      return res.status(400).json({
        message: "Identifiant du lévrier invalide.",
      });
    }

    const canDelete = await canDeleteDog(id, req.user.userId, req.user.roles);

    if (!canDelete) {
      return res.status(403).json({
        message: "Vous n'avez pas le droit de supprimer ce lévrier.",
      });
    }

    const dog = await prisma.dog.findUnique({
      where: {
        id,
      },
      select: {
        id: true,
      },
    });

    if (!dog) {
      return res.status(404).json({
        message: "Lévrier introuvable.",
      });
    }

    await deleteDog(id);

    return res.status(204).send();
  } catch (error) {
    console.error("Erreur lors de la suppression du lévrier :", error);

    return res.status(500).json({
      message: "Erreur interne du serveur",
    });
  }
}

/**
 * POST /api/dogs/:id/trainers/:trainerId
 *
 * Ajoute un entraîneur à un lévrier.
 */
export async function addTrainerController(
  req: AuthenticatedRequest,
  res: Response
) {
  try {
    if (!req.user) {
      return res.status(401).json({
        message: "Utilisateur non authentifié",
      });
    }

    const { id, trainerId } = req.params;

    if (typeof id !== "string" || typeof trainerId !== "string") {
      return res.status(400).json({
        message: "Identifiant invalide.",
      });
    }

    const canManage = await canManageDogTrainers(
      id,
      req.user.userId,
      req.user.roles
    );

    if (!canManage) {
      return res.status(403).json({
        message:
          "Vous n'avez pas le droit de gérer les entraîneurs de ce lévrier.",
      });
    }

    const trainer = await prisma.user.findUnique({
      where: {
        id: trainerId,
      },
      select: {
        id: true,
        roles: true,
      },
    });

    if (!trainer) {
      return res.status(404).json({
        message: "Entraîneur introuvable.",
      });
    }

    if (!trainer.roles.includes("TRAINER")) {
      return res.status(400).json({
        message: "L'utilisateur sélectionné n'a pas le rôle TRAINER.",
      });
    }

    const dog = await prisma.dog.findUnique({
      where: {
        id,
      },
      select: {
        id: true,
      },
    });

    if (!dog) {
      return res.status(404).json({
        message: "Lévrier introuvable.",
      });
    }

    const updatedDog = await addDogTrainer(id, trainerId);

    return res.json(updatedDog);
  } catch (error) {
    console.error("Erreur lors de l'ajout de l'entraîneur :", error);

    return res.status(500).json({
      message: "Erreur interne du serveur",
    });
  }
}

/**
 * DELETE /api/dogs/:id/trainers/:trainerId
 *
 * Retire un entraîneur d'un lévrier.
 */
export async function removeTrainerController(
  req: AuthenticatedRequest,
  res: Response
) {
  try {
    if (!req.user) {
      return res.status(401).json({
        message: "Utilisateur non authentifié",
      });
    }

    const { id, trainerId } = req.params;

    if (typeof id !== "string" || typeof trainerId !== "string") {
      return res.status(400).json({
        message: "Identifiant invalide.",
      });
    }

    const canManage = await canManageDogTrainers(
      id,
      req.user.userId,
      req.user.roles
    );

    if (!canManage) {
      return res.status(403).json({
        message:
          "Vous n'avez pas le droit de gérer les entraîneurs de ce lévrier.",
      });
    }

    const dog = await prisma.dog.findUnique({
      where: {
        id,
      },
      select: {
        id: true,
        trainers: {
          where: {
            id: trainerId,
          },
          select: {
            id: true,
          },
        },
      },
    });

    if (!dog) {
      return res.status(404).json({
        message: "Lévrier introuvable.",
      });
    }

    if (dog.trainers.length === 0) {
      return res.status(404).json({
        message: "Cet entraîneur n'est pas attribué à ce lévrier.",
      });
    }

    const updatedDog = await removeDogTrainer(id, trainerId);

    return res.json(updatedDog);
  } catch (error) {
    console.error("Erreur lors du retrait de l'entraîneur :", error);

    return res.status(500).json({
      message: "Erreur interne du serveur",
    });
  }
}
