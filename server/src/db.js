import { PrismaClient } from '@prisma/client';

let prisma;

if (process.env.TURSO_DATABASE_URL) {
  // 云端部署：使用 Turso (libSQL)
  const { PrismaLibSql } = await import('@prisma/adapter-libsql');

  const adapter = new PrismaLibSql({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });

  prisma = new PrismaClient({ adapter });
} else {
  // 本地开发：使用本地 SQLite
  prisma = new PrismaClient();
}

export default prisma;
