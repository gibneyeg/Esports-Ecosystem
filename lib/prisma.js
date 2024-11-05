import { PrismaClient } from "@prisma/client";

const globalForPrisma = global;

// Prevent multiple instances of Prisma Client in development
const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export default prisma;
