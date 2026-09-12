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

import {
  uploadDogDocumentController,
  getDogDocumentsController,
  downloadDogDocumentController,
  deleteDogDocumentController,
} from "../controllers/dog-document.controller";

import { authenticateToken } from "../middlewares/auth.middleware";
import { uploadDocument } from "../middlewares/upload.middleware";

import { extractIcadOcrController } from "../controllers/icad-ocr.controller";
const router = Router();

/**
 * =========================================================
 * LÉVRIERS
 * =========================================================
 */
router.post(
  "/ocr/icad",
  authenticateToken,
  uploadDocument.single("file"),
  extractIcadOcrController
);

// Liste des lévriers accessibles par l'utilisateur connecté
router.get("/", authenticateToken, getDogs);

// Détail d'un lévrier
router.get("/:id", authenticateToken, getDogById);

// Création d'un lévrier
router.post("/", authenticateToken, createDogController);

// Modification d'un lévrier
router.patch("/:id", authenticateToken, updateDogController);

// Suppression d'un lévrier
router.delete("/:id", authenticateToken, deleteDogController);

/**
 * =========================================================
 * DOCUMENTS D'UN LÉVRIER
 * =========================================================
 */

// Ajouter un document
// Formats autorisés : JPG, PNG, WEBP, PDF, XLS, XLSX
router.post(
  "/:id/documents",
  authenticateToken,
  uploadDocument.single("file"),
  uploadDogDocumentController
);

// Liste des documents d'un lévrier
router.get("/:id/documents", authenticateToken, getDogDocumentsController);

// Télécharger / consulter un document
router.get(
  "/:id/documents/:documentId",
  authenticateToken,
  downloadDogDocumentController
);

// Supprimer un document
router.delete(
  "/:id/documents/:documentId",
  authenticateToken,
  deleteDogDocumentController
);

/**
 * =========================================================
 * ENTRAÎNEURS
 * =========================================================
 */

// Ajouter un entraîneur à un lévrier
router.post(
  "/:id/trainers/:trainerId",
  authenticateToken,
  addTrainerController
);

// Retirer un entraîneur d'un lévrier
router.delete(
  "/:id/trainers/:trainerId",
  authenticateToken,
  removeTrainerController
);

export default router;
