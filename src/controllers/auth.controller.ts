import type { Request, Response } from "express";
import { registerUser } from "../services/auth.service";

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
