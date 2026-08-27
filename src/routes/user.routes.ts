import { Router } from "express";
import {
  getUser,
  updateUserController,
  deleteUserController,
} from "../controllers/user.controller";
import { authenticateToken } from "../middlewares/auth.middleware";
import { requireSelfOrAdmin } from "../middlewares/authorization.middleware";

const router = Router();

router.get("/:id", authenticateToken, requireSelfOrAdmin, getUser);

router.patch(
  "/:id",
  authenticateToken,
  requireSelfOrAdmin,
  updateUserController
);

router.delete(
  "/:id",
  authenticateToken,
  requireSelfOrAdmin,
  deleteUserController
);

export default router;
