import type { Response } from "express";
import type { AuthenticatedRequest } from "../middlewares/auth.middleware";
import {
  createTraining,
  getTrainingByIdForUser,
  getTrainingsForUser,
} from "../services/training.service";
import type {
  TrainingReaction,
  TrainingType,
  WeatherCondition,
} from "../generated/prisma/client";

function isTrainingType(value: unknown): value is TrainingType {
  return (
    value === "CYNODROME" ||
    value === "PVL" ||
    value === "BIKE" ||
    value === "SPRINT" ||
    value === "WALK"
  );
}

function isWeatherCondition(value: unknown): value is WeatherCondition {
  return (
    value === "SUNNY" ||
    value === "CLOUDY" ||
    value === "RAINY" ||
    value === "NIGHT"
  );
}

function isTrainingReaction(value: unknown): value is TrainingReaction {
  return (
    value === "EXCELLENT" ||
    value === "VERY_GOOD" ||
    value === "GOOD" ||
    value === "AVERAGE" ||
    value === "POOR"
  );
}

/**
 * GET /api/trainings
 */
export async function getTrainings(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({
        message: "Authentification requise.",
      });
    }

    const trainings = await getTrainingsForUser(
      req.user.userId,
      req.user.roles
    );

    return res.json(trainings);
  } catch (error) {
    console.error("Erreur lors de la récupération des entraînements :", error);

    return res.status(500).json({
      message: "Impossible de récupérer les entraînements.",
    });
  }
}

/**
 * GET /api/trainings/:id
 */
export async function getTrainingById(
  req: AuthenticatedRequest,
  res: Response
) {
  try {
    if (!req.user) {
      return res.status(401).json({
        message: "Authentification requise.",
      });
    }

    const training = await getTrainingByIdForUser(
      String(req.params.id),
      req.user.userId,
      req.user.roles
    );

    if (!training) {
      return res.status(404).json({
        message: "Entraînement introuvable.",
      });
    }

    return res.json(training);
  } catch (error) {
    console.error("Erreur lors de la récupération de l'entraînement :", error);

    return res.status(500).json({
      message: "Impossible de récupérer l'entraînement.",
    });
  }
}

/**
 * POST /api/trainings
 */
export async function createTrainingController(
  req: AuthenticatedRequest,
  res: Response
) {
  try {
    if (!req.user) {
      return res.status(401).json({
        message: "Authentification requise.",
      });
    }

    // Seuls ADMIN, OWNER et TRAINER peuvent créer une séance.
    const canCreate =
      req.user.roles.includes("ADMIN") ||
      req.user.roles.includes("OWNER") ||
      req.user.roles.includes("TRAINER");

    if (!canCreate) {
      return res.status(403).json({
        message: "Vous n'avez pas le droit de créer un entraînement.",
      });
    }

    const body = req.body;

    if (!body || typeof body !== "object") {
      return res.status(400).json({
        message: "Données de séance invalides.",
      });
    }

    if (typeof body.date !== "string") {
      return res.status(400).json({
        message: "La date est obligatoire.",
      });
    }

    const date = new Date(body.date);

    if (Number.isNaN(date.getTime())) {
      return res.status(400).json({
        message: "La date est invalide.",
      });
    }

    if (typeof body.location !== "string") {
      return res.status(400).json({
        message: "Le lieu est obligatoire.",
      });
    }

    if (typeof body.terrain !== "string") {
      return res.status(400).json({
        message: "Le terrain est obligatoire.",
      });
    }

    if (!isTrainingType(body.type)) {
      return res.status(400).json({
        message: "Le type d'entraînement est invalide.",
      });
    }

    if (
      typeof body.distanceMeters !== "number" ||
      !Number.isFinite(body.distanceMeters)
    ) {
      return res.status(400).json({
        message: "La distance est invalide.",
      });
    }

    if (!isWeatherCondition(body.weather)) {
      return res.status(400).json({
        message: "La météo est invalide.",
      });
    }

    if (
      body.temperature !== undefined &&
      body.temperature !== null &&
      (typeof body.temperature !== "number" ||
        !Number.isFinite(body.temperature))
    ) {
      return res.status(400).json({
        message: "La température est invalide.",
      });
    }

    if (!Array.isArray(body.results)) {
      return res.status(400).json({
        message: "Les résultats des lévriers sont obligatoires.",
      });
    }

    const results = body.results.map((result: unknown) => {
      if (!result || typeof result !== "object") {
        throw new Error("Résultat de lévrier invalide.");
      }

      const item = result as Record<string, unknown>;

      if (typeof item.dogId !== "string") {
        throw new Error("Identifiant de lévrier invalide.");
      }

      if (
        typeof item.durationSeconds !== "number" ||
        !Number.isFinite(item.durationSeconds)
      ) {
        throw new Error("Chrono / durée invalide.");
      }

      if (
        typeof item.motivation !== "number" ||
        !Number.isInteger(item.motivation)
      ) {
        throw new Error("Motivation invalide.");
      }

      let reaction: TrainingReaction | null = null;

      if (item.reaction !== undefined && item.reaction !== null) {
        if (!isTrainingReaction(item.reaction)) {
          throw new Error("Réaction invalide.");
        }

        reaction = item.reaction;
      }

      return {
        dogId: item.dogId,
        durationSeconds: item.durationSeconds,
        motivation: item.motivation,
        reaction,
        observations:
          typeof item.observations === "string" ? item.observations : null,
      };
    });

    const training = await createTraining(
      {
        date,
        location: body.location,
        terrain: body.terrain,
        type: body.type,
        distanceMeters: body.distanceMeters,
        weather: body.weather,
        temperature: body.temperature ?? null,
        notes: typeof body.notes === "string" ? body.notes : null,
        results,
      },
      req.user.userId,
      req.user.roles
    );

    return res.status(201).json(training);
  } catch (error) {
    if (error instanceof Error) {
      if (
        error.message.includes("obligatoire") ||
        error.message.includes("invalide") ||
        error.message.includes("doit") ||
        error.message.includes("ne peut") ||
        error.message.includes("n'avez pas accès")
      ) {
        return res.status(400).json({
          message: error.message,
        });
      }
    }

    console.error("Erreur lors de la création de l'entraînement :", error);

    return res.status(500).json({
      message: "Impossible de créer l'entraînement.",
    });
  }
}
