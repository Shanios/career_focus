import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client.js';

let prisma;

export function getPrismaClient() {
  if (prisma) return prisma;

  const connectionString = process.env.DATABASE_URL?.trim();
  if (!connectionString) throw new Error('DATABASE_URL is required to initialize the database client.');

  let schema = 'public';
  try {
    schema = new URL(connectionString).searchParams.get('schema') || schema;
  } catch {
    throw new Error('DATABASE_URL must be a valid PostgreSQL connection URL.');
  }

  const adapter = new PrismaPg({ connectionString }, { schema });
  prisma = new PrismaClient({ adapter });
  return prisma;
}

export async function disconnectPrisma() {
  if (prisma) await prisma.$disconnect();
}
