import type { NextFunction, Response } from "express";
import type { UserRole } from "../generated/prisma/client";
import type { AuthenticatedRequest } from "./auth.middleware";

export function requireRole(role: UserRole) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user?.roles.includes(role)) {
      return res.status(403).json({
        message: "Accès interdit.",
      });
    }

    next();
  };
}
