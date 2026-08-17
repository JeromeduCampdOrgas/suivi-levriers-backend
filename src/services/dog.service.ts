import prisma from "../lib/prisma";

export async function getAllDogs() {
  return prisma.dog.findMany({
    include: {
      owner: true,
      club: true,
      trainers: true,
    },
    orderBy: {
      name: "asc",
    },
  });
}
