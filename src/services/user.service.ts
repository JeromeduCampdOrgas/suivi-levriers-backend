import bcrypt from "bcryptjs";
import prisma from "../lib/prisma";
import { UserRole } from "../generated/prisma/client";

type UpdateUserData = {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string | null;
  roles?: UserRole[];
};

export async function getAllUsers() {
  return prisma.user.findMany({
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
    orderBy: {
      lastName: "asc",
    },
  });
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

export async function updateUser(userId: string, data: UpdateUserData) {
  const updateData: UpdateUserData = {};

  if (data.firstName !== undefined) {
    updateData.firstName = data.firstName.trim();
  }

  if (data.lastName !== undefined) {
    updateData.lastName = data.lastName.trim();
  }

  if (data.email !== undefined) {
    updateData.email = data.email.trim().toLowerCase();
  }

  if (data.phone !== undefined) {
    updateData.phone = data.phone?.trim() || null;
  }

  if (data.roles !== undefined) {
    updateData.roles = data.roles;
  }

  if (updateData.email !== undefined) {
    const existingUser = await prisma.user.findUnique({
      where: {
        email: updateData.email,
      },
    });

    if (existingUser && existingUser.id !== userId) {
      throw new Error("EMAIL_ALREADY_EXISTS");
    }
  }

  return prisma.user.update({
    where: {
      id: userId,
    },
    data: updateData,
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

export async function resetUserPassword(userId: string, newPassword: string) {
  const passwordHash = await bcrypt.hash(newPassword, 12);

  return prisma.user.update({
    where: {
      id: userId,
    },
    data: {
      passwordHash,
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
    },
  });
}

export async function deleteUser(userId: string) {
  return prisma.user.delete({
    where: {
      id: userId,
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
    },
  });
}
