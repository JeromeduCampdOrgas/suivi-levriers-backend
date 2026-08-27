import type { NextFunction, Response } from "express";
import type { AuthenticatedRequest } from "./auth.middleware";

export function requireSelfOrAdmin(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  if (!req.user) {
    return res.status(401).json({
      message: "Authentification requise.",
    });
  }

  const { id } = req.params;

  if (typeof id !== "string") {
    return res.status(400).json({
      message: "Identifiant utilisateur invalide.",
    });
  }

  const isAdmin = req.user.roles.includes("ADMIN");
  const isSelf = req.user.userId === id;

  if (!isSelf && !isAdmin) {
    return res.status(403).json({
      message: "Accès interdit.",
    });
  }

  next();
}

export function requireAdmin(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  if (!req.user) {
    return res.status(401).json({
      message: "Authentification requise.",
    });
  }

  if (!req.user.roles.includes("ADMIN")) {
    return res.status(403).json({
      message: "Accès réservé aux administrateurs.",
    });
  }

  next();
}
