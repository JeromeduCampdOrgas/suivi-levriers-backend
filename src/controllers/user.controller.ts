import type { Response } from "express";
import type { AuthenticatedRequest } from "../middlewares/auth.middleware";
import {
  getUserById,
  getAllUsers,
  updateUser,
  resetUserPassword,
  deleteUser,
} from "../services/user.service";
import { UserRole } from "../generated/prisma/client";

export async function getAllUsersController(
  _req: AuthenticatedRequest,
  res: Response
) {
  try {
    const users = await getAllUsers();

    return res.status(200).json({
      users,
    });
  } catch (error) {
    console.error("Erreur lors de la récupération des utilisateurs :", error);

    return res.status(500).json({
      message: "Une erreur interne est survenue.",
    });
  }
}

function getUserIdFromParams(req: AuthenticatedRequest): string | null {
  const { id } = req.params;

  if (typeof id !== "string") {
    return null;
  }

  return id;
}

export async function getUser(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = getUserIdFromParams(req);

    if (!userId) {
      return res.status(400).json({
        message: "Identifiant utilisateur invalide.",
      });
    }

    const user = await getUserById(userId);

    if (!user) {
      return res.status(404).json({
        message: "Utilisateur introuvable.",
      });
    }

    return res.status(200).json({
      user,
    });
  } catch (error) {
    console.error("Erreur lors de la récupération de l'utilisateur :", error);

    return res.status(500).json({
      message: "Une erreur interne est survenue.",
    });
  }
}

export async function updateUserController(
  req: AuthenticatedRequest,
  res: Response
) {
  try {
    const userId = getUserIdFromParams(req);

    if (!userId) {
      return res.status(400).json({
        message: "Identifiant utilisateur invalide.",
      });
    }

    const { firstName, lastName, email, phone } = req.body;

    const user = await updateUser(userId, {
      firstName,
      lastName,
      email,
      phone,
    });

    return res.status(200).json({
      message: "Utilisateur modifié avec succès.",
      user,
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "EMAIL_ALREADY_EXISTS") {
        return res.status(409).json({
          message: "Cette adresse email est déjà utilisée.",
        });
      }

      if (error.message.includes("Record to update not found")) {
        return res.status(404).json({
          message: "Utilisateur introuvable.",
        });
      }
    }

    console.error("Erreur lors de la modification de l'utilisateur :", error);

    return res.status(500).json({
      message: "Une erreur interne est survenue.",
    });
  }
}

export async function updateUserRoleController(
  req: AuthenticatedRequest,
  res: Response
) {
  try {
    const userId = getUserIdFromParams(req);

    if (!userId) {
      return res.status(400).json({
        message: "Identifiant utilisateur invalide.",
      });
    }

    const { roles } = req.body;

    if (!Array.isArray(roles) || roles.length === 0) {
      return res.status(400).json({
        message: "Le rôle est obligatoire.",
      });
    }

    const validRoles = Object.values(UserRole);

    const invalidRole = roles.some(
      (role: unknown) =>
        typeof role !== "string" || !validRoles.includes(role as UserRole)
    );

    if (invalidRole) {
      return res.status(400).json({
        message: "Rôle utilisateur invalide.",
      });
    }

    const user = await updateUser(userId, {
      roles: roles as UserRole[],
    });

    return res.status(200).json({
      message: "Rôle modifié avec succès.",
      user,
    });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes("Record to update not found")
    ) {
      return res.status(404).json({
        message: "Utilisateur introuvable.",
      });
    }

    console.error("Erreur lors de la modification du rôle :", error);

    return res.status(500).json({
      message: "Une erreur interne est survenue.",
    });
  }
}

export async function resetUserPasswordController(
  req: AuthenticatedRequest,
  res: Response
) {
  try {
    const userId = getUserIdFromParams(req);

    if (!userId) {
      return res.status(400).json({
        message: "Identifiant utilisateur invalide.",
      });
    }

    const { newPassword } = req.body;

    if (typeof newPassword !== "string" || newPassword.length < 8) {
      return res.status(400).json({
        message: "Le nouveau mot de passe doit contenir au moins 8 caractères.",
      });
    }

    const user = await resetUserPassword(userId, newPassword);

    return res.status(200).json({
      message: "Mot de passe réinitialisé avec succès.",
      user,
    });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes("Record to update not found")
    ) {
      return res.status(404).json({
        message: "Utilisateur introuvable.",
      });
    }

    console.error(
      "Erreur lors de la réinitialisation du mot de passe :",
      error
    );

    return res.status(500).json({
      message: "Une erreur interne est survenue.",
    });
  }
}

export async function deleteUserController(
  req: AuthenticatedRequest,
  res: Response
) {
  try {
    const userId = getUserIdFromParams(req);

    if (!userId) {
      return res.status(400).json({
        message: "Identifiant utilisateur invalide.",
      });
    }

    const user = await deleteUser(userId);

    return res.status(200).json({
      message: "Utilisateur supprimé avec succès.",
      user,
    });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes("Record to delete does not exist")
    ) {
      return res.status(404).json({
        message: "Utilisateur introuvable.",
      });
    }

    console.error("Erreur lors de la suppression de l'utilisateur :", error);

    return res.status(500).json({
      message: "Une erreur interne est survenue.",
    });
  }
}
