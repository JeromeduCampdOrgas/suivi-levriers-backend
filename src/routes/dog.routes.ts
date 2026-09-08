import { Router } from "express";

import {
  getDogs,
  getDogById,
  createDogController,
  updateDogController,
  deleteDogController,
  addTrainerController,
  removeTrainerController,
} from "../controllers/dog.controller";

import { authenticateToken } from "../middlewares/auth.middleware";

const router = Router();

/**
 * Liste des lévriers accessibles à l'utilisateur connecté.
 *
 * ADMIN  → tous
 * OWNER  → ses propres chiens
 * TRAINER → chiens qui lui sont attribués
 * GUEST  → tous
 */
router.get("/", authenticateToken, getDogs);

/**
 * Consulter la fiche d'un lévrier.
 */
router.get("/:id", authenticateToken, getDogById);

/**
 * Créer un lévrier.
 *
 * ADMIN → pour n'importe quel propriétaire
 * OWNER → uniquement pour lui-même
 */
router.post("/", authenticateToken, createDogController);

/**
 * Modifier un lévrier.
 *
 * ADMIN  → tous
 * OWNER  → ses propres chiens
 * TRAINER → chiens qui lui sont attribués
 */
router.patch("/:id", authenticateToken, updateDogController);

/**
 * Supprimer un lévrier.
 *
 * ADMIN → tous
 * OWNER → ses propres chiens
 */
router.delete("/:id", authenticateToken, deleteDogController);

/**
 * Ajouter un entraîneur à un lévrier.
 *
 * ADMIN → tous
 * OWNER → ses propres chiens
 */
router.post(
  "/:id/trainers/:trainerId",
  authenticateToken,
  addTrainerController
);

/**
 * Retirer un entraîneur d'un lévrier.
 *
 * ADMIN → tous
 * OWNER → ses propres chiens
 */
router.delete(
  "/:id/trainers/:trainerId",
  authenticateToken,
  removeTrainerController
);

export default router;
