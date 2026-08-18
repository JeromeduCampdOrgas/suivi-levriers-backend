import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import prisma from "../lib/prisma";

type RegisterData = {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  password: string;
};

type LoginData = {
  email: string;
  password: string;
};

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error("JWT_SECRET n'est pas définie");
  }

  return secret;
}

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

export async function loginUser(data: LoginData) {
  const email = data.email.trim().toLowerCase();

  // Recherche de l'utilisateur
  const user = await prisma.user.findUnique({
    where: {
      email,
    },
  });

  // Ne pas révéler si l'adresse email existe
  if (!user) {
    throw new Error("INVALID_CREDENTIALS");
  }

  // Vérification du mot de passe
  const passwordIsValid = await bcrypt.compare(
    data.password,
    user.passwordHash
  );

  if (!passwordIsValid) {
    throw new Error("INVALID_CREDENTIALS");
  }

  // Création du JWT
  const token = jwt.sign(
    {
      userId: user.id,
      email: user.email,
      roles: user.roles,
    },
    getJwtSecret(),
    {
      expiresIn: "7d",
    }
  );

  return {
    token,
    user: {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone,
      roles: user.roles,
    },
  };
}

export async function getUserById(userId: string) {
  return prisma.user.findUnique({
    where: {
      id: userId,
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      roles: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}
