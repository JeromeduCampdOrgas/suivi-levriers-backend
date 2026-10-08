import prisma from "../lib/prisma";
import type {
  TrainingReaction,
  TrainingType,
  UserRole,
  WeatherCondition,
} from "../generated/prisma/client";

export interface TrainingResultData {
  dogId: string;
  durationSeconds: number;
  motivation: number;
  reaction?: TrainingReaction | null;
  observations?: string | null;
}

export interface CreateTrainingData {
  date: Date;
  location: string;
  terrain: string;
  type: TrainingType;
  distanceMeters: number;
  weather: WeatherCondition;
  temperature?: number | null;
  notes?: string | null;
  results: TrainingResultData[];
}

/**
 * Vérifie qu'un utilisateur peut accéder à tous les chiens
 * concernés par une séance.
 *
 * ADMIN / GUEST → tous les chiens
 * OWNER → uniquement ses propres chiens
 * TRAINER → uniquement les chiens qui lui sont attribués
 */
export async function canAccessTrainingDogs(
  dogIds: string[],
  userId: string,
  roles: UserRole[]
): Promise<boolean> {
  if (dogIds.length === 0) {
    return false;
  }

  // ADMIN et GUEST ont accès à tous les chiens.
  if (roles.includes("ADMIN") || roles.includes("GUEST")) {
    return true;
  }

  const uniqueDogIds = [...new Set(dogIds)];

  const accessibleDogs = await prisma.dog.findMany({
    where: {
      id: {
        in: uniqueDogIds,
      },
      OR: [
        ...(roles.includes("OWNER") ? [{ ownerId: userId }] : []),
        ...(roles.includes("TRAINER")
          ? [
              {
                trainers: {
                  some: {
                    id: userId,
                  },
                },
              },
            ]
          : []),
      ],
    },
    select: {
      id: true,
    },
  });

  return accessibleDogs.length === uniqueDogIds.length;
}

/**
 * Valide les données générales d'une séance.
 */
function validateTrainingData(data: CreateTrainingData) {
  if (!data.location.trim()) {
    throw new Error("Le lieu de la séance est obligatoire.");
  }

  if (!data.terrain.trim()) {
    throw new Error("Le terrain est obligatoire.");
  }

  if (!Number.isFinite(data.distanceMeters) || data.distanceMeters <= 0) {
    throw new Error("La distance doit être supérieure à 0.");
  }

  if (data.temperature !== null && data.temperature !== undefined) {
    if (!Number.isFinite(data.temperature)) {
      throw new Error("La température est invalide.");
    }
  }

  if (data.results.length === 0) {
    throw new Error("Une séance doit comporter au moins un lévrier.");
  }

  const dogIds = data.results.map((result) => result.dogId);
  const uniqueDogIds = new Set(dogIds);

  if (uniqueDogIds.size !== dogIds.length) {
    throw new Error(
      "Un même lévrier ne peut apparaître qu'une seule fois dans une séance."
    );
  }

  for (const result of data.results) {
    if (
      !Number.isFinite(result.durationSeconds) ||
      result.durationSeconds < 0
    ) {
      throw new Error("Le chrono / temps doit être positif ou nul.");
    }

    if (
      !Number.isInteger(result.motivation) ||
      result.motivation < 1 ||
      result.motivation > 5
    ) {
      throw new Error("La motivation doit être comprise entre 1 et 5.");
    }
  }
}

/**
 * Crée une séance et tous ses résultats dans une transaction.
 */
export async function createTraining(
  data: CreateTrainingData,
  userId: string,
  roles: UserRole[]
) {
  validateTrainingData(data);

  const dogIds = data.results.map((result) => result.dogId);

  const canAccess = await canAccessTrainingDogs(dogIds, userId, roles);

  if (!canAccess) {
    throw new Error("Vous n'avez pas accès à tous les lévriers sélectionnés.");
  }

  return prisma.$transaction(async (tx) => {
    const training = await tx.training.create({
      data: {
        date: data.date,
        location: data.location.trim(),
        terrain: data.terrain.trim(),
        type: data.type,
        distanceMeters: data.distanceMeters,
        weather: data.weather,
        temperature: data.temperature ?? null,
        notes: data.notes?.trim() || null,
        createdById: userId,
        results: {
          create: data.results.map((result) => ({
            dogId: result.dogId,
            durationSeconds: result.durationSeconds,
            motivation: result.motivation,
            reaction: result.reaction ?? null,
            observations: result.observations?.trim() || null,
          })),
        },
      },
      include: {
        results: {
          include: {
            dog: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            roles: true,
          },
        },
      },
    });

    return training;
  });
}
/**
 * Retourne les séances accessibles à l'utilisateur.
 *
 * ADMIN / GUEST → toutes les séances
 * OWNER → séances contenant au moins un de ses chiens
 * TRAINER → séances contenant au moins un chien qui lui est attribué
 */
export async function getTrainingsForUser(userId: string, roles: UserRole[]) {
  const dogAccessFilter =
    roles.includes("ADMIN") || roles.includes("GUEST")
      ? {}
      : {
          results: {
            every: {
              dog: {
                OR: [
                  ...(roles.includes("OWNER") ? [{ ownerId: userId }] : []),
                  ...(roles.includes("TRAINER")
                    ? [
                        {
                          trainers: {
                            some: {
                              id: userId,
                            },
                          },
                        },
                      ]
                    : []),
                ],
              },
            },
          },
        };

  return prisma.training.findMany({
    where: dogAccessFilter,
    include: {
      results: {
        include: {
          dog: true,
        },
      },
      createdBy: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          roles: true,
        },
      },
    },
    orderBy: {
      date: "desc",
    },
  });
}

/**
 * Retourne une séance si l'utilisateur peut y accéder.
 */
export async function getTrainingByIdForUser(
  trainingId: string,
  userId: string,
  roles: UserRole[]
) {
  const training = await prisma.training.findUnique({
    where: {
      id: trainingId,
    },
    include: {
      results: {
        include: {
          dog: true,
        },
      },
      createdBy: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          roles: true,
        },
      },
    },
  });

  if (!training) {
    return null;
  }

  // ADMIN et GUEST peuvent consulter toutes les séances.
  if (roles.includes("ADMIN") || roles.includes("GUEST")) {
    return training;
  }

  // OWNER / TRAINER doivent avoir accès à tous les chiens
  // présents dans la séance.
  const dogIds = training.results.map((result) => result.dogId);

  const canAccess = await canAccessTrainingDogs(dogIds, userId, roles);

  return canAccess ? training : null;
}
