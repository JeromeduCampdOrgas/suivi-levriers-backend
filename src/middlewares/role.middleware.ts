import type { Response, NextFunction } from "express";
import type { AuthenticatedRequest } from "./auth.middleware";

export function requireRole(role: string) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user?.roles.includes(role)) {
      return res.status(403).json({
        message: "Accès interdit.",
      });
    }

    next();
  };
}
