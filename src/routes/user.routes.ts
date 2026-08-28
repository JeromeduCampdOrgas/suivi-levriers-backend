import { Router } from "express";

import {
  getAllUsersController,
  getUser,
  updateUserController,
  updateUserRoleController,
  resetUserPasswordController,
  deleteUserController,
} from "../controllers/user.controller";

import { authenticateToken } from "../middlewares/auth.middleware";
import { requireSelfOrAdmin } from "../middlewares/authorization.middleware";
import { requireRole } from "../middlewares/role.middleware";

const router = Router();

// Tous les utilisateurs
router.get("/", authenticateToken, requireRole("ADMIN"), getAllUsersController);

// Consulter
router.get("/:id", authenticateToken, requireSelfOrAdmin, getUser);

//Modification du rôle
router.patch(
  "/:id/role",
  authenticateToken,
  requireRole("ADMIN"),
  updateUserRoleController
);
// Modifier les informations personnelles
router.patch(
  "/:id",
  authenticateToken,
  requireSelfOrAdmin,
  updateUserController
);
// Réinitialiser le mot de passe
router.post(
  "/:id/reset-password",
  authenticateToken,
  requireRole("ADMIN"),
  resetUserPasswordController
);

// Supprimer
router.delete(
  "/:id",
  authenticateToken,
  requireSelfOrAdmin,
  deleteUserController
);

export default router;
