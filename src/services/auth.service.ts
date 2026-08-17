import bcrypt from "bcryptjs";
import prisma from "../lib/prisma";

type RegisterData = {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  password: string;
};

export async function registerUser(data: RegisterData) {
  const firstName = data.firstName.trim();
  const lastName = data.lastName.trim();
  const email = data.email.trim().toLowerCase();
  const phone = data.phone?.trim() || null;

  // Vérification de l'existence de l'utilisateur
  const existingUser = await prisma.user.findUnique({
    where: {
      email,
    },
  });

  if (existingUser) {
    throw new Error("EMAIL_ALREADY_EXISTS");
  }

  // Hashage du mot de passe
  const passwordHash = await bcrypt.hash(data.password, 12);

  // Création de l'utilisateur
  const user = await prisma.user.create({
    data: {
      firstName,
      lastName,
      email,
      phone,
      passwordHash,
      roles: ["GUEST"],
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      roles: true,
      createdAt: true,
    },
  });

  return user;
}
