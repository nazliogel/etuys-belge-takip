import dotenv from "dotenv";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client.js";

dotenv.config();

const port = Number(process.env.PORT ?? 3001);
const databaseUrl = process.env.DATABASE_URL;
const jwtSecret = process.env.JWT_SECRET;
const jwtExpiresIn = process.env.JWT_EXPIRES_IN ?? "7d";

const smtpPort = process.env.SMTP_PORT
  ? Number(process.env.SMTP_PORT)
  : undefined;

if (Number.isNaN(port)) {
  throw new Error("PORT must be a valid number.");
}

if (!databaseUrl) {
  throw new Error(
    "DATABASE_URL is not defined. Add it to the .env file.",
  );
}

if (!jwtSecret) {
  throw new Error(
    "JWT_SECRET is not defined. Add it to the .env file.",
  );
}

if (smtpPort !== undefined && Number.isNaN(smtpPort)) {
  throw new Error("SMTP_PORT must be a valid number.");
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port,
  databaseUrl,
  jwtSecret,
  jwtExpiresIn,

  smtpHost: process.env.SMTP_HOST,
  smtpPort,
  smtpSecure: process.env.SMTP_SECURE === "true",
  smtpUser: process.env.SMTP_USER,
  smtpPassword: process.env.SMTP_PASSWORD,
  smtpFrom: process.env.SMTP_FROM,
};

const adapter = new PrismaPg({
  connectionString: env.databaseUrl,
});

export const prisma = new PrismaClient({
  adapter,
  log:
    env.nodeEnv === "development"
      ? ["warn", "error"]
      : ["error"],
});
