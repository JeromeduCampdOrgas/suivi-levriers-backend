import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL n'est pas définie");
}

try {
  const url = new URL(connectionString);

  console.log("=== CONFIGURATION DATABASE ===");
  console.log("Host :", url.hostname);
  console.log("Port :", url.port);
  console.log("Database :", url.pathname);
  console.log("==============================");
} catch {
  console.error("DATABASE_URL invalide");
}

const adapter = new PrismaPg({
  connectionString,
  ssl: {
    rejectUnauthorized: false,
  },
});

const prisma = new PrismaClient({
  adapter,
});

export default prisma;
