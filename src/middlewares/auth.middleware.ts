import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import type { UserRole } from "../generated/prisma/client";

export type AuthenticatedRequest = Request & {
  user?: {
    userId: string;
    email: string;
    roles: UserRole[];
  };
};

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error("JWT_SECRET n'est pas définie");
  }

  return secret;
}

export function authenticateToken(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const token = req.cookies?.token;

    if (!token) {
      return res.status(401).json({
        message: "Authentification requise.",
      });
    }

    const decoded = jwt.verify(token, getJwtSecret());

    if (
      typeof decoded !== "object" ||
      decoded === null ||
      typeof decoded.userId !== "string" ||
      typeof decoded.email !== "string" ||
      !Array.isArray(decoded.roles)
    ) {
      return res.status(401).json({
        message: "Token invalide.",
      });
    }

    const roles = decoded.roles.filter(
      (role): role is UserRole =>
        role === "ADMIN" ||
        role === "OWNER" ||
        role === "TRAINER" ||
        role === "GUEST"
    );

    if (roles.length !== decoded.roles.length) {
      return res.status(401).json({
        message: "Token invalide : rôle inconnu.",
      });
    }

    req.user = {
      userId: decoded.userId,
      email: decoded.email,
      roles,
    };

    next();
  } catch (error) {
    if (
      error instanceof jwt.TokenExpiredError ||
      error instanceof jwt.JsonWebTokenError
    ) {
      return res.status(401).json({
        message: "Session invalide ou expirée.",
      });
    }

    console.error("Erreur lors de l'authentification :", error);

    return res.status(500).json({
      message: "Une erreur interne est survenue.",
    });
  }
}
