import prisma from "../lib/prisma";
import type { UserRole, Sex } from "../generated/prisma/client";

/**
 * Champs User pouvant être exposés par l'API.
 * Le passwordHash n'est volontairement jamais sélectionné.
 */
const safeUserSelect = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
  phone: true,
  roles: true,
  createdAt: true,
  updatedAt: true,
} as const;

/**
 * Données nécessaires pour créer un lévrier.
 */
export interface CreateDogData {
  name: string;
  breed: string;
  sex: Sex;
  birthDate?: Date | null;
  weight?: number | null;
  icad?: string | null;
  ownerId: string;
  clubId?: string | null;
}

/**
 * Données modifiables pour un lévrier.
 */
export interface UpdateDogData {
  name?: string;
  breed?: string;
  sex?: Sex;
  birthDate?: Date | null;
  weight?: number | null;
  icad?: string | null;
  ownerId?: string;
  clubId?: string | null;
}

/**
 * Retourne tous les chiens accessibles à l'utilisateur.
 *
 * ADMIN  → tous les chiens
 * OWNER  → uniquement ses propres chiens
 * TRAINER → uniquement les chiens qui lui sont attribués
 * GUEST  → tous les chiens
 */
export async function getDogsForUser(userId: string, roles: UserRole[]) {
  // ADMIN et GUEST peuvent consulter tous les chiens
  if (roles.includes("ADMIN") || roles.includes("GUEST")) {
    return prisma.dog.findMany({
      include: {
        owner: {
          select: safeUserSelect,
        },
        club: true,
        trainers: {
          select: safeUserSelect,
        },
      },
      orderBy: {
        name: "asc",
      },
    });
  }

  // OWNER : uniquement ses propres chiens
  if (roles.includes("OWNER")) {
    return prisma.dog.findMany({
      where: {
        ownerId: userId,
      },
      include: {
        owner: {
          select: safeUserSelect,
        },
        club: true,
        trainers: {
          select: safeUserSelect,
        },
      },
      orderBy: {
        name: "asc",
      },
    });
  }

  // TRAINER : uniquement les chiens qui lui sont attribués
  if (roles.includes("TRAINER")) {
    return prisma.dog.findMany({
      where: {
        trainers: {
          some: {
            id: userId,
          },
        },
      },
      include: {
        owner: {
          select: safeUserSelect,
        },
        club: true,
        trainers: {
          select: safeUserSelect,
        },
      },
      orderBy: {
        name: "asc",
      },
    });
  }

  // Aucun rôle autorisé
  return [];
}

/**
 * Retourne un chien si l'utilisateur a le droit de le consulter.
 *
 * ADMIN  → tous les chiens
 * GUEST  → tous les chiens
 * OWNER  → ses propres chiens
 * TRAINER → chiens qui lui sont attribués
 */
export async function getDogByIdForUser(
  dogId: string,
  userId: string,
  roles: UserRole[]
) {
  // ADMIN et GUEST
  if (roles.includes("ADMIN") || roles.includes("GUEST")) {
    return prisma.dog.findFirst({
      where: {
        id: dogId,
      },
      include: {
        owner: {
          select: safeUserSelect,
        },
        club: true,
        trainers: {
          select: safeUserSelect,
        },
      },
    });
  }

  // OWNER
  if (roles.includes("OWNER")) {
    return prisma.dog.findFirst({
      where: {
        id: dogId,
        ownerId: userId,
      },
      include: {
        owner: {
          select: safeUserSelect,
        },
        club: true,
        trainers: {
          select: safeUserSelect,
        },
      },
    });
  }

  // TRAINER
  if (roles.includes("TRAINER")) {
    return prisma.dog.findFirst({
      where: {
        id: dogId,
        trainers: {
          some: {
            id: userId,
          },
        },
      },
      include: {
        owner: {
          select: safeUserSelect,
        },
        club: true,
        trainers: {
          select: safeUserSelect,
        },
      },
    });
  }

  return null;
}

/**
 * Vérifie si l'utilisateur peut accéder à un chien.
 */
export async function canAccessDog(
  dogId: string,
  userId: string,
  roles: UserRole[]
) {
  const dog = await getDogByIdForUser(dogId, userId, roles);

  return dog !== null;
}

/**
 * Vérifie si l'utilisateur peut créer un chien.
 *
 * ADMIN → peut créer pour n'importe quel propriétaire
 * OWNER → peut créer uniquement pour lui-même
 */
export function canCreateDog(
  userId: string,
  roles: UserRole[],
  ownerId: string
) {
  if (roles.includes("ADMIN")) {
    return true;
  }

  if (roles.includes("OWNER")) {
    return ownerId === userId;
  }

  return false;
}

/**
 * Crée un nouveau lévrier.
 */
export async function createDog(data: CreateDogData) {
  return prisma.dog.create({
    data: {
      name: data.name,
      breed: data.breed,
      sex: data.sex,
      birthDate: data.birthDate ?? null,
      weight: data.weight ?? null,
      icad: data.icad ?? null,
      ownerId: data.ownerId,
      clubId: data.clubId ?? null,
    },
    include: {
      owner: {
        select: safeUserSelect,
      },
      club: true,
      trainers: {
        select: safeUserSelect,
      },
    },
  });
}

/**
 * Vérifie si l'utilisateur peut modifier un chien.
 *
 * ADMIN  → tous
 * OWNER  → ses propres chiens
 * TRAINER → chiens qui lui sont attribués
 */
export async function canUpdateDog(
  dogId: string,
  userId: string,
  roles: UserRole[]
) {
  const dog = await prisma.dog.findUnique({
    where: {
      id: dogId,
    },
    select: {
      ownerId: true,
      trainers: {
        where: {
          id: userId,
        },
        select: {
          id: true,
        },
      },
    },
  });

  if (!dog) {
    return false;
  }

  if (roles.includes("ADMIN")) {
    return true;
  }

  if (roles.includes("OWNER") && dog.ownerId === userId) {
    return true;
  }

  if (roles.includes("TRAINER") && dog.trainers.length > 0) {
    return true;
  }

  return false;
}

/**
 * Modifie un lévrier.
 */
export async function updateDog(dogId: string, data: UpdateDogData) {
  return prisma.dog.update({
    where: {
      id: dogId,
    },
    data: {
      ...(data.name !== undefined && {
        name: data.name,
      }),
      ...(data.breed !== undefined && {
        breed: data.breed,
      }),
      ...(data.sex !== undefined && {
        sex: data.sex,
      }),
      ...(data.birthDate !== undefined && {
        birthDate: data.birthDate,
      }),
      ...(data.weight !== undefined && {
        weight: data.weight,
      }),
      ...(data.icad !== undefined && {
        icad: data.icad,
      }),
      ...(data.ownerId !== undefined && {
        ownerId: data.ownerId,
      }),
      ...(data.clubId !== undefined && {
        clubId: data.clubId,
      }),
    },
    include: {
      owner: {
        select: safeUserSelect,
      },
      club: true,
      trainers: {
        select: safeUserSelect,
      },
    },
  });
}

/**
 * Vérifie si l'utilisateur peut supprimer un chien.
 *
 * ADMIN → tous
 * OWNER → ses propres chiens
 * TRAINER → interdit
 */
export async function canDeleteDog(
  dogId: string,
  userId: string,
  roles: UserRole[]
) {
  if (roles.includes("ADMIN")) {
    return true;
  }

  if (!roles.includes("OWNER")) {
    return false;
  }

  const dog = await prisma.dog.findUnique({
    where: {
      id: dogId,
    },
    select: {
      ownerId: true,
    },
  });

  return dog?.ownerId === userId;
}

/**
 * Supprime un lévrier.
 */
export async function deleteDog(dogId: string) {
  return prisma.dog.delete({
    where: {
      id: dogId,
    },
  });
}

/**
 * Vérifie si l'utilisateur peut gérer les entraîneurs d'un chien.
 *
 * ADMIN → tous
 * OWNER → ses propres chiens
 * TRAINER → interdit
 */
export async function canManageDogTrainers(
  dogId: string,
  userId: string,
  roles: UserRole[]
) {
  if (roles.includes("ADMIN")) {
    return true;
  }

  if (!roles.includes("OWNER")) {
    return false;
  }

  const dog = await prisma.dog.findUnique({
    where: {
      id: dogId,
    },
    select: {
      ownerId: true,
    },
  });

  return dog?.ownerId === userId;
}

/**
 * Ajoute un entraîneur à un chien.
 *
 * Plusieurs entraîneurs peuvent être associés au même chien.
 */
export async function addDogTrainer(dogId: string, trainerId: string) {
  return prisma.dog.update({
    where: {
      id: dogId,
    },
    data: {
      trainers: {
        connect: {
          id: trainerId,
        },
      },
    },
    include: {
      owner: {
        select: safeUserSelect,
      },
      club: true,
      trainers: {
        select: safeUserSelect,
      },
    },
  });
}

/**
 * Retire un entraîneur d'un chien.
 */
export async function removeDogTrainer(dogId: string, trainerId: string) {
  return prisma.dog.update({
    where: {
      id: dogId,
    },
    data: {
      trainers: {
        disconnect: {
          id: trainerId,
        },
      },
    },
    include: {
      owner: {
        select: safeUserSelect,
      },
      club: true,
      trainers: {
        select: safeUserSelect,
      },
    },
  });
}
