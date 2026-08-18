import type { Request, Response } from "express";
import { registerUser, loginUser, getUserById } from "../services/auth.service";
import type { AuthenticatedRequest } from "../middlewares/auth.middleware";

export async function register(req: Request, res: Response) {
  try {
    const {
      firstName,
      lastName,
      email,
      phone,
      password,
      passwordConfirmation,
    } = req.body;

    // Vérification des champs obligatoires
    if (!firstName || !lastName || !email || !password) {
      return res.status(400).json({
        message: "Veuillez renseigner tous les champs obligatoires.",
      });
    }

    // Vérification du mot de passe
    if (typeof password !== "string" || password.length < 6) {
      return res.status(400).json({
        message: "Le mot de passe doit contenir au moins 6 caractères.",
      });
    }

    // Vérification de la confirmation
    if (password !== passwordConfirmation) {
      return res.status(400).json({
        message: "Les mots de passe ne correspondent pas.",
      });
    }

    const user = await registerUser({
      firstName,
      lastName,
      email,
      phone,
      password,
    });

    return res.status(201).json({
      message: "Compte créé avec succès.",
      user,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "EMAIL_ALREADY_EXISTS") {
      return res.status(409).json({
        message: "Cette adresse email est déjà utilisée.",
      });
    }

    console.error("Erreur lors de l'inscription :", error);

    return res.status(500).json({
      message: "Une erreur interne est survenue.",
    });
  }
}

export async function login(req: Request, res: Response) {
  try {
    const { email, password } = req.body;

    // Vérification des champs
    if (!email || !password) {
      return res.status(400).json({
        message:
          "Veuillez renseigner votre adresse email et votre mot de passe.",
      });
    }

    if (typeof email !== "string" || typeof password !== "string") {
      return res.status(400).json({
        message: "Les données fournies sont invalides.",
      });
    }

    const { token, user } = await loginUser({
      email,
      password,
    });

    // Cookie HTTP-only contenant le JWT
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.status(200).json({
      message: "Connexion réussie.",
      user,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "INVALID_CREDENTIALS") {
      return res.status(401).json({
        message: "Adresse email ou mot de passe incorrect.",
      });
    }

    console.error("Erreur lors de la connexion :", error);

    return res.status(500).json({
      message: "Une erreur interne est survenue.",
    });
  }
}

export async function logout(_req: Request, res: Response) {
  res.clearCookie("token", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
  });

  return res.status(200).json({
    message: "Déconnexion réussie.",
  });
}
export async function me(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({
        message: "Authentification requise.",
      });
    }

    const user = await getUserById(req.user.userId);

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
