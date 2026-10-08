import { Router } from "express";

import { authenticateToken } from "../middlewares/auth.middleware";
import {
  getTrainings,
  getTrainingById,
  createTrainingController,
} from "../controllers/training.controller";

const router = Router();

router.get("/", authenticateToken, getTrainings);

router.get("/:id", authenticateToken, getTrainingById);

router.post("/", authenticateToken, createTrainingController);

export default router;
